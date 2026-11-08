/**
 * Host half of the literature-reader bundle.
 *
 * Owns the on-disk library, PDF text/image extraction, the HTTP endpoints used
 * by the browser half, and the `literature_reader` agent tool.  The client is a
 * single full-page React panel registered under the `reader` main-panel key.
 */
import { createReadStream, existsSync, readFileSync, readdirSync } from 'node:fs'
import { copyFile, cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const EXTRACT_SCRIPT = path.join(HERE, 'scripts', 'extract_pdf.py')
const VENDOR_PYTHON = path.join(HERE, 'vendor', 'python')
const PDFJS_DIR = path.join(HERE, 'vendor', 'pdfjs')
const DEFAULT_LIBRARY_DIR = path.join(HERE, 'library')
const DSH_ROOT = process.env.DSH_HOME || path.join(homedir(), '.dsh')
const SETTINGS_FILE = path.join(DSH_ROOT, 'literature-reader-settings.json')
const DEFAULT_FOLDER = 'inbox'
const MAX_UPLOAD_BYTES = 96 * 1024 * 1024

let configuredLibraryDir = ''
let libraryDir = DEFAULT_LIBRARY_DIR
let storeCache = undefined
let storeQueue = Promise.resolve()
const contentCache = new Map()
const jobs = new Map()
const activeJobs = new Map()

export const name = 'literature-reader'
export const inject = ['tools', 'webServer']

function readSettingsSync() {
  try {
    const parsed = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function settingsView() {
  return {
    libraryDir,
    defaultLibraryDir: DEFAULT_LIBRARY_DIR,
    configOverride: configuredLibraryDir || null,
    settingsFile: SETTINGS_FILE,
  }
}

async function persistSettings(patch) {
  const next = { ...readSettingsSync(), ...patch }
  await mkdir(path.dirname(SETTINGS_FILE), { recursive: true })
  await writeFile(SETTINGS_FILE, JSON.stringify(next, null, 2), 'utf8')
}

async function switchLibraryDir(nextInput) {
  const raw = String(nextInput || '').trim()
  if (!raw) throw new Error('文献库位置不能为空')
  const next = path.resolve(raw)
  if (next === libraryDir) return settingsView()
  if (activeJobs.size > 0) throw new Error('还有生成任务在进行，完成或停止后再迁移文献库')
  await storeQueue.catch(() => undefined)

  const relativeToCurrent = path.relative(libraryDir, next)
  const relativeToNext = path.relative(next, libraryDir)
  const inside = (relative) => relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  if (inside(relativeToCurrent) || inside(relativeToNext)) {
    throw new Error('新位置不能位于当前文献库内部，当前文献库也不能位于新位置内部')
  }

  await mkdir(next, { recursive: true })
  const entries = await readdir(next)
  if (entries.length > 0) throw new Error('请选择一个空文件夹作为新的文献库位置')

  await ensureLibrary()
  const sourceStore = await loadStore(true)
  await cp(libraryDir, next, { recursive: true, force: true })
  if (!existsSync(path.join(next, 'library.json'))) {
    throw new Error('迁移失败：新位置没有生成 library.json')
  }
  const copiedStore = JSON.parse(await readFile(path.join(next, 'library.json'), 'utf8'))
  if (copiedStore.documents?.length !== sourceStore.documents.length
    || copiedStore.folders?.length !== sourceStore.folders.length
    || (copiedStore.guides?.length || 0) !== sourceStore.guides.length) {
    throw new Error('迁移校验失败：新旧文献库的条目数量不一致，原位置已保留')
  }
  const previous = libraryDir
  libraryDir = next
  storeCache = undefined
  contentCache.clear()
  await persistSettings({ libraryDir: next })
  await rm(previous, { recursive: true, force: true }).catch(() => undefined)
  return settingsView()
}

/* ------------------------------------------------------------------ */
/* small utilities                                                     */
/* ------------------------------------------------------------------ */

function newId(prefix) {
  return `${prefix}-${randomUUID()}`
}

function now() {
  return new Date().toISOString()
}

function clampText(value, max) {
  const text = String(value ?? '')
  return text.length > max ? `${text.slice(0, max)}\n\n…（已截断，共 ${text.length} 字符）` : text
}

function safeName(value, fallback = 'document.pdf') {
  const base = path.basename(String(value || fallback)).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim()
  return base || fallback
}

function docDir(id) {
  return path.join(libraryDir, 'docs', id)
}

function contentPath(id) {
  return path.join(docDir(id), 'content.json')
}

function summaryPath(id) {
  return path.join(docDir(id), 'summary.json')
}

function markdownPath(id) {
  return path.join(docDir(id), 'summary.md')
}

function translationPath(id) {
  return path.join(docDir(id), 'translation.md')
}

function annotationsPath(id) {
  return path.join(docDir(id), 'annotations.json')
}

function guidePath(id) {
  return path.join(libraryDir, 'guides', `${id}.md`)
}

async function ensureLibrary() {
  await mkdir(path.join(libraryDir, 'docs'), { recursive: true })
  await mkdir(path.join(libraryDir, 'guides'), { recursive: true })
}

function defaultStore() {
  return {
    version: 1,
    createdAt: now(),
    folders: [{
      id: DEFAULT_FOLDER,
      name: '默认文献库',
      description: '拖入的 PDF 会先放在这里。可以新建文件夹并写下自己的说明。',
      createdAt: now(),
    }],
    documents: [],
    guides: [],
  }
}

async function loadStore(force = false) {
  if (force) storeCache = undefined
  if (storeCache) return storeCache
  await ensureLibrary()
  const target = path.join(libraryDir, 'library.json')
  try {
    const raw = await readFile(target, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.folders) || !Array.isArray(parsed.documents)) throw new Error('bad store')
    parsed.guides = Array.isArray(parsed.guides) ? parsed.guides : []
    const defaultFolder = parsed.folders.find((folder) => folder.id === DEFAULT_FOLDER)
    if (defaultFolder && defaultFolder.name === '默认文献夹') defaultFolder.name = '默认文献库'
    storeCache = parsed
    return storeCache
  } catch (error) {
    if (error?.code === 'ENOENT') {
      storeCache = defaultStore()
      await saveStore(storeCache)
      return storeCache
    }
    // A damaged/partial library.json must never silently become an empty
    // library.  Restore the last good backup when one exists.
    try {
      const backup = JSON.parse(await readFile(`${target}.bak`, 'utf8'))
      if (!backup || !Array.isArray(backup.folders) || !Array.isArray(backup.documents)) throw new Error('bad backup')
      backup.guides = Array.isArray(backup.guides) ? backup.guides : []
      const backupDefault = backup.folders.find((folder) => folder.id === DEFAULT_FOLDER)
      if (backupDefault && backupDefault.name === '默认文献夹') backupDefault.name = '默认文献库'
      await writeFile(target, JSON.stringify(backup, null, 2), 'utf8')
      storeCache = backup
      return storeCache
    } catch {
      throw new Error(`文献库文件损坏，无法读取：${target}`)
    }
  }
}

async function saveStore(store) {
  await ensureLibrary()
  const target = path.join(libraryDir, 'library.json')
  const tmp = `${target}.tmp`
  try {
    await copyFile(target, `${target}.bak`)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  await writeFile(tmp, JSON.stringify(store, null, 2), 'utf8')
  await rename(tmp, target)
}

/** Serialize library mutations so concurrent requests cannot lose updates. */
function mutateStore(change) {
  const run = storeQueue.then(async () => {
    // Disk is authoritative; never write back a stale in-memory snapshot.
    const store = await loadStore(true)
    const result = await change(store)
    await saveStore(store)
    return result
  })
  storeQueue = run.catch(() => undefined)
  return run
}

function findDoc(store, id) {
  const doc = store.documents.find((item) => item.id === id)
  if (!doc) throw new Error('找不到这篇文献')
  return doc
}

async function readJsonFile(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}

async function readContent(id) {
  if (contentCache.has(id)) return contentCache.get(id)
  const content = await readJsonFile(contentPath(id), undefined)
  if (!content) throw new Error('这篇文献还没有完成文本提取')
  if (contentCache.size > 5) contentCache.delete(contentCache.keys().next().value)
  contentCache.set(id, content)
  return content
}

async function readSummary(id) {
  return readJsonFile(summaryPath(id), undefined)
}

function cleanTranslationText(text) {
  return String(text || '')
    .replace(/\[p\d+-b\d+\]\s*/gi, '')
    .replace(/^\s*---\s*第\s*\d+\s*页\s*---\s*$/gm, '')
    .replace(/^\s*第\s*\d+\s*页\s*$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function readTranslation(id) {
  try {
    const raw = await readFile(translationPath(id), 'utf8')
    const cleaned = cleanTranslationText(raw)
    if (cleaned !== raw) await writeFile(translationPath(id), cleaned, 'utf8').catch(() => undefined)
    return cleaned
  } catch {
    return ''
  }
}

function stateView(store) {
  return {
    folders: store.folders,
    documents: store.documents.map((doc) => ({
      id: doc.id,
      folderId: doc.folderId,
      title: doc.title,
      filename: doc.filename,
      size: doc.size,
      pages: doc.pages,
      status: doc.status,
      error: doc.error,
      addedAt: doc.addedAt,
      hasSummary: Boolean(doc.hasSummary),
      hasTranslation: Boolean(doc.hasTranslation),
      summaryTitle: doc.summaryTitle,
      translationChars: doc.translationChars,
      summaryAt: doc.summaryAt,
      translationAt: doc.translationAt,
    })),
    guides: store.guides.map((guide) => ({
      id: guide.id,
      title: guide.title,
      docIds: guide.docIds,
      createdAt: guide.createdAt,
      chars: guide.chars,
    })),
    stats: {
      documents: store.documents.length,
      folders: store.folders.length,
      guides: store.guides.length,
    },
  }
}

/* ------------------------------------------------------------------ */
/* PDF extraction                                                      */
/* ------------------------------------------------------------------ */

let pythonCache

function pythonCandidates() {
  const list = []
  if (process.env.LITERATURE_READER_PYTHON) list.push(process.env.LITERATURE_READER_PYTHON)
  if (process.env.DSH_PYTHON) list.push(process.env.DSH_PYTHON)
  const home = process.env.DSH_HOME
  if (home) {
    const runtimes = path.join(home, 'dsh-runtimes')
    try {
      for (const entry of readdirSync(runtimes)) {
        list.push(path.join(runtimes, entry, 'dependencies', 'python', 'python.exe'))
      }
    } catch { /* ignore */ }
  }
  list.push(path.join(process.env.USERPROFILE || '', '.dsh', 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies', 'python', 'python.exe'))
  list.push('python')
  return list
}

async function findPython() {
  if (pythonCache) return pythonCache
  for (const candidate of pythonCandidates()) {
    if (!candidate) continue
    if (candidate === 'python' || existsSync(candidate)) {
      pythonCache = candidate
      return candidate
    }
  }
  throw new Error('没有找到可用的 Python（需要 PyMuPDF 解压 PDF）')
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      env: options.env || process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      try { child.kill('SIGKILL') } catch { /* ignore */ }
      reject(new Error(`PDF 解析超时（${Math.round((options.timeoutMs || 120000) / 1000)} 秒）`))
    }, options.timeoutMs || 120000)
    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8') })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8') })
    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error((stdout || stderr || `Python 退出码 ${code}`).trim()))
    })
  })
}

async function extractDocument(ctx, docId) {
  const store = await loadStore()
  const doc = findDoc(store, docId)
  const dir = docDir(docId)
  const pdf = path.join(dir, 'original.pdf')
  if (!existsSync(pdf)) throw new Error('原始 PDF 不存在')
  const python = await findPython()
  const env = {
    ...process.env,
    PYTHONPATH: [VENDOR_PYTHON, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
    PYTHONUTF8: '1',
    PYTHONIOENCODING: 'utf-8',
  }
  const { stdout } = await runProcess(python, [
    EXTRACT_SCRIPT,
    '--pdf', pdf,
    '--outdir', dir,
    '--title', doc.title || stripPdfExt(doc.filename),
  ], { env, timeoutMs: 180000 })
  const line = String(stdout || '').trim().split(/\r?\n/).filter(Boolean).pop() || '{}'
  let result
  try { result = JSON.parse(line) } catch { result = {} }
  if (result.ok === false) throw new Error(result.error || 'PDF 解析失败')
  const content = await readJsonFile(contentPath(docId), undefined)
  if (!content) throw new Error('PDF 解析没有生成文本内容')
  contentCache.set(docId, content)
  await mutateStore((current) => {
    const target = findDoc(current, docId)
    target.status = 'ready'
    target.error = undefined
    target.pages = content.pageCount
    target.charCount = content.charCount
    target.imageCount = content.images?.length || 0
    if (content.title) target.title = content.title
    target.extractedAt = now()
  })
  return content
}

function stripPdfExt(name) {
  return String(name || '未命名文献').replace(/\.pdf$/i, '')
}

/* ------------------------------------------------------------------ */
/* prompt construction                                                 */
/* ------------------------------------------------------------------ */

function iterBlocks(content) {
  const out = []
  for (const page of content.pages || []) {
    for (const block of page.blocks || []) {
      out.push({ ...block, page: page.number })
    }
  }
  return out
}

function blockMap(content) {
  const map = new Map()
  for (const block of iterBlocks(content)) map.set(block.id, block)
  return map
}

function blockIdForSource(content, source) {
  const map = blockMap(content)
  if (!source) return undefined
  if (typeof source === 'string') {
    const direct = source.trim().replace(/^\[|\]$/g, '')
    if (map.has(direct)) return map.get(direct)
    // Models often cite two adjacent blocks ("p1-b2, p1-b3") or wrap the id
    // in prose.  Prefer the first real id before falling back to fuzzy text.
    const ids = direct.match(/p\d+-b\d+/g)
    if (ids) {
      for (const id of ids) if (map.has(id)) return map.get(id)
    }
    const needle = normalizeForMatch(source)
    if (needle.length < 6) return undefined
    let best
    let bestScore = 0
    for (const block of map.values()) {
      const hay = normalizeForMatch(block.text)
      if (!hay) continue
      const score = commonScore(needle, hay)
      if (score > bestScore) { bestScore = score; best = block }
    }
    return bestScore >= 0.45 ? best : undefined
  }
  if (typeof source === 'object') {
    const id = source.blockId || source.block || source.id
    if (typeof id === 'string' && map.has(id)) return map.get(id)
    const quote = source.quote || source.text
    if (quote) return blockIdForSource(content, String(quote))
  }
  return undefined
}

function normalizeForMatch(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function commonScore(a, b) {
  if (!a || !b) return 0
  if (b.includes(a)) return 1
  const words = new Set(a.split(' ').filter((word) => word.length > 2))
  if (!words.size) return 0
  let hit = 0
  for (const word of words) if (b.includes(word)) hit += 1
  return hit / words.size
}

function resolveSummarySources(summary, content) {
  if (!summary || typeof summary !== 'object') return summary
  const map = blockMap(content)
  const visit = (value, depth = 0) => {
    if (depth > 12) return
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1)
      return
    }
    if (!value || typeof value !== 'object') return
    if (value.sourceRef && typeof value.sourceRef === 'object' && value.blockId && value.page) return
    if (value.source !== undefined) {
      const block = blockIdForSource(content, value.source)
      if (block) {
        value.sourceRef = { page: block.page, blockId: block.id, quote: block.text.slice(0, 400) }
      } else if (value.source && typeof value.source === 'string' && /^p\d+-b\d+$/.test(value.source)) {
        const guessedPage = Number(value.source.match(/^p(\d+)/)?.[1])
        value.sourceRef = { page: guessedPage, blockId: value.source, quote: '' }
      }
    }
    for (const key of ['evidence', 'quote', 'citation']) {
      if (!value.sourceRef && value.blockId === undefined && typeof value[key] === 'string' && value[key].length > 8) {
        const block = blockIdForSource(content, value[key])
        if (block) value.sourceRef = { page: block.page, blockId: block.id, quote: block.text.slice(0, 400) }
      }
    }
    for (const item of Object.values(value)) visit(item, depth + 1)
  }
  visit(summary)
  return summary
}

function contentToPrompt(content, maxChars = 60000, options = {}) {
  const skipReferences = options.skipReferences !== false
  const lines = []
  let total = 0
  let inReferences = false
  for (const page of content.pages || []) {
    const pageLines = []
    for (const block of page.blocks || []) {
      const text = String(block.text || '').trim()
      if (!text) continue
      if (skipReferences && /^(references|bibliography|参考文献|致谢|acknowledg)/i.test(text) && text.length < 80) {
        inReferences = true
      }
      if (inReferences) continue
      const line = `[${block.id}] ${text}`
      if (total + line.length + 1 > maxChars) {
        pageLines.push('…（正文因长度限制在此截断）')
        lines.push(`--- 第 ${page.number} 页 ---`, ...pageLines)
        return lines.join('\n')
      }
      pageLines.push(line)
      total += line.length + 1
    }
    if (pageLines.length) lines.push(`--- 第 ${page.number} 页 ---`, ...pageLines)
  }
  return lines.join('\n')
}

function contentToPlain(content, maxChars = 20000) {
  const lines = []
  let total = 0
  for (const page of content.pages || []) {
    for (const block of page.blocks || []) {
      const text = String(block.text || '').trim()
      if (!text) continue
      if (total + text.length > maxChars) return lines.join('\n')
      lines.push(text)
      total += text.length
    }
  }
  return lines.join('\n')
}

function chunkContent(content, maxChars = 11000) {
  const chunks = []
  let current = []
  let total = 0
  let startPage = null
  let endPage = null
  const flush = () => {
    if (!current.length) return
    chunks.push({ text: current.join('\n'), startPage: startPage || 1, endPage: endPage || startPage || 1 })
    current = []
    total = 0
    startPage = null
    endPage = null
  }
  for (const page of content.pages || []) {
    const blocks = []
    for (const block of page.blocks || []) {
      const text = String(block.text || '').trim()
      if (!text) continue
      const line = `[${block.id}] ${text}`
      if (total + line.length > maxChars && current.length) {
        flush()
      }
      if (startPage === null) startPage = page.number
      endPage = page.number
      blocks.push(line)
      total += line.length + 1
    }
    if (blocks.length) {
      if (startPage === null) startPage = page.number
      endPage = page.number
      current.push(`--- 第 ${page.number} 页 ---`, ...blocks)
    }
  }
  flush()
  return chunks.length ? chunks : [{ text: '', startPage: 1, endPage: 1 }]
}

/* ------------------------------------------------------------------ */
/* LLM helpers                                                         */
/* ------------------------------------------------------------------ */

function modelSelection(ctx) {
  try {
    const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
    if (selection?.provider && selection?.model) return selection
  } catch { /* fall through */ }
  return { provider: 'deepseek-account', model: 'deepseek-flash' }
}

async function streamText(ctx, input) {
  const llm = ctx.get('llm')
  if (!llm) throw new Error('LLM 服务未启用，无法阅读文献')
  const selection = modelSelection(ctx)
  let text = ''
  let reasoning = ''
  let failure
  let finishKind = ''
  const stream = llm.stream({
    provider: selection.provider,
    model: selection.model,
    reasoningEffort: input.reasoningEffort || 'off',
    messages: [{ role: 'user', content: [{ type: 'text', text: input.prompt }] }],
    system: input.system,
    maxTokens: input.maxTokens || 8192,
    temperature: input.temperature ?? 0.2,
    signal: input.signal,
  })
  for await (const chunk of stream) {
    if (chunk.type === 'text-delta') {
      text += chunk.text
      input.onDelta?.(chunk.text, text)
    } else if (chunk.type === 'reasoning-delta') {
      reasoning += chunk.text
    } else if (chunk.type === 'finish') {
      finishKind = chunk.reason?.kind || ''
      if (chunk.reason?.kind === 'error') failure = chunk.reason.failure
      if (chunk.reason?.kind === 'aborted') throw new Error('生成已取消')
    }
  }
  if (failure) throw new Error(failure.message || failure.code || '模型调用失败')
  if (!text.trim()) {
    throw new Error(`模型没有返回正文（reasoning ${reasoning.length} 字符，finish ${finishKind || 'none'}）`)
  }
  return text.trim()
}

function extractJson(raw) {
  const text = String(raw || '').replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('JSON 解析失败')
  return JSON.parse(text.slice(start, end + 1))
}

function arr(value) {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : []
}

function str(value, fallback = '') {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function normalizeSummary(parsed, doc, raw) {
  const research = parsed.research_summary || parsed.research || {}
  return {
    title_zh: str(parsed.title_zh || parsed.title, doc.title),
    title_en: str(parsed.title_en || parsed.titleEnglish, ''),
    paper_type: str(parsed.paper_type || parsed.paperType, ''),
    one_sentence: str(parsed.one_sentence || parsed.summary, ''),
    keywords: arr(parsed.keywords).map((item) => typeof item === 'string'
      ? { zh: item, en: '' }
      : { zh: str(item.zh || item.chinese || item.term), en: str(item.en || item.english), kind: str(item.kind || item.type) })
      .filter((item) => item.zh || item.en),
    key_points: arr(parsed.key_points || parsed.keyPoints).map((item) => ({
      category: str(item.category || item.type || item.label, '要点'),
      title: str(item.title || item.heading, ''),
      detail: str(item.detail || item.text || item.description),
      importance: str(item.importance, 'normal'),
      source: item.source || item.evidence,
    })).filter((item) => item.detail || item.title),
    conclusions: arr(parsed.conclusions || parsed.takeaways).map((item) => typeof item === 'string'
      ? { text: item }
      : { text: str(item.text || item.conclusion || item.summary), source: item.source || item.evidence }),
    research_summary: {
      question: str(research.question || research.research_question, ''),
      background: str(research.background, ''),
      methods: str(research.methods || research.method, ''),
      findings: arr(research.findings || parsed.findings).map((item) => typeof item === 'string'
        ? { text: item }
        : { text: str(item.text || item.finding || item.summary), source: item.source }),
      contributions: arr(research.contributions || parsed.contributions).map((item) => typeof item === 'string' ? item : str(item.text || item)),
      limitations: arr(research.limitations || parsed.limitations).map((item) => typeof item === 'string' ? item : str(item.text || item)),
    },
    experiment_steps: arr(parsed.experiment_steps || parsed.steps).map((item, index) => ({
      step: Number(item.step) || index + 1,
      title: str(item.title || item.name, `步骤 ${index + 1}`),
      description: str(item.description || item.detail || item.method, ''),
      purpose: str(item.purpose || item.rationale, ''),
      source: item.source || item.evidence,
    })),
    parameters: arr(parsed.parameters || parsed.key_parameters).map((item) => ({
      name: str(item.name || item.parameter),
      value: str(item.value || item.setting),
      meaning: str(item.meaning || item.description || item.note),
      source: item.source || item.evidence,
    })),
    results: arr(parsed.results || parsed.key_results).map((item) => ({
      metric: str(item.metric || item.name),
      value: str(item.value || item.result),
      conclusion: str(item.conclusion || item.meaning || item.description),
      source: item.source || item.evidence,
    })),
    terms: arr(parsed.terms || parsed.key_terms).map((item) => ({
      zh: str(item.zh || item.chinese || item.term),
      en: str(item.en || item.english),
      note: str(item.note || item.explanation, ''),
    })).filter((item) => item.zh || item.en),
    raw: str(parsed.raw, raw && raw.trim().startsWith('{') ? '' : String(raw || '')).slice(0, 12000),
  }
}

function summaryToMarkdown(summary) {
  const lines = [`# ${summary.title_zh || '文献总结'}`]
  if (summary.title_en) lines.push(`*${summary.title_en}*`)
  if (summary.paper_type) lines.push(`类型：${summary.paper_type}`)
  if (summary.one_sentence) lines.push('', `> ${summary.one_sentence}`)
  if (summary.keywords?.length) {
    lines.push('', `关键词：${summary.keywords.map((item) => `${item.zh}${item.en ? ` (${item.en})` : ''}`).join('；')}`)
  }
  lines.push('', '## 一、文献研究总结')
  const research = summary.research_summary || {}
  if (research.question) lines.push('', `**研究问题：** ${research.question}`)
  if (research.background) lines.push('', `**研究背景：** ${research.background}`)
  if (research.methods) lines.push('', `**研究方法：** ${research.methods}`)
  if (research.findings?.length) {
    lines.push('', '**主要发现：**')
    for (const item of research.findings) lines.push(`- ${item.text}${item.sourceRef ? `（原文 p${item.sourceRef.page}）` : ''}`)
  }
  if (research.contributions?.length) {
    lines.push('', '**主要贡献：**')
    for (const item of research.contributions) lines.push(`- ${item}`)
  }
  if (research.limitations?.length) {
    lines.push('', '**局限：**')
    for (const item of research.limitations) lines.push(`- ${item}`)
  }
  if (summary.key_points?.length) {
    lines.push('', '## 二、核心要点')
    for (const point of summary.key_points) {
      lines.push('', `### ${point.category}${point.title ? `｜${point.title}` : ''}`)
      if (point.detail) lines.push(point.detail)
      if (point.sourceRef) lines.push(`- 原文：p${point.sourceRef.page}（${point.sourceRef.blockId}）`)
    }
  }
  if (summary.experiment_steps?.length) {
    lines.push('', '## 三、实验逻辑步骤')
    for (const step of summary.experiment_steps) {
      lines.push('', `### 步骤 ${step.step}：${step.title}`)
      if (step.description) lines.push(step.description)
      if (step.purpose) lines.push(`- 目的：${step.purpose}`)
      if (step.sourceRef) lines.push(`- 原文：p${step.sourceRef.page}（${step.sourceRef.blockId}）`)
    }
  }
  if (summary.parameters?.length) {
    lines.push('', '## 四、重要参数')
    lines.push('', '| 参数 | 设置/数值 | 含义 | 原文 |', '| --- | --- | --- | --- |')
    for (const item of summary.parameters) {
      lines.push(`| ${escapeCell(item.name)} | ${escapeCell(item.value)} | ${escapeCell(item.meaning)} | ${item.sourceRef ? `p${item.sourceRef.page}` : ''} |`)
    }
  }
  if (summary.results?.length) {
    lines.push('', '## 五、重要结果')
    lines.push('', '| 指标 | 结果 | 结论 | 原文 |', '| --- | --- | --- | --- |')
    for (const item of summary.results) {
      lines.push(`| ${escapeCell(item.metric)} | ${escapeCell(item.value)} | ${escapeCell(item.conclusion)} | ${item.sourceRef ? `p${item.sourceRef.page}` : ''} |`)
    }
  }
  if (summary.conclusions?.length) {
    lines.push('', '## 六、重要结论')
    for (const item of summary.conclusions) lines.push(`- ${item.text}${item.sourceRef ? `（原文 p${item.sourceRef.page}）` : ''}`)
  }
  if (summary.terms?.length) {
    lines.push('', '## 七、关键术语')
    for (const term of summary.terms) lines.push(`- **${term.zh}**（${term.en}）${term.note ? `：${term.note}` : ''}`)
  }
  return lines.join('\n')
}

function escapeCell(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

/* ------------------------------------------------------------------ */
/* generation                                                          */
/* ------------------------------------------------------------------ */

const SUMMARY_SYSTEM = [
  '你是 DeepSeek Harness 中负责精读论文的文献 Agent。',
  '你只能依据用户提供的论文原文工作，不得编造实验、数字、结论或引用。',
  '输出必须是合法 JSON（不要 markdown 代码块、不要解释文字）。',
  '所有正文用简体中文；关键学术名词第一次出现时用中文（English original）标注英文原文。',
].join('\n')

async function generateSummary(ctx, docId, options = {}) {
  const store = await loadStore()
  const doc = findDoc(store, docId)
  const content = await readContent(docId)
  if (!content.charCount || content.charCount < 40) {
    throw new Error('这篇 PDF 没有可提取的文字，可能是扫描版；当前 demo 暂不支持 OCR')
  }
  const promptText = contentToPrompt(content, options.maxChars || 66000, { skipReferences: true })
  const commonPrompt = [
    `论文标题（元数据）：${doc.title}`,
    `页数：${content.pageCount}，提取字符数：${content.charCount}`,
    '',
    '===== 论文原文（带 block id） =====',
    promptText,
  ].join('\n')
  const corePrompt = [
    '请通读下面的论文，输出一份“自适应”的结构化中文精读总结。',
    '',
    '要求：',
    '1. 内容必须来自论文，不能编造；数字、方法名、数据集名、指标名要保留。',
    '2. 中文为主，关键知识点/术语用“中文（English）”标注英文原文。',
    '3. 不要机械套用“实验步骤”。先判断论文类型（实验研究 / 临床研究 / 综述 / 方法 / 理论等）：',
    '   - 有明确实验的论文：给出 experiment_steps；',
    '   - 综述、理论、临床观察等：用 key_points 按主题组织，不必硬编实验步骤。',
    '4. key_points 是最重要的“广谱”部分：按论文自身逻辑提炼 4–8 个要点，',
    '   category 可自由使用“核心问题 / 机制 / 方法 / 关键参数 / 主要结论 / 临床意义 / 局限”等，',
    '   不要固定成同一套标签。',
    '5. keywords 提取 6–10 个关键词，覆盖研究对象、方法、指标、核心概念，中英文都给。',
    '6. 每个 findings / key_points / experiment_steps 条目尽量给出 source；',
    '   source 必须直接使用原文中的 block id（如 "p3-b5"），不要编造不存在的 id。',
    '7. 为了适配输出长度：findings 最多 6 条、experiment_steps 最多 8 条、key_points 最多 8 条、',
    '   terms 最多 10 条；每条 description / detail 控制在 100 字以内。',
    '8. 只输出合法 JSON，不要 markdown 代码块、不要解释文字。结构：',
    JSON.stringify({
      title_zh: '论文中文标题',
      title_en: '论文英文标题',
      paper_type: '实验研究 / 临床研究 / 综述 / 方法 / 理论',
      one_sentence: '一句话概括',
      keywords: [{ zh: '中文关键词', en: 'English keyword', kind: 'concept' }],
      research_summary: {
        question: '研究问题',
        background: '研究背景与动机',
        methods: '研究方法概述',
        findings: [{ text: '主要发现', source: 'p1-b2' }],
        contributions: ['贡献'],
        limitations: ['局限'],
      },
      key_points: [{ category: '按论文内容自由命名', title: '要点标题', detail: '要点说明', importance: 'high', source: 'p2-b3' }],
      experiment_steps: [{ step: 1, title: '步骤名', description: '具体做什么、怎么做', purpose: '为什么这样做', source: 'p2-b3' }],
      terms: [{ zh: '中文术语', en: 'English term', note: '简短解释' }],
    }, null, 2),
    '',
    commonPrompt,
  ].join('\n')
  const dataPrompt = [
    '请只从下面的论文原文中提取“重要参数与重要结果/结论”，用于补充结构化总结。',
    '',
    '要求：',
    '1. 只输出合法 JSON，不要 markdown 代码块、不要解释文字。',
    '2. parameters 最多 10 条，results 最多 8 条，conclusions 最多 6 条；每条尽量简短。',
    '3. 综述/理论论文可以没有 parameters；不要硬凑。',
    '4. 每个条目尽量给出 source（原文 block id，如 "p5-b2"）。',
    '5. 只输出 JSON，结构：',
    JSON.stringify({
      parameters: [{ name: '参数/设置', value: '数值', meaning: '作用或含义', source: 'p3-b1' }],
      results: [{ metric: '指标', value: '结果', conclusion: '说明', source: 'p4-b2' }],
      conclusions: [{ text: '重要结论或作者观点', source: 'p6-b3' }],
    }, null, 2),
    '',
    commonPrompt,
  ].join('\n')

  const onProgress = options.onProgress || (() => undefined)
  onProgress('正在通读全文并提炼研究总结…', '')
  const coreRaw = await streamText(ctx, {
    system: SUMMARY_SYSTEM,
    prompt: corePrompt,
    maxTokens: 16384,
    reasoningEffort: 'low',
    temperature: 0.15,
    signal: options.signal,
    onDelta: (_delta, whole) => onProgress('正在整理研究总结与实验步骤…', `已生成 ${whole.length} 字符\n\n${clampText(whole, 2600)}`),
  })

  let core
  let coreFailed = false
  try {
    core = extractJson(coreRaw)
  } catch {
    core = {}
    coreFailed = true
  }

  onProgress('正在提取重要参数与结果…', '')
  let data = {}
  let dataRaw = ''
  try {
    dataRaw = await streamText(ctx, {
      system: SUMMARY_SYSTEM,
      prompt: dataPrompt,
      maxTokens: 8192,
      temperature: 0.1,
      signal: options.signal,
      onDelta: (_delta, whole) => onProgress('正在提取重要参数与结果…', `已生成 ${whole.length} 字符\n\n${clampText(whole, 2200)}`),
    })
    data = extractJson(dataRaw)
  } catch (error) {
    if (options.signal?.aborted) throw error
    data = {}
  }

  const merged = { ...core, ...data }
  if (coreFailed) merged.raw = coreRaw
  let summary
  let markdown
  try {
    summary = normalizeSummary(merged, doc, coreFailed ? coreRaw : '')
    resolveSummarySources(summary, content)
    markdown = summaryToMarkdown(summary)
  } catch (error) {
    throw new Error(`处理模型输出失败：${error instanceof Error ? error.message : String(error)}`)
  }
  await mkdir(docDir(docId), { recursive: true })
  await writeFile(summaryPath(docId), JSON.stringify(summary, null, 2), 'utf8')
  await writeFile(markdownPath(docId), markdown, 'utf8')
  await mutateStore((current) => {
    const target = findDoc(current, docId)
    target.hasSummary = true
    target.summaryTitle = summary.title_zh || target.title
    target.summaryAt = now()
  })
  return { docId, summary, markdown }
}

function translationPrompt(chunk, index, total, doc) {
  return [
    '你是一名严谨的学术论文翻译。请把下面这部分论文原文完整翻译成简体中文。',
    '',
    '要求：',
    '1. 不要总结、不要省略、不要改写论证；数字、公式、变量名、引用编号、数据集名、指标名必须保留。',
    '2. 把不规整的 PDF 排版整理成首尾连续、顺畅的中文；去掉页眉、页脚、页码和重复的期刊信息。',
    '3. 保留原文的章节层级，但用自然的 Markdown 标题和段落呈现；图表在正文中保留“图 1 / 表 1”等编号。',
    '4. 图片和图注会在界面文末统一展示，不要在译文中重复整段图注。',
    '5. 关键术语第一次出现时写“中文（English original）”。',
    '6. 不要输出 [pX-bY] 这样的 block id，也不要输出“--- 第 N 页 ---”页标记。',
    '7. 只输出译文本身，不要解释、不要输出“以下是翻译”之类的话。',
    index > 0 ? '8. 这是论文的后续部分，直接接着翻译，不要重复前文标题或内容。' : '',
    '',
    `论文：${doc.title}（第 ${index + 1}/${total} 部分）`,
    '',
    '===== 原文 =====',
    chunk,
  ].filter(Boolean).join('\n')
}

async function generateTranslation(ctx, docId, options = {}) {
  const store = await loadStore()
  const doc = findDoc(store, docId)
  const content = await readContent(docId)
  if (!content.charCount || content.charCount < 40) {
    throw new Error('这篇 PDF 没有可提取的文字，可能是扫描版；当前 demo 暂不支持 OCR')
  }
  const chunks = chunkContent(content, 12000)
  const onProgress = options.onProgress || (() => undefined)
  let output = ''
  for (let index = 0; index < chunks.length; index += 1) {
    onProgress(
      `正在精确翻译第 ${index + 1}/${chunks.length} 部分…`,
      output ? `${clampText(output, 6000)}\n\n…（前 ${index} 部分已完成）` : '',
    )
    let part
    try {
      part = await streamText(ctx, {
        system: '你是专业的学术论文译者，只输出忠实、完整、通顺的简体中文译文。',
        prompt: translationPrompt(chunks[index].text, index, chunks.length, doc),
        maxTokens: 16384,
        temperature: 0.1,
        signal: options.signal,
        onDelta: (_delta, whole) => {
          onProgress(
            `正在精确翻译第 ${index + 1}/${chunks.length} 部分…`,
            `${clampText(output, 5000)}\n\n${clampText(whole, 3000)}`,
          )
        },
      })
    } catch (error) {
      if (options.signal?.aborted) throw error
      onProgress(`第 ${index + 1} 部分翻译失败，正在重试…`, output)
      part = await streamText(ctx, {
        system: '你是专业的学术论文译者，只输出忠实、完整、通顺的简体中文译文。',
        prompt: translationPrompt(chunks[index].text, index, chunks.length, doc),
        maxTokens: 16384,
        temperature: 0.1,
        signal: options.signal,
      })
    }
    output += `<!-- pages:${chunks[index].startPage}-${chunks[index].endPage} -->\n\n${part.trim()}\n\n`
  }
  const finalText = cleanTranslationText(output)
  await mkdir(docDir(docId), { recursive: true })
  await writeFile(translationPath(docId), finalText, 'utf8')
  await mutateStore((current) => {
    const target = findDoc(current, docId)
    target.hasTranslation = true
    target.translationChars = finalText.length
    target.translationAt = now()
  })
  onProgress('翻译完成', clampText(finalText, 8000))
  return { docId, markdown: finalText }
}

async function generateGuide(ctx, docIds, options = {}) {
  const store = await loadStore()
  const docs = docIds.map((id) => findDoc(store, id))
  if (!docs.length) throw new Error('请先选择至少一篇文献')
  const onProgress = options.onProgress || (() => undefined)
  const sections = []
  let total = 0
  for (let index = 0; index < docs.length; index += 1) {
    const doc = docs[index]
    onProgress(`正在整理第 ${index + 1}/${docs.length} 篇文献的知识点…`, '')
    const summary = await readSummary(doc.id)
    let material = ''
    if (summary) {
      material = JSON.stringify(summary, null, 2)
    } else {
      const content = await readContent(doc.id)
      material = contentToPrompt(content, 16000, { skipReferences: true })
    }
    const block = `\n\n===== 文献 ${index + 1}：${doc.title} =====\n${clampText(material, 24000)}`
    if (total + block.length > 90000) break
    sections.push(block)
    total += block.length
  }
  const prompt = [
    '你是一位学术导师，要为学习者编写一份详细的“多篇文献知识点汇总资料”。',
    '',
    '要求：',
    '1. 以中文为主，所有专业名词第一次出现时用“中文（English）”标注英文，帮助英语学习。',
    '2. 不要逐篇复述摘要；要横向比较、归纳共性、指出差异和联系。',
    '3. 必须包含：研究版图、逐篇核心贡献、共同知识点详解、方法与实验对比、重要术语表、复习自测题。',
    '4. 术语表用 Markdown 表格：中文 | English | 解释 | 出现文献。',
    '5. 内容必须来自给定材料，不要编造数据；不确定的地方明确写“材料未说明”。',
    '6. 输出完整的 Markdown（从一级标题开始），不要输出解释。',
    '',
    `共 ${docs.length} 篇文献。`,
    ...sections,
  ].join('\n')
  onProgress('正在横向比较并撰写学习资料…', '')
  const text = await streamText(ctx, {
    system: '你是严谨的学术导师和知识整理专家，输出结构清晰的简体中文 Markdown。',
    prompt,
    maxTokens: 16384,
    reasoningEffort: 'low',
    temperature: 0.25,
    signal: options.signal,
    onDelta: (_delta, whole) => onProgress('正在横向比较并撰写学习资料…', clampText(whole, 5000)),
  })
  const guide = {
    id: newId('guide'),
    title: text.match(/^#\s+(.+)$/m)?.[1]?.trim() || `文献知识汇总（${docs.length} 篇）`,
    docIds: docs.map((doc) => doc.id),
    createdAt: now(),
    chars: text.length,
  }
  await writeFile(guidePath(guide.id), text, 'utf8')
  await mutateStore((current) => {
    current.guides.unshift(guide)
    current.guides = current.guides.slice(0, 100)
  })
  return { guide, content: text }
}

async function translateSelection(ctx, input) {
  const source = String(input.text || '').replace(/\s+\n/g, '\n').trim()
  if (!source) throw new Error('请先选择要翻译的文字')
  if (source.length > 6000) throw new Error('划选文字太长，请分几次翻译')
  const store = await loadStore()
  const doc = findDoc(store, input.docId)
  const content = await readContent(doc.id)
  const summary = await readSummary(doc.id)
  const page = Number(input.page) || 0
  let context = ''
  if (page) {
    const pageData = (content.pages || []).find((item) => item.number === page)
    const blocks = pageData?.blocks || []
    const needle = source.slice(0, 60)
    const index = blocks.findIndex((block) => String(block.text || '').includes(needle))
    if (index >= 0) {
      context = blocks.slice(Math.max(0, index - 1), index + 2).map((block) => String(block.text || '').trim()).filter(Boolean).join('\n')
    }
  }
  const keywords = (summary?.keywords || []).slice(0, 12)
    .map((item) => item.en ? `${item.zh}（${item.en}）` : item.zh)
    .filter(Boolean)
    .join('；')
  const prompt = [
    '你是学术论文语境下的精确翻译助手。请把用户划选的片段翻译成简体中文。',
    '要求：',
    '1. 结合论文主题、关键词和上下文选择正确的学科术语，不要按普通英语直译。',
    '2. 保持原文学术语气和逻辑关系；不增删、不解释、不扩写、不总结。',
    '3. 基因名、蛋白名、缩写、数字、单位、统计符号（如 p、n、SEM）保留原样；必要时在中文后用括号补英文。',
    '4. 公式、图号、表号、引用编号原样保留。',
    '5. 如果原文已经是中文，只做学术表述润色，不要改成英文。',
    '6. 只输出译文，不要输出“以下是翻译”之类的话，不要输出 Markdown 代码块。',
    '',
    `论文标题：${doc.title || doc.filename || ''}`,
    `论文类型：${summary?.paper_type || '未标注'}`,
    `论文关键词：${keywords || '无'}`,
    page ? `所在页码：第 ${page} 页` : '',
    context ? `原文上下文：\n${context}` : '',
    '',
    '===== 划选文本 =====',
    source,
  ].filter(Boolean).join('\n')
  const translation = await streamText(ctx, {
    system: '你是严谨的学术论文翻译助手，只输出忠实、通顺、符合学科语境的简体中文译文。',
    prompt,
    maxTokens: 3000,
    temperature: 0.15,
    reasoningEffort: 'off',
    signal: input.signal,
  })
  return { translation: translation.trim(), page, source }
}

async function answerQuestion(ctx, input) {
  const store = await loadStore()
  const doc = input.docId ? findDoc(store, input.docId) : undefined
  let context = ''
  if (doc) {
    const summary = await readSummary(doc.id)
    const content = await readContent(doc.id).catch(() => undefined)
    context = [
      `当前文献：${doc.title}`,
      summary ? `【已有的精简总结】\n${JSON.stringify(summary, null, 2)}` : '',
      content ? `【原文（节选，带 block id）】\n${contentToPrompt(content, 26000, { skipReferences: true })}` : '',
    ].filter(Boolean).join('\n\n')
  } else {
    context = [
      '当前文献库：',
      ...store.documents.slice(0, 30).map((item) => `- ${item.title}（${item.pages || '?'} 页，${item.folderId}）`),
    ].join('\n')
  }
  const history = arr(input.history).slice(-8).map((item) => `${item.role === 'user' ? '用户' : '助手'}：${clampText(item.content, 3000)}`).join('\n')
  const prompt = [
    '你是 DeepSeek Harness 的文献阅读助手。请基于给定材料回答用户问题。',
    '回答用简体中文；专业名词可括弧英文；引用原文时尽量给出页码或 [block id]。',
    '如果材料中没有答案，直接说明“文献中没有提到”，不要编造。',
    '',
    context,
    history ? `\n【对话历史】\n${history}` : '',
    `\n【用户问题】\n${clampText(input.question, 4000)}`,
  ].filter(Boolean).join('\n')
  const answer = await streamText(ctx, {
    system: '你是严谨、耐心的文献阅读助手，擅长把论文讲清楚。',
    prompt,
    maxTokens: 8192,
    temperature: 0.2,
    signal: input.signal,
  })
  return { answer }
}

/* ------------------------------------------------------------------ */
/* jobs                                                                */
/* ------------------------------------------------------------------ */

function jobView(job) {
  return {
    id: job.id,
    kind: job.kind,
    status: job.status,
    phase: job.phase,
    partial: clampText(job.partial, 20000),
    error: job.error,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    result: job.status === 'done' ? job.result : undefined,
  }
}

function startJob(ctx, kind, key, runner) {  const existingId = activeJobs.get(key)
  if (existingId) {
    const existing = jobs.get(existingId)
    if (existing && existing.status === 'running') return existing
    activeJobs.delete(key)
  }
  const id = newId('job')
  const controller = new AbortController()
  const job = {
    id,
    kind,
    key,
    status: 'running',
    phase: '准备中…',
    partial: '',
    startedAt: Date.now(),
    controller,
  }
  const report = (phase, partial) => {
    if (job.status !== 'running') return
    job.phase = phase || job.phase
    if (typeof partial === 'string') job.partial = partial
  }
  jobs.set(id, job)
  activeJobs.set(key, id)
  ;(async () => {
    try {
      const result = await runner(report, controller.signal)
      job.status = 'done'
      job.phase = '完成'
      job.result = result
    } catch (error) {
      if (controller.signal.aborted) {
        job.status = 'cancelled'
        job.phase = '已取消'
      } else {
        job.status = 'error'
        job.phase = '失败'
        job.error = error instanceof Error ? error.message : String(error)
      }
    } finally {
      job.finishedAt = Date.now()
      activeJobs.delete(key)
      const timer = setTimeout(() => jobs.delete(id), 30 * 60 * 1000)
      timer.unref?.()
    }
  })()
  return job
}

function startSummaryJob(ctx, id) {
  return startJob(ctx, 'summary', `summary:${id}`, async (report, signal) => {
    const result = await generateSummary(ctx, id, { signal, onProgress: report })
    return { docId: id, mode: 'summary', title: result.summary.title_zh }
  })
}

/* ------------------------------------------------------------------ */
/* HTTP handling                                                       */
/* ------------------------------------------------------------------ */

function sendJson(res, status, payload) {
  if (res.writableEnded) return
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.setHeader('content-length', Buffer.byteLength(body))
  res.end(body)
}

function readBody(req, limit = MAX_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('上传内容过大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function readJsonBody(req, limit) {
  const buffer = await readBody(req, limit)
  if (!buffer.length) return {}
  try {
    return JSON.parse(buffer.toString('utf8'))
  } catch {
    throw new Error('请求 JSON 格式无效')
  }
}

function serveFile(req, res, file, type, extraHeaders = {}) {
  return stat(file).then((info) => {
    const headers = {
      'content-type': type,
      'cache-control': 'private, max-age=300',
      'accept-ranges': 'bytes',
      ...extraHeaders,
    }
    const range = req.headers.range
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (match) {
        const start = match[1] ? Number(match[1]) : 0
        const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1
        if (start <= end && start < info.size) {
          res.writeHead(206, {
            ...headers,
            'content-range': `bytes ${start}-${end}/${info.size}`,
            'content-length': end - start + 1,
          })
          createReadStream(file, { start, end }).pipe(res)
          return
        }
      }
    }
    res.writeHead(200, { ...headers, 'content-length': info.size })
    createReadStream(file).pipe(res)
  })
}

async function handleHttp(ctx, req, res) {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  const pathname = url.pathname
  const method = req.method || 'GET'

  if (method === 'GET' && pathname === '/api/reader/state') {
    const store = await loadStore()
    return sendJson(res, 200, stateView(store))
  }

  if (method === 'GET' && pathname === '/api/reader/settings') {
    return sendJson(res, 200, settingsView())
  }

  if (method === 'POST' && pathname === '/api/reader/settings') {
    const body = await readJsonBody(req, 1024 * 1024)
    if (body.reset) return sendJson(res, 200, await switchLibraryDir(DEFAULT_LIBRARY_DIR))
    if (!body.libraryDir) throw new Error('缺少 libraryDir')
    return sendJson(res, 200, await switchLibraryDir(body.libraryDir))
  }

  if (method === 'GET' && pathname.startsWith('/api/reader/assets/')) {
    const name = decodeURIComponent(pathname.slice('/api/reader/assets/'.length))
    if (name !== 'pdf.mjs' && name !== 'pdf.worker.mjs') return sendJson(res, 404, { error: '资源不存在' })
    return serveFile(req, res, path.join(PDFJS_DIR, name), 'text/javascript; charset=utf-8', {
      'cache-control': 'public, max-age=86400',
    })
  }

  if (method === 'GET' && pathname === '/api/reader/doc') {
    const id = url.searchParams.get('id') || ''
    const store = await loadStore()
    const doc = findDoc(store, id)
    const summary = await readSummary(id)
    return sendJson(res, 200, {
      doc: {
        ...doc,
        hasSummary: Boolean(summary),
        hasTranslation: false,
      },
      summary,
      translation: '',
    })
  }

  if (method === 'GET' && pathname === '/api/reader/content') {
    const id = url.searchParams.get('id') || ''
    const content = await readContent(id)
    return sendJson(res, 200, content)
  }

  if (method === 'GET' && pathname === '/api/reader/guide') {
    const id = url.searchParams.get('id') || ''
    const text = await readFile(guidePath(id), 'utf8')
    return sendJson(res, 200, { id, content: text })
  }

  if (method === 'GET' && pathname === '/api/reader/annotations') {
    const id = url.searchParams.get('id') || ''
    const store = await loadStore()
    findDoc(store, id)
    const data = await readJsonFile(annotationsPath(id), { version: 1, annotations: [] })
    return sendJson(res, 200, { annotations: arr(data?.annotations) })
  }

  if (method === 'POST' && pathname === '/api/reader/annotations') {
    const body = await readJsonBody(req, 8 * 1024 * 1024)
    const id = String(body.docId || '')
    const store = await loadStore()
    findDoc(store, id)
    const annotations = arr(body.annotations).slice(0, 2000).map((item) => ({
      id: String(item.id || newId('note')).slice(0, 120),
      page: Math.max(1, Number(item.page) || 1),
      text: String(item.text || '').slice(0, 4000),
      note: String(item.note || '').slice(0, 8000),
      color: ['yellow', 'green', 'pink', 'blue'].includes(item.color) ? item.color : 'yellow',
      rects: arr(item.rects).slice(0, 120).map((rect) => ({
        x: Math.min(1, Math.max(0, Number(rect.x) || 0)),
        y: Math.min(1, Math.max(0, Number(rect.y) || 0)),
        w: Math.min(1, Math.max(0, Number(rect.w) || 0)),
        h: Math.min(1, Math.max(0, Number(rect.h) || 0)),
      })),
      createdAt: String(item.createdAt || now()).slice(0, 40),
    }))
    await writeFile(annotationsPath(id), JSON.stringify({ version: 1, annotations }, null, 2), 'utf8')
    return sendJson(res, 200, { annotations })
  }

  if (method === 'POST' && pathname === '/api/reader/guide/delete') {
    const body = await readJsonBody(req, 1024 * 1024)
    const id = String(body.id || '')
    await mutateStore((current) => {
      const index = current.guides.findIndex((guide) => guide.id === id)
      if (index < 0) throw new Error('学习资料不存在')
      current.guides.splice(index, 1)
    })
    await rm(guidePath(id), { force: true }).catch(() => undefined)
    return sendJson(res, 200, { ok: true })
  }

  if (method === 'GET' && pathname.startsWith('/api/reader/file/')) {
    const rest = pathname.slice('/api/reader/file/'.length)
    const id = decodeURIComponent(rest.split('/')[0] || '')
    const store = await loadStore()
    findDoc(store, id)
    const pdf = path.join(docDir(id), 'original.pdf')
    if (!existsSync(pdf)) return sendJson(res, 404, { error: 'PDF 不存在' })
    return serveFile(req, res, pdf, 'application/pdf', {
      'content-disposition': `inline; filename="${encodeURIComponent('paper.pdf')}"`,
    })
  }

  if (method === 'GET' && pathname.startsWith('/api/reader/image/')) {
    const rest = pathname.slice('/api/reader/image/'.length)
    const [rawId, ...nameParts] = rest.split('/')
    const id = decodeURIComponent(rawId || '')
    const name = nameParts.map(decodeURIComponent).join('/')
    const store = await loadStore()
    findDoc(store, id)
    if (!/^images\/[A-Za-z0-9._-]+$/.test(name)) return sendJson(res, 400, { error: '图片路径无效' })
    const file = path.join(docDir(id), name)
    if (!existsSync(file)) return sendJson(res, 404, { error: '图片不存在' })
    const ext = path.extname(file).toLowerCase()
    const type = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream'
    return serveFile(req, res, file, type)
  }

  if (method === 'GET' && pathname === '/api/reader/job') {
    const id = url.searchParams.get('id') || ''
    const job = jobs.get(id)
    if (!job) return sendJson(res, 404, { error: '任务不存在或已过期' })
    return sendJson(res, 200, jobView(job))
  }

  if (method === 'POST' && pathname === '/api/reader/upload') {
    const body = await readJsonBody(req, 130 * 1024 * 1024)
    const name = safeName(body.name || 'paper.pdf')
    if (!/\.pdf$/i.test(name)) throw new Error('只支持 PDF 文件')
    const data = Buffer.from(String(body.data || ''), 'base64')
    if (!data.length) throw new Error('文件内容为空')
    if (data.length > 80 * 1024 * 1024) throw new Error('PDF 不能超过 80 MB')
    const store = await loadStore()
    const folderId = body.folderId && store.folders.some((folder) => folder.id === body.folderId)
      ? body.folderId
      : DEFAULT_FOLDER
    const id = newId('doc')
    const dir = docDir(id)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'original.pdf'), data)
    const doc = {
      id,
      folderId,
      title: stripPdfExt(name),
      filename: name,
      size: data.length,
      pages: 0,
      status: 'extracting',
      addedAt: now(),
    }
    await mutateStore((current) => {
      current.documents.unshift(doc)
    })
    try {
      await extractDocument(ctx, id)
    } catch (error) {
      await mutateStore((current) => {
        const target = findDoc(current, id)
        target.status = 'error'
        target.error = error instanceof Error ? error.message : String(error)
      })
    }
    const current = await loadStore()
    const view = stateView(current)
    const uploaded = current.documents.find((item) => item.id === id)
    if (uploaded?.status === 'ready' && !uploaded.hasSummary) {
      view.job = jobView(startSummaryJob(ctx, id))
      view.autoAnalyze = true
    }
    return sendJson(res, 200, view)
  }

  if (method === 'POST' && pathname === '/api/reader/folder') {
    const body = await readJsonBody(req, 1024 * 1024)
    const action = body.action || 'create'
    if (action === 'create') {
      const name = String(body.name || '').trim()
      if (!name) throw new Error('文件夹名称不能为空')
      const folder = {
        id: newId('folder'),
        name: name.slice(0, 80),
        description: String(body.description || '').slice(0, 2000),
        createdAt: now(),
      }
      await mutateStore((current) => { current.folders.push(folder) })
      return sendJson(res, 200, { folder })
    }
    if (action === 'update') {
      const id = String(body.id || '')
      if (id === DEFAULT_FOLDER) {
        // The default folder may still be renamed/described.
      }
      await mutateStore((current) => {
        const folder = current.folders.find((item) => item.id === id)
        if (!folder) throw new Error('文件夹不存在')
        if (body.name !== undefined) folder.name = String(body.name).trim().slice(0, 80) || folder.name
        if (body.description !== undefined) folder.description = String(body.description).slice(0, 2000)
      })
      return sendJson(res, 200, { ok: true })
    }
    if (action === 'delete') {
      const id = String(body.id || '')
      if (id === DEFAULT_FOLDER) throw new Error('默认文献库不能删除')
      await mutateStore((current) => {
        const index = current.folders.findIndex((item) => item.id === id)
        if (index < 0) throw new Error('文件夹不存在')
        current.folders.splice(index, 1)
        for (const doc of current.documents) if (doc.folderId === id) doc.folderId = DEFAULT_FOLDER
      })
      return sendJson(res, 200, { ok: true })
    }
    throw new Error('未知的文件夹操作')
  }

  if (method === 'POST' && pathname === '/api/reader/document') {
    const body = await readJsonBody(req, 1024 * 1024)
    const id = String(body.id || '')
    if (body.action === 'update') {
      await mutateStore((current) => {
        const doc = findDoc(current, id)
        if (body.title !== undefined) doc.title = String(body.title).trim().slice(0, 300) || doc.title
        if (body.folderId !== undefined && current.folders.some((folder) => folder.id === body.folderId)) doc.folderId = body.folderId
      })
      return sendJson(res, 200, { ok: true })
    }
    if (body.action === 'delete') {
      await mutateStore((current) => {
        const index = current.documents.findIndex((doc) => doc.id === id)
        if (index < 0) throw new Error('文献不存在')
        current.documents.splice(index, 1)
      })
      contentCache.delete(id)
      await rm(docDir(id), { recursive: true, force: true }).catch(() => undefined)
      return sendJson(res, 200, { ok: true })
    }
    if (body.action === 'reextract') {
      await mutateStore((current) => {
        const doc = findDoc(current, id)
        doc.status = 'extracting'
        doc.error = undefined
      })
      try {
        await extractDocument(ctx, id)
      } catch (error) {
        await mutateStore((current) => {
          const doc = findDoc(current, id)
          doc.status = 'error'
          doc.error = error instanceof Error ? error.message : String(error)
        })
      }
      return sendJson(res, 200, stateView(await loadStore()))
    }
    throw new Error('未知的文献操作')
  }

  if (method === 'POST' && pathname === '/api/reader/analyze') {
    const body = await readJsonBody(req, 1024 * 1024)
    const id = String(body.docId || '')
    const store = await loadStore()
    const doc = findDoc(store, id)
    if (!body.force && doc.hasSummary) return sendJson(res, 200, { ready: true })
    const job = startSummaryJob(ctx, id)
    return sendJson(res, 200, { job: jobView(job) })
  }

  if (method === 'POST' && pathname === '/api/reader/guide') {
    const body = await readJsonBody(req, 1024 * 1024)
    const docIds = arr(body.docIds).map(String).filter(Boolean)
    if (!docIds.length) throw new Error('请先选择至少一篇文献')
    const job = startJob(ctx, 'guide', `guide:${docIds.join(',')}`, async (report, signal) => {
      const result = await generateGuide(ctx, docIds, { signal, onProgress: report })
      return { guide: result.guide }
    })
    return sendJson(res, 200, { job: jobView(job) })
  }

  if (method === 'POST' && pathname === '/api/reader/translate-selection') {
    const body = await readJsonBody(req, 2 * 1024 * 1024)
    const result = await translateSelection(ctx, {
      docId: String(body.docId || ''),
      text: String(body.text || ''),
      page: Number(body.page) || 0,
      signal: AbortSignal.timeout(120000),
    })
    return sendJson(res, 200, result)
  }

  if (method === 'POST' && pathname === '/api/reader/chat') {
    const body = await readJsonBody(req, 1024 * 1024)
    const question = String(body.question || '').trim()
    if (!question) throw new Error('问题不能为空')
    const result = await answerQuestion(ctx, {
      docId: body.docId ? String(body.docId) : undefined,
      question,
      history: body.history,
      signal: AbortSignal.timeout(180000),
    })
    return sendJson(res, 200, result)
  }

  if (method === 'POST' && pathname === '/api/reader/save') {
    const body = await readJsonBody(req, 1024 * 1024)
    const id = String(body.docId || '')
    const store = await loadStore()
    const doc = findDoc(store, id)
    if (!doc.hasSummary) throw new Error('还没有生成精简总结')
    const markdown = await readFile(markdownPath(id), 'utf8')
    await mutateStore((current) => { findDoc(current, id).summarySavedAt = now() })
    return sendJson(res, 200, { path: markdownPath(id), chars: markdown.length })
  }

  if (method === 'POST' && pathname === '/api/reader/cancel') {
    const body = await readJsonBody(req, 1024 * 1024)
    const job = jobs.get(String(body.jobId || ''))
    if (!job) throw new Error('任务不存在')
    job.controller.abort()
    return sendJson(res, 200, { ok: true })
  }

  return sendJson(res, 404, { error: '未知接口' })
}

/* ------------------------------------------------------------------ */
/* agent tool                                                          */
/* ------------------------------------------------------------------ */

function formatLibrary(store) {
  const lines = [`文献库：${store.documents.length} 篇文献，${store.folders.length} 个文件夹`]
  for (const folder of store.folders) {
    const docs = store.documents.filter((doc) => doc.folderId === folder.id)
    lines.push(`\n## ${folder.name}（${docs.length} 篇）`)
    if (folder.description) lines.push(folder.description)
    for (const doc of docs) {
      lines.push(`- [${doc.id}] ${doc.title} · ${doc.pages || '?'} 页${doc.hasSummary ? ' · 已总结' : ''}`)
    }
  }
  return lines.join('\n')
}

function buildTool(ctx) {
  return {
    name: 'literature_reader',
    description: [
      'DSH 文献阅读插件：管理 PDF 文献库；读取文献原文；生成结构化中文精简总结；',
      '对多篇文献做知识点汇总并生成学习资料。所有生成内容以中文为主，关键名词括弧英文。',
    ].join(''),
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'read', 'summarize', 'guide', 'add_folder'],
          description: 'list 列出文献库；read 读取原文；summarize 生成精简总结；guide 生成多文献学习资料；add_folder 新建文件夹。',
        },
        docId: { type: 'string', description: '单篇文献 id（read / summarize 用）' },
        docIds: { type: 'array', items: { type: 'string' }, description: '多篇文献 id（guide 用）' },
        name: { type: 'string', description: '文件夹名称（add_folder 用）' },
        description: { type: 'string', description: '文件夹说明（add_folder 用）' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['text'],
        properties: {
          text: { type: 'string' },
          path: { type: 'string' },
        },
      },
      render: (_args, value) => [{ type: 'text', text: String(value?.text || '') }],
    },
    presentCall(args) {
      const labels = { list: '查看文献库', read: '读取文献', summarize: '生成文献总结', guide: '汇总文献知识点', add_folder: '新建文献文件夹' }
      return { card: 'generic', title: labels[args?.action] || '文献阅读', kind: 'execute' }
    },
    async execute(args) {
      const action = String(args?.action || '')
      if (action === 'list') {
        return { text: formatLibrary(await loadStore()) }
      }
      if (action === 'add_folder') {
        const name = String(args?.name || '').trim()
        if (!name) throw new Error('文件夹名称不能为空')
        const folder = { id: newId('folder'), name: name.slice(0, 80), description: String(args?.description || '').slice(0, 2000), createdAt: now() }
        await mutateStore((current) => { current.folders.push(folder) })
        return { text: `已创建文件夹「${folder.name}」。` }
      }
      if (action === 'read') {
        const id = String(args?.docId || '')
        if (!id) throw new Error('read 需要 docId')
        const store = await loadStore()
        const doc = findDoc(store, id)
        const content = await readContent(id)
        return { text: `# ${doc.title}\n\n${contentToPrompt(content, 24000, { skipReferences: true })}` }
      }
      if (action === 'summarize') {
        const id = String(args?.docId || '')
        if (!id) throw new Error('summarize 需要 docId')
        const result = await generateSummary(ctx, id, {})
        return { text: result.markdown, path: markdownPath(id) }
      }
      if (action === 'guide') {
        const ids = arr(args?.docIds).map(String).filter(Boolean)
        if (!ids.length) throw new Error('guide 需要 docIds')
        const result = await generateGuide(ctx, ids, {})
        return { text: result.content, path: guidePath(result.guide.id) }
      }
      throw new Error(`未知的 action：${action}`)
    },
  }
}

/* ------------------------------------------------------------------ */
/* plugin entry                                                        */
/* ------------------------------------------------------------------ */

export function apply(ctx, config = {}) {
  configuredLibraryDir = config.libraryDir ? path.resolve(String(config.libraryDir)) : ''
  const saved = readSettingsSync()
  libraryDir = configuredLibraryDir
    || (saved.libraryDir ? path.resolve(String(saved.libraryDir)) : DEFAULT_LIBRARY_DIR)

  const server = ctx.webServer
  if (server && typeof server.register === 'function') {
    ctx.effect(() => server.register({
      kind: 'prefix',
      path: '/api/reader',
      handler: (req, res) => handleHttp(ctx, req, res).catch((error) => {
        try {
          sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
        } catch { /* response may already be gone */ }
      }),
    }), 'literature-reader: http routes')
  }

  ctx.effect(() => ctx.tools.register(buildTool(ctx), {}), 'literature-reader: agent tool')
}
