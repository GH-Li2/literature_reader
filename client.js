window.__ModuleLoader__.load({
  id: '@local/literature-reader',
  factory(require) {
    const React = require('react')
    const {
      useCallback, useEffect, useMemo, useRef, useState,
    } = React
    const h = React.createElement
    const API = '/api/reader'
    let pdfjsPromise = null

    async function copyToClipboard(text) {
      const value = String(text || '')
      if (!value) return false
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value)
          return true
        }
      } catch { /* fall back below */ }
      try {
        window.focus()
        const area = document.createElement('textarea')
        area.value = value
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.left = '-9999px'
        area.style.top = '0'
        document.body.appendChild(area)
        area.focus()
        area.select()
        area.setSelectionRange(0, value.length)
        const ok = document.execCommand('copy')
        area.remove()
        return ok
      } catch {
        return false
      }
    }

    function downloadText(filename, text) {
      try {
        const blob = new Blob([String(text || '')], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1500)
        return true
      } catch {
        return false
      }
    }

    function loadPdfjs() {
      if (!pdfjsPromise) {
        pdfjsPromise = import(`${API}/assets/pdf.mjs`).then((pdfjs) => {
          pdfjs.GlobalWorkerOptions.workerSrc = `${API}/assets/pdf.worker.mjs`
          return pdfjs
        }).catch((error) => {
          pdfjsPromise = null
          throw error
        })
      }
      return pdfjsPromise
    }

    /* ---------------------------------------------------------------- */
    /* icons                                                             */
    /* ---------------------------------------------------------------- */

    function svg(props, children) {
      return h('svg', {
        viewBox: '0 0 24 24', width: props.size || 18, height: props.size || 18,
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
        strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, className: props.className,
      }, children)
    }

    function IconBook(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21z' }),
        h('path', { key: 'b', d: 'M4 18.5A2.5 2.5 0 0 1 6.5 16H20' }),
        h('path', { key: 'c', d: 'M8 7h8M8 10.5h5' }),
      ])
    }
    function IconPlus(p) {
      return svg(p, [h('path', { key: 'a', d: 'M12 5v14M5 12h14' })])
    }
    function IconFolder(p) {
      return svg(p, [h('path', { key: 'a', d: 'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' })])
    }
    function IconChevron(p) {
      return svg(p, [h('path', { key: 'a', d: p.open ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6' })])
    }
    function IconEdit(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16z' }),
        h('path', { key: 'b', d: 'M13.5 6.5l4 4' }),
      ])
    }
    function IconTrash(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M4 7h16M9 7V5h6v2M6 7l1 14h10l1-14' }),
        h('path', { key: 'b', d: 'M10 11v6M14 11v6' }),
      ])
    }
    function IconX(p) {
      return svg(p, [h('path', { key: 'a', d: 'M6 6l12 12M18 6L6 18' })])
    }
    function IconRight(p) {
      return svg(p, [
        h('rect', { key: 'a', x: 3, y: 4, width: 18, height: 16, rx: 2 }),
        h('path', { key: 'b', d: 'M15 4v16' }),
        h('path', { key: 'c', d: 'M18 9l-2 3 2 3' }),
      ])
    }
    function IconSpark(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M12 3l1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8z' }),
        h('path', { key: 'b', d: 'M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z' }),
      ])
    }
    function IconTranslate(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M4 5h9M8.5 5v2c0 3.5-2 6.5-5 8' }),
        h('path', { key: 'b', d: 'M5 10c1.5 2.5 3.5 4.2 6 5' }),
        h('path', { key: 'c', d: 'M13 20l4-11 4 11M14.5 16.5h5' }),
      ])
    }
    function IconSend(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M21 3L10 14' }),
        h('path', { key: 'b', d: 'M21 3l-6.5 18-4-7-7-4z' }),
      ])
    }
    function IconCopy(p) {
      return svg(p, [
        h('rect', { key: 'a', x: 9, y: 9, width: 11, height: 11, rx: 2 }),
        h('path', { key: 'b', d: 'M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1' }),
      ])
    }
    function IconDownload(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M12 3v12M7 10l5 5 5-5' }),
        h('path', { key: 'b', d: 'M4 19h16' }),
      ])
    }
    function IconUpload(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M12 16V4M7 9l5-5 5 5' }),
        h('path', { key: 'b', d: 'M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3' }),
      ])
    }
    function IconFile(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M7 3h7l4 4v14H7z' }),
        h('path', { key: 'b', d: 'M14 3v5h5M10 12h5M10 16h5' }),
      ])
    }
    function IconCheck(p) {
      return svg(p, [h('path', { key: 'a', d: 'M4 12l5 5L20 6' })])
    }
    function IconRefresh(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M20 11a8 8 0 1 0-2.3 5.7' }),
        h('path', { key: 'b', d: 'M20 4v7h-7' }),
      ])
    }
    function IconSave(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M5 3h12l3 3v15H5z' }),
        h('path', { key: 'b', d: 'M8 3v6h8V3M8 21v-7h8v7' }),
      ])
    }
    function IconMessage(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z' }),
        h('path', { key: 'b', d: 'M8 8h8M8 11.5h5' }),
      ])
    }
    function IconExternal(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M14 4h6v6M20 4l-9 9' }),
        h('path', { key: 'b', d: 'M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5' }),
      ])
    }
    function IconLayers(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M12 3l9 5-9 5-9-5z' }),
        h('path', { key: 'b', d: 'M3 12l9 5 9-5M3 16l9 5 9-5' }),
      ])
    }
    function IconSearch(p) {
      return svg(p, [
        h('circle', { key: 'a', cx: 11, cy: 11, r: 7 }),
        h('path', { key: 'b', d: 'M16 16l5 5' }),
      ])
    }
    function IconMore(p) {
      return svg(p, [
        h('circle', { key: 'a', cx: 5, cy: 12, r: 1.2, fill: 'currentColor', stroke: 'none' }),
        h('circle', { key: 'b', cx: 12, cy: 12, r: 1.2, fill: 'currentColor', stroke: 'none' }),
        h('circle', { key: 'c', cx: 19, cy: 12, r: 1.2, fill: 'currentColor', stroke: 'none' }),
      ])
    }
    function IconSettings(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M4 7h9M17 7h3M4 17h3M11 17h9' }),
        h('circle', { key: 'b', cx: 15, cy: 7, r: 2.2 }),
        h('circle', { key: 'c', cx: 9, cy: 17, r: 2.2 }),
      ])
    }
    function IconFit(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5' }),
      ])
    }
    function IconMinus(p) {
      return svg(p, [h('path', { key: 'a', d: 'M5 12h14' })])
    }
    function IconPagePrev(p) {
      return svg(p, [h('path', { key: 'a', d: 'M15 5l-7 7 7 7' })])
    }
    function IconPageNext(p) {
      return svg(p, [h('path', { key: 'a', d: 'M9 5l7 7-7 7' })])
    }
    function IconExpand(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5' }),
      ])
    }
    function IconCollapse(p) {
      return svg(p, [
        h('path', { key: 'a', d: 'M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5' }),
      ])
    }

    /* ---------------------------------------------------------------- */
    /* helpers                                                           */
    /* ---------------------------------------------------------------- */

    function cx(...parts) {
      return parts.filter(Boolean).join(' ')
    }

    function fmtBytes(bytes) {
      if (!bytes) return '0 B'
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    }

    function fmtDate(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    function fmtElapsed(ms) {
      const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000))
      if (seconds < 60) return `${seconds}s`
      return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
    }

    async function api(path, options = {}) {
      const response = await fetch(API + path, {
        headers: options.body ? { 'content-type': 'application/json' } : undefined,
        ...options,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.error) throw new Error(data.error || `请求失败（${response.status}）`)
      return data
    }

    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const text = String(reader.result || '')
          resolve(text.slice(text.indexOf(',') + 1))
        }
        reader.onerror = () => reject(reader.error || new Error('读取文件失败'))
        reader.readAsDataURL(file)
      })
    }

    function imageUrl(docId, file) {
      return `${API}/image/${encodeURIComponent(docId)}/${String(file).split('/').map(encodeURIComponent).join('/')}`
    }

    function pdfUrl(docId, page) {
      return `${API}/file/${encodeURIComponent(docId)}/original.pdf#page=${page || 1}&zoom=page-width`
    }

    function useElapsed(startedAt) {
      const [now, setNow] = useState(Date.now())
      useEffect(() => {
        if (!startedAt) return undefined
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
      }, [startedAt])
      return startedAt ? fmtElapsed(startedAt) : ''
    }

    function useToast() {
      const [toast, setToast] = useState(null)
      const timer = useRef(null)
      const show = useCallback((text, tone = 'info') => {
        setToast({ text, tone })
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setToast(null), 4200)
      }, [])
      useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
      return [toast, show]
    }

    /* ---------------------------------------------------------------- */
    /* inline markdown                                                   */
    /* ---------------------------------------------------------------- */

    function inline(text, keyPrefix) {
      const source = String(text ?? '')
      const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
      const out = []
      let last = 0
      let match
      let index = 0
      while ((match = pattern.exec(source)) !== null) {
        if (match.index > last) out.push(source.slice(last, match.index))
        const token = match[0]
        if (token.startsWith('**')) out.push(h('strong', { key: `${keyPrefix}-b${index}` }, token.slice(2, -2)))
        else if (token.startsWith('`')) out.push(h('code', { key: `${keyPrefix}-c${index}` }, token.slice(1, -1)))
        else out.push(h('em', { key: `${keyPrefix}-i${index}` }, token.slice(1, -1)))
        last = match.index + token.length
        index += 1
      }
      if (last < source.length) out.push(source.slice(last))
      return out
    }

    function cells(line) {
      return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
    }

    function Markdown({ text, compact = false }) {
      const lines = String(text || '').replace(/\r/g, '').split('\n')
      const out = []
      let index = 0
      let key = 0
      while (index < lines.length) {
        const line = lines[index]
        if (!line.trim()) { index += 1; continue }
        if (line.trim().startsWith('```')) {
          const code = []
          index += 1
          while (index < lines.length && !lines[index].trim().startsWith('```')) { code.push(lines[index]); index += 1 }
          index += 1
          out.push(h('pre', { key: `pre-${key++}`, className: 'lr-md-pre' }, code.join('\n')))
          continue
        }
        const heading = /^(#{1,6})\s+(.*)$/.exec(line)
        if (heading) {
          const level = Math.min(6, heading[1].length + (compact ? 2 : 0))
          out.push(h(`h${level}`, { key: `h-${key++}`, className: 'lr-md-h' }, inline(heading[2], `h${key}`)))
          index += 1
          continue
        }
        if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
          out.push(h('hr', { key: `hr-${key++}` }))
          index += 1
          continue
        }
        if (line.trim().startsWith('>')) {
          const quote = []
          while (index < lines.length && lines[index].trim().startsWith('>')) {
            quote.push(lines[index].replace(/^\s*>\s?/, ''))
            index += 1
          }
          out.push(h('blockquote', { key: `q-${key++}` }, inline(quote.join(' '), `q${key}`)))
          continue
        }
        if (/^\s*\|.*\|\s*$/.test(line) && index + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[index + 1])) {
          const head = cells(line)
          index += 2
          const rows = []
          while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
            rows.push(cells(lines[index]))
            index += 1
          }
          out.push(h('div', { key: `t-${key++}`, className: 'lr-md-table-wrap' },
            h('table', { className: 'lr-md-table' },
              h('thead', null, h('tr', null, head.map((cell, i) => h('th', { key: i }, inline(cell, `th${i}`))))),
              h('tbody', null, rows.map((row, r) => h('tr', { key: r }, row.map((cell, i) => h('td', { key: i }, inline(cell, `td${r}-${i}`)))))))))
          continue
        }
        if (/^\s*[-*+]\s+/.test(line)) {
          const items = []
          while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
            items.push(lines[index].replace(/^\s*[-*+]\s+/, ''))
            index += 1
          }
          out.push(h('ul', { key: `ul-${key++}`, className: 'lr-md-list' }, items.map((item, i) => h('li', { key: i }, inline(item, `li${i}`)))))
          continue
        }
        if (/^\s*\d+[.)]\s+/.test(line)) {
          const items = []
          while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
            items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ''))
            index += 1
          }
          out.push(h('ol', { key: `ol-${key++}`, className: 'lr-md-list' }, items.map((item, i) => h('li', { key: i }, inline(item, `oli${i}`)))))
          continue
        }
        const paragraph = [line]
        index += 1
        while (index < lines.length && lines[index].trim() && !/^(#{1,6}\s|\s*[-*+]\s|\s*\d+[.)]\s|\s*>|\s*\|)/.test(lines[index])) {
          paragraph.push(lines[index])
          index += 1
        }
        out.push(h('p', { key: `p-${key++}` }, inline(paragraph.join(' '), `p${key}`)))
      }
      return h('div', { className: cx('lr-markdown', compact && 'is-compact') }, out)
    }

    /* ---------------------------------------------------------------- */
    /* generic bits                                                      */
    /* ---------------------------------------------------------------- */

    function IconButton({ title, onClick, children, active, danger, className, disabled }) {
      return h('button', {
        type: 'button', title, 'aria-label': title, onClick, disabled,
        className: cx('lr-icon-btn', active && 'is-active', danger && 'is-danger', className),
      }, children)
    }

    function Button({ children, onClick, variant = 'ghost', disabled, title, className, icon }) {
      return h('button', {
        type: 'button', title, onClick, disabled,
        className: cx('lr-btn', `is-${variant}`, className),
      }, icon || null, h('span', null, children))
    }

    function Switch({ checked, onChange, label, title }) {
      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': checked,
        title,
        className: cx('lr-switch', checked && 'is-on'),
        onClick: () => onChange(!checked),
      },
        h('span', { className: 'lr-switch-track' }, h('span', { className: 'lr-switch-thumb' })),
        label ? h('span', { className: 'lr-switch-label' }, label) : null)
    }

    function Modal({ title, subtitle, children, onClose, wide }) {
      return h('div', {
        className: 'lr-modal-backdrop',
        onMouseDown: (event) => { if (event.target === event.currentTarget) onClose() },
      }, h('div', { className: cx('lr-modal', wide && 'is-wide'), role: 'dialog', 'aria-modal': 'true' },
        h('div', { className: 'lr-modal-head' },
          h('div', null,
            h('div', { className: 'lr-modal-title' }, title),
            subtitle ? h('div', { className: 'lr-modal-sub' }, subtitle) : null),
          h(IconButton, { title: '关闭', onClick: onClose }, h(IconX))),
        h('div', { className: 'lr-modal-body' }, children)))
    }

    function Spinner({ size = 16 }) {
      return h('span', { className: 'lr-spinner', style: { width: size, height: size } })
    }

    function EmptyState({ hasDocs, onUpload, uploading }) {
      return h('div', { className: 'lr-empty' },
        h('div', { className: 'lr-empty-art' },
          h('div', { className: 'lr-empty-book' }, h(IconBook, { size: 42 })),
          h('div', { className: 'lr-empty-spark' }, h(IconSpark, { size: 22 }))),
        h('h1', { className: 'lr-empty-title' }, hasDocs ? '选择一篇文献开始阅读' : '把论文拖进来，交给 Agent 精读'),
        h('p', { className: 'lr-empty-sub' }, hasDocs
          ? '左侧是文献库。点击文献即可生成结构化中文总结，或在右侧 PDF 中划词翻译。'
          : '支持 PDF。上传后会自动提取正文与图片，生成结构化中文总结，并支持 PDF 划词翻译与随时提问。'),
        !hasDocs && h('button', { type: 'button', className: 'lr-dropzone', onClick: onUpload, disabled: Boolean(uploading) },
          uploading ? h(Spinner, { size: 22 }) : h(IconUpload, { size: 28 }),
          h('strong', null, uploading ? `正在解析 ${uploading}…` : '拖拽 PDF 到这里，或点击选择文件'),
          h('span', null, '文献会保存在插件自己的 library 文件夹中')),
        h('div', { className: 'lr-empty-features' },
          [
            ['结构化总结', '研究总结 + 实验步骤 + 参数结果', IconSpark],
            ['划词翻译', 'PDF 选中即译，结合论文语境', IconTranslate],
            ['原文对照', '悬停实验句，右侧自动定位高亮', IconRight],
            ['多篇汇总', '勾选多篇文献生成学习资料', IconLayers],
          ].map(([title, desc, Icon], i) => h('div', { className: 'lr-feature', key: i },
            h('span', { className: 'lr-feature-icon' }, h(Icon, { size: 18 })),
            h('div', null, h('strong', null, title), h('span', null, desc)))))
      )
    }

    function JobProgress({ job, onCancel }) {
      const elapsed = useElapsed(job?.startedAt)
      const percent = job?.status === 'done' ? 100 : Math.min(92, 8 + Math.floor((Date.now() - (job?.startedAt || Date.now())) / 900))
      if (!job) return null
      return h('div', { className: cx('lr-job', job.status === 'error' && 'is-error') },
        h('div', { className: 'lr-job-head' },
          job.status === 'running' ? h(Spinner, { size: 18 }) : h('span', { className: 'lr-job-dot' }),
          h('div', { className: 'lr-job-titles' },
            h('strong', null, job.phase || '处理中…'),
            h('span', null, `已用时 ${elapsed}${job.status === 'done' ? ' · 完成' : ''}`)),
          job.status === 'running' ? h(Button, { variant: 'ghost', onClick: onCancel }, '停止') : null),
        h('div', { className: 'lr-job-bar' }, h('span', { style: { width: `${percent}%` } })),
        job.error ? h('div', { className: 'lr-job-error' }, job.error) : null,
        job.partial ? h('pre', { className: 'lr-job-partial' }, job.partial) : h('div', { className: 'lr-job-hint' }, 'Agent 正在通读原文，请稍候。可以切换到其他文献，生成会在后台继续。')
      )
    }

    /* ---------------------------------------------------------------- */
    /* summary view                                                      */
    /* ---------------------------------------------------------------- */

    function Cite({ sourceRef, onSource, children, locateEnabled = true }) {
      if (!sourceRef) return h('span', { className: 'lr-cite-plain' }, children)
      return h('button', {
        type: 'button',
        className: 'lr-cite',
        onClick: () => onSource(sourceRef),
        onMouseEnter: locateEnabled ? () => onSource(sourceRef) : undefined,
        title: sourceRef.quote || `定位到原文第 ${sourceRef.page} 页`,
      }, children, h('span', { className: 'lr-cite-page' }, `p${sourceRef.page}`))
    }

    function SectionTitle({ index, title, en }) {
      return h('div', { className: 'lr-sec-title' },
        h('span', { className: 'lr-sec-index' }, String(index).padStart(2, '0')),
        h('div', null, h('h2', null, title), en ? h('span', null, en) : null))
    }

    function SummaryView({ summary, content, onSource, locateEnabled = true }) {
      if (!summary) return null
      const hoverSource = (sourceRef) => {
        if (locateEnabled && sourceRef) onSource(sourceRef)
      }
      const research = summary.research_summary || {}
      const keyPoints = summary.key_points || []
      const keywords = summary.keywords || []
      const hasStructured = Boolean(research.question || research.background || research.methods
        || (research.findings || []).length || keyPoints.length || (summary.experiment_steps || []).length
        || (summary.parameters || []).length || (summary.results || []).length
        || (summary.conclusions || []).length)
      let sectionNo = 0
      const nextSection = () => { sectionNo += 1; return sectionNo }
      return h('article', { className: 'lr-doc-article' },
        h('div', { className: 'lr-doc-hero' },
          summary.paper_type ? h('div', { className: 'lr-paper-type' }, summary.paper_type) : null,
          summary.title_zh ? h('h1', null, summary.title_zh) : null,
          summary.title_en ? h('div', { className: 'lr-doc-en' }, summary.title_en) : null,
          summary.one_sentence ? h('p', { className: 'lr-one-line' }, summary.one_sentence) : null,
          keywords.length ? h('div', { className: 'lr-keywords' }, keywords.map((keyword, i) => h('span', {
            className: 'lr-keyword', key: i,
          }, keyword.zh || keyword.en, keyword.zh && keyword.en ? h('em', null, keyword.en) : null))) : null,
          h('div', { className: 'lr-doc-badges' },
            h('span', null, h(IconSpark, { size: 13 }), 'DSH Agent 自适应总结'),
            content ? h('span', null, h(IconFile, { size: 13 }), `${content.pageCount} 页 · ${content.charCount.toLocaleString()} 字符`) : null)),

        hasStructured ? h(React.Fragment, null,
          (research.question || research.background || research.methods || (research.findings || []).length
            || (research.contributions || []).length || (research.limitations || []).length)
            ? h('section', { className: 'lr-section' },
              h(SectionTitle, { index: nextSection(), title: '文献研究总结', en: 'RESEARCH SUMMARY' }),
              h('div', { className: 'lr-summary-grid' },
                research.question ? h('div', { className: 'lr-info-card is-wide' },
                  h('span', { className: 'lr-info-label' }, '研究问题'),
                  h('p', null, research.question)) : null,
                research.background ? h('div', { className: 'lr-info-card' },
                  h('span', { className: 'lr-info-label' }, '背景与动机'),
                  h('p', null, research.background)) : null,
                research.methods ? h('div', { className: 'lr-info-card' },
                  h('span', { className: 'lr-info-label' }, '方法概述'),
                  h('p', null, research.methods)) : null),
              (research.findings || []).length ? h('div', { className: 'lr-subblock' },
                h('div', { className: 'lr-subhead' }, '主要发现', h('span', null, locateEnabled ? '悬停可定位原文' : '悬停定位已关闭')),
                h('ul', { className: 'lr-findings' }, research.findings.map((item, i) => h('li', {
                  key: i,
                  onMouseEnter: () => hoverSource(item.sourceRef),
                }, h(Cite, { sourceRef: item.sourceRef, onSource, locateEnabled }, item.text))))) : null,
              (research.contributions || []).length ? h('div', { className: 'lr-subblock' },
                h('div', { className: 'lr-subhead' }, '主要贡献'),
                h('div', { className: 'lr-chips' }, research.contributions.map((item, i) => h('span', { className: 'lr-chip', key: i }, item)))) : null,
              (research.limitations || []).length ? h('div', { className: 'lr-subblock' },
                h('div', { className: 'lr-subhead' }, '局限与边界'),
                h('ul', { className: 'lr-limits' }, research.limitations.map((item, i) => h('li', { key: i }, item)))) : null)
            : null,

          keyPoints.length ? h('section', { className: 'lr-section' },
            h(SectionTitle, { index: nextSection(), title: '核心要点', en: 'KEY POINTS' }),
            h('div', { className: 'lr-keypoints' }, keyPoints.map((point, i) => h('div', {
              className: cx('lr-keypoint', point.importance === 'high' && 'is-important'),
              key: i,
              onMouseEnter: () => hoverSource(point.sourceRef),
            },
              h('div', { className: 'lr-keypoint-head' },
                h('span', { className: 'lr-keypoint-cat' }, point.category || '要点'),
                point.sourceRef ? h(Cite, { sourceRef: point.sourceRef, onSource, locateEnabled }, '原文') : null),
              point.title ? h('h3', null, point.title) : null,
              h('p', null, point.detail),
              point.importance === 'high' ? h('span', { className: 'lr-keypoint-flag' }, '重点') : null)))) : null,

          (summary.experiment_steps || []).length ? h('section', { className: 'lr-section' },
            h(SectionTitle, { index: nextSection(), title: '实验逻辑步骤', en: 'EXPERIMENTAL LOGIC' }),
            h('div', { className: 'lr-timeline' }, summary.experiment_steps.map((step, i) => h('div', { className: 'lr-step', key: i },
              h('div', { className: 'lr-step-rail' },
                h('span', { className: 'lr-step-num' }, String(step.step || i + 1)),
                i < summary.experiment_steps.length - 1 ? h('span', { className: 'lr-step-line' }) : null),
              h('div', {
                className: 'lr-step-card',
                onMouseEnter: () => hoverSource(step.sourceRef),
              },
                h('div', { className: 'lr-step-head' },
                  h('h3', null, step.title || `步骤 ${i + 1}`),
                  h(Cite, { sourceRef: step.sourceRef, onSource, locateEnabled }, '原文')),
                step.description ? h('p', null, step.description) : null,
                step.purpose ? h('div', { className: 'lr-step-purpose' },
                  h('span', null, '为什么这样做'), h('p', null, step.purpose)) : null))))) : null,

          ((summary.parameters || []).length || (summary.results || []).length) ? h('section', { className: 'lr-section' },
            h(SectionTitle, { index: nextSection(), title: '重要参数与结果', en: 'PARAMETERS & RESULTS' }),
            (summary.parameters || []).length ? h('div', { className: 'lr-table-block' },
              h('div', { className: 'lr-subhead' }, '关键参数'),
              h('div', { className: 'lr-table-wrap' },
                h('table', { className: 'lr-table' },
                  h('thead', null, h('tr', null,
                    h('th', null, '参数'), h('th', null, '设置 / 数值'), h('th', null, '含义'), h('th', null, '原文'))),
                  h('tbody', null, summary.parameters.map((item, i) => h('tr', {
                    key: i,
                    onMouseEnter: () => hoverSource(item.sourceRef),
                  },
                    h('td', { className: 'is-strong' }, item.name),
                    h('td', null, h('span', { className: 'lr-value' }, item.value)),
                    h('td', null, item.meaning),
                    h('td', null, item.sourceRef ? h(Cite, { sourceRef: item.sourceRef, onSource, locateEnabled }, '查看') : '—')))))))
              : null,
            (summary.results || []).length ? h('div', { className: 'lr-table-block' },
              h('div', { className: 'lr-subhead' }, '关键结果'),
              h('div', { className: 'lr-table-wrap' },
                h('table', { className: 'lr-table' },
                  h('thead', null, h('tr', null,
                    h('th', null, '指标'), h('th', null, '结果'), h('th', null, '说明'), h('th', null, '原文'))),
                  h('tbody', null, summary.results.map((item, i) => h('tr', {
                    key: i,
                    onMouseEnter: () => hoverSource(item.sourceRef),
                  },
                    h('td', { className: 'is-strong' }, item.metric),
                    h('td', null, h('span', { className: 'lr-value' }, item.value)),
                    h('td', null, item.conclusion),
                    h('td', null, item.sourceRef ? h(Cite, { sourceRef: item.sourceRef, onSource, locateEnabled }, '查看') : '—')))))))
              : null) : null,

          (summary.conclusions || []).length ? h('section', { className: 'lr-section' },
            h(SectionTitle, { index: nextSection(), title: '重要结论', en: 'CONCLUSIONS' }),
            h('ul', { className: 'lr-findings' }, summary.conclusions.map((item, i) => h('li', {
              key: i,
              onMouseEnter: () => hoverSource(item.sourceRef),
            }, h(Cite, { sourceRef: item.sourceRef, onSource, locateEnabled }, item.text))))) : null,

          (summary.terms || []).length ? h('section', { className: 'lr-section' },
            h(SectionTitle, { index: nextSection(), title: '关键术语', en: 'KEY TERMS' }),
            h('div', { className: 'lr-terms' }, summary.terms.map((term, i) => h('div', { className: 'lr-term', key: i },
              h('div', { className: 'lr-term-zh' }, term.zh),
              h('div', { className: 'lr-term-en' }, term.en),
              term.note ? h('div', { className: 'lr-term-note' }, term.note) : null)))) : null
        ) : h('div', { className: 'lr-raw-wrap' },
          h('p', { className: 'lr-raw-hint' }, '模型返回的内容不是标准结构，以下为原始总结：'),
          h('pre', { className: 'lr-raw' }, summary.raw || '没有可用内容')),

        h('div', { className: 'lr-doc-foot' },
          h(IconCheck, { size: 14 }), '总结已自动保存到文献库')
      )
    }

    /* ---------------------------------------------------------------- */
    /* selection translation                                             */
    /* ---------------------------------------------------------------- */

    function SelectionTranslationView({ selection, doc, showToast, autoTranslate, onToggleAuto }) {
      const [source, setSource] = useState(selection?.text || '')
      const [result, setResult] = useState('')
      const [loading, setLoading] = useState(false)
      const [error, setError] = useState('')
      const requestRef = useRef(0)
      const lastRequested = useRef('')

      const runTranslate = useCallback(async (text) => {
        const value = String(text || '').trim()
        if (!value || !doc?.id) return
        const requestId = ++requestRef.current
        lastRequested.current = `${selection?.page || 0}:${value}`
        setLoading(true)
        setError('')
        try {
          const data = await api('/translate-selection', {
            method: 'POST',
            body: JSON.stringify({ docId: doc.id, text: value, page: selection?.page || 0 }),
          })
          if (requestId === requestRef.current) setResult(data.translation || '')
        } catch (cause) {
          if (requestId === requestRef.current) {
            setError(cause.message || '翻译失败')
            lastRequested.current = ''
          }
        } finally {
          if (requestId === requestRef.current) setLoading(false)
        }
      }, [doc?.id, selection?.page])

      useEffect(() => {
        const next = String(selection?.text || '')
        if (!next) return undefined
        setSource(next)
        setResult('')
        setError('')
        lastRequested.current = ''
        const timer = setTimeout(() => runTranslate(next), 200)
        return () => clearTimeout(timer)
      }, [selection?.nonce])

      useEffect(() => {
        const value = source.trim()
        if (!value) {
          setResult('')
          setError('')
          return undefined
        }
        const key = `${selection?.page || 0}:${value}`
        if (key === lastRequested.current) return undefined
        const timer = setTimeout(() => {
          if (key !== lastRequested.current) runTranslate(value)
        }, 900)
        return () => clearTimeout(timer)
      }, [source, selection?.page, runTranslate])

      const copy = async (text, message) => {
        if (!text) return
        if (await copyToClipboard(text)) showToast(message, 'success')
        else showToast('复制失败，请手动选择文字复制', 'error')
      }

      return h('article', { className: 'lr-doc-article lr-selection-translate' },
        h('div', { className: 'lr-doc-hero is-compact' },
          h('h1', null, '划词翻译'),
          h('p', { className: 'lr-one-line' }, '在右侧 PDF 中选中文字，会自动填入上方；也可以直接修改原文再翻译。'),
          h('div', { className: 'lr-st-toggle-row' },
            h(Switch, {
              checked: Boolean(autoTranslate),
              onChange: onToggleAuto,
              label: '划词自动读取',
              title: '打开后，PDF 划词会直接填入并翻译；关闭后只会弹出高亮/附注/翻译/复制工具条',
            }),
            h('span', { className: 'lr-st-toggle-hint' }, autoTranslate ? '划词后自动翻译' : '划词只弹工具条；点“翻译”才送入')),
          h('div', { className: 'lr-doc-badges' },
            selection?.page ? h('span', null, h(IconFile, { size: 13 }), `第 ${selection.page} 页`) : null,
            h('span', null, h(IconSpark, { size: 13 }), '结合论文语境'),
            h('span', null, h(IconTranslate, { size: 13 }), '学术术语'))),

        h('section', { className: 'lr-st-card' },
          h('div', { className: 'lr-st-head' },
            h('strong', null, '原文'),
            h('span', null, `${source.length} 字符`)),
          h('textarea', {
            className: 'lr-st-source',
            value: source,
            rows: 8,
            placeholder: '在右侧 PDF 中划选一段文字，或在这里粘贴/输入要翻译的内容…',
            onChange: (event) => setSource(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                runTranslate(source)
              }
            },
          }),
          h('div', { className: 'lr-st-actions' },
            h('span', { className: 'lr-st-hint' }, loading ? '正在结合上下文翻译…' : '修改原文后会自动重新翻译'),
            h('div', { className: 'lr-actions-right' },
              h(Button, { variant: 'ghost', icon: h(IconCopy, { size: 14 }), onClick: () => copy(source, '已复制原文'), disabled: !source.trim() }, '复制原文'),
              h(Button, { variant: 'primary', icon: h(IconTranslate, { size: 14 }), onClick: () => runTranslate(source), disabled: !source.trim() || loading }, loading ? '翻译中…' : '翻译'))),

        h('div', { className: 'lr-st-arrow' }, '↓'),

        h('section', { className: 'lr-st-card is-result' },
          h('div', { className: 'lr-st-head' },
            h('strong', null, '中文翻译'),
            h('span', null, result ? `${result.length} 字符` : '等待翻译')),
          loading ? h('div', { className: 'lr-st-loading' }, h(Spinner, { size: 18 }), '正在结合论文语境翻译…')
            : error ? h('div', { className: 'lr-st-error' }, error,
              h('button', { type: 'button', className: 'lr-text-btn', onClick: () => runTranslate(source) }, '重试'))
              : result ? h('div', { className: 'lr-st-result' }, h(Markdown, { text: result }))
                : h('div', { className: 'lr-st-empty' }, '划词后自动翻译；也可以修改上方原文，再点「翻译」。'),
          h('div', { className: 'lr-st-result-actions' },
            h(Button, { variant: 'ghost', icon: h(IconCopy, { size: 14 }), onClick: () => copy(result, '已复制译文'), disabled: !result }, '复制译文'),
            h(Button, { variant: 'ghost', icon: h(IconTranslate, { size: 14 }), onClick: () => runTranslate(source), disabled: !source.trim() || loading }, '重新翻译'))))
      )
    }

    /* ---------------------------------------------------------------- */
    /* guide view                                                        */
    /* ---------------------------------------------------------------- */

    function GuideView({ guide, onDelete }) {
      if (!guide) return null
      const body = String(guide.content || '').replace(/^\s*#\s+.*(?:\r?\n)+/, '')
      return h('article', { className: 'lr-doc-article' },
        h('div', { className: 'lr-doc-hero' },
          h('div', { className: 'lr-guide-kicker' }, h(IconLayers, { size: 15 }), '文献知识汇总'),
          h('h1', null, guide.title),
          h('p', { className: 'lr-one-line' }, `基于 ${(guide.docIds || []).length} 篇文献生成 · ${fmtDate(guide.createdAt)}`),
          h('div', { className: 'lr-doc-badges' },
            h('span', null, h(IconSpark, { size: 13 }), '中文为主 · 名词括弧英文'),
            h('span', null, h(IconBook, { size: 13 }), '适合复习与英语学习'))),
        h('div', { className: 'lr-guide-body' }, h(Markdown, { text: body })),
        h('div', { className: 'lr-doc-foot' },
          h(IconCheck, { size: 14 }), '学习资料已保存',
          h('button', { type: 'button', className: 'lr-text-btn is-danger', onClick: onDelete }, '删除这份资料'))
      )
    }

    /* ---------------------------------------------------------------- */
    /* source pane                                                       */
    /* ---------------------------------------------------------------- */

    const NOTE_COLORS = { yellow: 'rgba(250,204,21,.22)', green: 'rgba(74,222,128,.20)', pink: 'rgba(244,114,182,.18)', blue: 'rgba(96,165,250,.18)', purple: 'rgba(168,85,247,.18)' }

    function PdfPage({
      pdfjs, pdf, meta, width, zoom, focus, annotations, scrollRoot,
      onHighlight, onRequestNote, onTranslateSelection, onCopyText, autoTranslateSelection, onEditAnnotation, onDeleteAnnotation, onChangeAnnotationColor, onToggleFullscreen, onMount, onMeta, textEnabled,
    }) {
      const pageRef = useRef(null)
      const surfaceRef = useRef(null)
      const canvasRef = useRef(null)
      const textRef = useRef(null)
      const renderRef = useRef(null)
      const autoTranslateTimer = useRef(null)
      const textLayerRef = useRef(null)
      const [visible, setVisible] = useState(false)
      const [rendered, setRendered] = useState(false)
      const [selection, setSelection] = useState(null)
      const [selectionPreview, setSelectionPreview] = useState(null)
      const [activeAnnotationId, setActiveAnnotationId] = useState(null)
      const [error, setError] = useState('')

      const cssScale = Math.max(0.2, ((width || 560) - 46) / meta.width * zoom)
      const cssW = Math.max(120, meta.width * cssScale)
      const cssH = Math.max(160, meta.height * cssScale)

      useEffect(() => {
        const node = pageRef.current
        if (!node) return undefined
        const observer = new IntersectionObserver((entries) => {
          for (const entry of entries) setVisible(entry.isIntersecting)
        }, { root: scrollRoot?.current || null, rootMargin: '650px 0px' })
        observer.observe(node)
        return () => observer.disconnect()
      }, [scrollRoot])

      useEffect(() => {
        if (!visible || !pdf || width <= 0) return undefined
        let cancelled = false
        const render = async () => {
          try {
            setError('')
            setRendered(false)
            const pdfPage = await pdf.getPage(meta.number)
            if (cancelled) return
            const baseViewport = pdfPage.getViewport({ scale: 1 })
            if (Math.abs(baseViewport.width - meta.width) > 2 || Math.abs(baseViewport.height - meta.height) > 2) {
              onMeta?.(meta.number, { width: baseViewport.width, height: baseViewport.height })
            }
            const viewport = pdfPage.getViewport({ scale: cssScale })
            const surface = surfaceRef.current
            const canvas = canvasRef.current
            if (!surface || !canvas) return
            surface.style.setProperty('--scale-factor', String(cssScale))
            const baseRatio = Math.min(window.devicePixelRatio || 1, 2)
            const cappedWidth = 1800
            const ratio = Math.max(1, Math.min(baseRatio, cappedWidth / Math.max(1, viewport.width)))
            const pixel = pdfPage.getViewport({ scale: cssScale * ratio })
            canvas.width = Math.floor(pixel.width)
            canvas.height = Math.floor(pixel.height)
            canvas.style.width = `${Math.floor(viewport.width)}px`
            canvas.style.height = `${Math.floor(viewport.height)}px`
            renderRef.current?.cancel()
            const task = pdfPage.render({
              canvasContext: canvas.getContext('2d'),
              viewport: pixel,
            })
            renderRef.current = task
            await task.promise
            renderRef.current = null
            if (!cancelled) setRendered(true)
          } catch (cause) {
            if (!cancelled && cause?.name !== 'RenderingCancelledException') {
              setError(cause?.message || '页面渲染失败')
            }
          }
        }
        render()
        return () => {
          cancelled = true
          try { renderRef.current?.cancel() } catch { /* ignore */ }
          renderRef.current = null
        }
      }, [visible, pdf, width, zoom, meta.number, cssScale, pdfjs, meta.width, meta.height, onMeta])

      useEffect(() => {
        if (!visible && !textEnabled) {
          const canvas = canvasRef.current
          if (canvas) { canvas.width = 0; canvas.height = 0 }
          const textDiv = textRef.current
          if (textDiv) textDiv.innerHTML = ''
          setRendered(false)
        }
      }, [visible, textEnabled])

      useEffect(() => {
        if (!textEnabled || !pdfjs || !pdf || width <= 0) return undefined
        let cancelled = false
        const renderText = async () => {
          try {
            const pdfPage = await pdf.getPage(meta.number)
            if (cancelled) return
            const surface = surfaceRef.current
            const textDiv = textRef.current
            if (!surface || !textDiv) return
            surface.style.setProperty('--scale-factor', String(cssScale))
            const viewport = pdfPage.getViewport({ scale: cssScale })
            try { textLayerRef.current?.cancel() } catch { /* ignore */ }
            textDiv.innerHTML = ''
            const layer = new pdfjs.TextLayer({
              textContentSource: pdfPage.streamTextContent(),
              container: textDiv,
              viewport,
            })
            textLayerRef.current = layer
            await layer.render()
            textLayerRef.current = null
          } catch { /* text layer is optional; canvas remains usable */ }
        }
        renderText()
        return () => {
          cancelled = true
          try { textLayerRef.current?.cancel() } catch { /* ignore */ }
          textLayerRef.current = null
        }
      }, [textEnabled, pdfjs, pdf, width, zoom, meta.number, cssScale])

      const handleMouseUp = () => {
        clearTimeout(autoTranslateTimer.current)
        setSelectionPreview(null)
        const timer = setTimeout(() => {
          const active = window.getSelection()
          if (!active || active.isCollapsed) return
          const text = active.toString().replace(/\s+/g, ' ').trim()
          if (text.length < 2) return
          const range = active.getRangeAt(0)
          const surface = surfaceRef.current
          if (!surface || !surface.contains(range.commonAncestorContainer)) return
          const pageRect = surface.getBoundingClientRect()
          const rects = Array.from(range.getClientRects())
            .filter((rect) => rect.width > 2 && rect.height > 2)
            .map((rect) => ({
              x: Math.max(0, (rect.left - pageRect.left) / pageRect.width),
              y: Math.max(0, (rect.top - pageRect.top) / pageRect.height),
              w: Math.min(1, rect.width / pageRect.width),
              h: Math.min(1, rect.height / pageRect.height),
            }))
            .filter((rect) => rect.x + rect.w <= 1.01 && rect.y + rect.h <= 1.01)
          if (!rects.length) return
          const last = rects[rects.length - 1]
          setSelection({
            text,
            rects,
            left: Math.max(4, Math.min(cssW - 240, last.x * cssW)),
            top: Math.max(4, last.y * cssH + last.h * cssH + 6),
          })
          if (autoTranslateSelection && text.length >= 3) {
            autoTranslateTimer.current = setTimeout(() => {
              setSelectionPreview({ page: meta.number, rects })
              onTranslateSelection?.({ page: meta.number, text, rects })
              window.getSelection()?.removeAllRanges()
              setSelection(null)
            }, 1400)
          }
        }, 12)
        return () => clearTimeout(timer)
      }

      useEffect(() => () => clearTimeout(autoTranslateTimer.current), [])
      useEffect(() => {
        if (!autoTranslateSelection) clearTimeout(autoTranslateTimer.current)
      }, [autoTranslateSelection])

      const handleSurfaceClick = (event) => {
        if (event.target.closest?.('.lr-selection-tools') || event.target.closest?.('.lr-ann-toolbar') || event.target.closest?.('.lr-ann-highlight')) return
        const active = window.getSelection()
        if (!active || active.isCollapsed) {
          setSelectionPreview(null)
          setSelection(null)
          setActiveAnnotationId(null)
        }
      }

      const pageNotes = annotations.filter((item) => item.page === meta.number)
      const activeAnnotation = pageNotes.find((item) => item.id === activeAnnotationId) || null
      const activeRect = activeAnnotation?.rects?.[0]
      useEffect(() => {
        if (activeAnnotationId && !pageNotes.some((item) => item.id === activeAnnotationId)) setActiveAnnotationId(null)
      }, [annotations, activeAnnotationId, meta.number])
      const focusHere = focus && focus.page === meta.number

      return h('div', {
        className: 'lr-pdf-page-wrap',
        ref: (node) => { pageRef.current = node; onMount?.(node) },
      },
        h('div', { className: 'lr-pdf-page-label' }, `第 ${meta.number} 页`),
        h('div', {
          className: 'lr-pdf-page-surface',
          ref: surfaceRef,
          style: { width: `${cssW}px`, height: `${cssH}px`, '--scale-factor': String(cssScale) },
          onMouseUp: handleMouseUp,
          onClick: handleSurfaceClick,
        },
          h('canvas', { ref: canvasRef, className: 'lr-pdf-canvas' }),
          visible && !rendered && !error ? h('div', { className: 'lr-pdf-page-loading' },
            h(Spinner, { size: 14 }), `正在渲染第 ${meta.number} 页…`) : null,
          h('div', { className: 'lr-pdf-highlight-layer' },
            selectionPreview?.rects?.length
              ? selectionPreview.rects.map((rect, index) => h('div', {
                key: `preview-${index}`,
                className: 'lr-selection-preview',
                style: {
                  left: `${rect.x * cssW}px`,
                  top: `${rect.y * cssH}px`,
                  width: `${Math.max(2, rect.w * cssW)}px`,
                  height: `${Math.max(2, rect.h * cssH)}px`,
                },
              }))
              : null,
            focusHere && focus.bbox
              ? h('div', {
                className: 'lr-focus-highlight',
                style: {
                  left: `${Math.max(0, focus.bbox[0]) * cssScale}px`,
                  top: `${Math.max(0, focus.bbox[1]) * cssScale}px`,
                  width: `${Math.max(2, (focus.bbox[2] - focus.bbox[0]) * cssScale)}px`,
                  height: `${Math.max(2, (focus.bbox[3] - focus.bbox[1]) * cssScale)}px`,
                },
              })
              : null,
            pageNotes.map((annotation) => annotation.rects?.length
              ? annotation.rects.map((rect, index) => h('div', {
                key: `${annotation.id}-${index}`,
                className: cx('lr-ann-highlight', activeAnnotationId === annotation.id && 'is-active'),
                title: '点击高亮，可复制、加附注、改颜色或删除',
                style: {
                  left: `${rect.x * cssW}px`,
                  top: `${rect.y * cssH + 1}px`,
                  width: `${Math.max(2, rect.w * cssW)}px`,
                  height: `${Math.max(2, rect.h * cssH - 2)}px`,
                  background: NOTE_COLORS[annotation.color] || NOTE_COLORS.yellow,
                },
                onMouseDown: (event) => event.preventDefault(),
                onClick: (event) => {
                  event.stopPropagation()
                  setActiveAnnotationId(annotation.id)
                },
              }))
              : h('button', {
                key: annotation.id,
                type: 'button',
                className: 'lr-ann-pin',
                title: annotation.note || '页注',
                onClick: (event) => { event.stopPropagation(); onEditAnnotation(annotation) },
              }, h(IconMessage, { size: 13 })))),
          activeAnnotation && activeRect ? h('div', {
            className: 'lr-ann-toolbar',
            style: (() => {
              const left = Math.min(Math.max(4, activeRect.x * cssW), Math.max(4, cssW - 258))
              const below = activeRect.y * cssH + activeRect.h * cssH + 8
              const top = below > cssH - 52 ? Math.max(4, activeRect.y * cssH - 48) : below
              return { left: `${left}px`, top: `${top}px` }
            })(),
            onMouseDown: (event) => event.preventDefault(),
            onClick: (event) => event.stopPropagation(),
          },
            h('button', {
              type: 'button',
              onClick: () => {
                onCopyText?.(activeAnnotation.text || activeAnnotation.note)
                setActiveAnnotationId(null)
              },
            }, h(IconCopy, { size: 12 }), '复制'),
            h('button', {
              type: 'button',
              onClick: () => {
                onEditAnnotation(activeAnnotation)
                setActiveAnnotationId(null)
              },
            }, h(IconEdit, { size: 12 }), '附注'),
            h('button', {
              type: 'button',
              className: 'is-danger',
              onClick: () => {
                onDeleteAnnotation?.(activeAnnotation)
                setActiveAnnotationId(null)
              },
            }, h(IconTrash, { size: 12 }), '删除'),
            h('span', { className: 'lr-ann-colors' }, ['yellow', 'green', 'pink', 'blue', 'purple'].map((color) => h('button', {
              key: color,
              type: 'button',
              className: cx('lr-ann-color', activeAnnotation.color === color && 'is-active'),
              style: { background: (NOTE_COLORS[color] || NOTE_COLORS.yellow).replace(/,\.[0-9]+\)/, ',.85)') },
              title: `改为${color}`,
              onClick: () => onChangeAnnotationColor?.(activeAnnotation, color),
            })))) : null,
          h('div', { className: 'lr-pdf-text-layer', ref: textRef }),
          error ? h('div', { className: 'lr-pdf-page-error' }, error) : null,
          selection ? h('div', {
            className: 'lr-selection-tools',
            style: { left: `${selection.left}px`, top: `${selection.top}px` },
            onMouseDown: (event) => event.preventDefault(),
          },
            h('button', {
              type: 'button',
              title: '先高亮，再选择是否添加附注',
              onClick: () => {
                clearTimeout(autoTranslateTimer.current)
                setSelectionPreview(null)
                onRequestNote({ page: meta.number, text: selection.text, rects: selection.rects, color: 'yellow', note: '' })
                window.getSelection()?.removeAllRanges()
                setSelection(null)
              },
            }, h('span', { className: 'lr-selection-dot' }), '高亮'),
            h('button', {
              type: 'button',
              onClick: () => {
                clearTimeout(autoTranslateTimer.current)
                setSelectionPreview({ page: meta.number, rects: selection.rects })
                onTranslateSelection?.({ page: meta.number, text: selection.text, rects: selection.rects })
                window.getSelection()?.removeAllRanges()
                setSelection(null)
              },
            }, h(IconTranslate, { size: 12 }), '翻译'),
            h('button', {
              type: 'button',
              onClick: () => {
                clearTimeout(autoTranslateTimer.current)
                setSelectionPreview(null)
                onCopyText?.(selection.text)
                window.getSelection()?.removeAllRanges()
                setSelection(null)
              },
            }, h(IconCopy, { size: 12 }), '复制')) : null))
    }

    const PdfPageRow = React.memo(PdfPage, (prev, next) => (
      prev.pdfjs === next.pdfjs
      && prev.pdf === next.pdf
      && prev.meta === next.meta
      && prev.width === next.width
      && prev.zoom === next.zoom
      && prev.textEnabled === next.textEnabled
      && prev.autoTranslateSelection === next.autoTranslateSelection
      && prev.annotations === next.annotations
      && (prev.focus?.nonce || 0) === (next.focus?.nonce || 0)
    ))

    function PdfContinuousViewer({
      docId, focus, fullscreen, onToggleFullscreen, annotations,
      onHighlight, onRequestNote, onTranslateSelection, onCopyText, autoTranslateSelection, onEditAnnotation, onDeleteAnnotation, onChangeAnnotationColor, apiRef,
    }) {
      const scrollRef = useRef(null)
      const pageEls = useRef(new Map())
      const scrollRaf = useRef(0)
      const lastScrollAt = useRef(0)
      const currentRef = useRef(1)
      const [pdfjs, setPdfjs] = useState(null)
      const [pdf, setPdf] = useState(null)
      const [metas, setMetas] = useState([])
      const [width, setWidth] = useState(0)
      const [zoom, setZoom] = useState(1)
      const [current, setCurrent] = useState(1)
      const [pageInput, setPageInput] = useState('1')
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState('')

      useEffect(() => {
        let cancelled = false
        let loaded
        setPdf(null)
        setMetas([])
        setLoading(true)
        setError('')
        setZoom(1)
        loadPdfjs().then(async (module) => {
          try {
            if (cancelled) return
            setPdfjs(module)
            const task = module.getDocument({
              url: `${API}/file/${encodeURIComponent(docId)}/original.pdf`,
              useSystemFonts: true,
            })
            const document = await task.promise
            if (cancelled) { document.destroy(); return }
            loaded = document
            // Use the first page's size for all placeholders.  Most papers use
            // a uniform page size; individual pages correct themselves when
            // they are actually rendered (see onMeta below).
            const first = await document.getPage(1)
            const viewport = first.getViewport({ scale: 1 })
            const pageMetas = Array.from({ length: document.numPages }, (_, index) => ({
              number: index + 1,
              width: viewport.width,
              height: viewport.height,
            }))
            if (cancelled) return
            setPdf(document)
            setMetas(pageMetas)
            setCurrent(1)
            currentRef.current = 1
            setPageInput('1')
            setLoading(false)
          } catch (cause) {
            if (!cancelled) {
              setLoading(false)
              setError(cause?.message || 'PDF 加载失败')
            }
          }
        }).catch((cause) => {
          if (!cancelled) {
            setLoading(false)
            setError(cause?.message || 'PDF.js 加载失败')
          }
        })
        return () => {
          cancelled = true
          if (loaded) loaded.destroy().catch(() => undefined)
        }
      }, [docId])

      useEffect(() => {
        const root = scrollRef.current
        if (!root) return undefined
        const measure = () => setWidth((previous) => {
          const next = root.clientWidth
          return Math.abs(next - previous) > 3 ? next : previous
        })
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(root)
        return () => observer.disconnect()
      }, [])

      const scrollToPage = useCallback((number) => {
        const value = Math.min(Math.max(1, Number(number) || 1), metas.length || 1)
        const node = pageEls.current.get(value)
        const root = scrollRef.current
        if (node && root) {
          const top = node.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 8
          root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
        }
        setCurrent(value)
        currentRef.current = value
        setPageInput(String(value))
      }, [metas.length])

      const updateMeta = useCallback((number, size) => {
        setMetas((current) => current.map((meta) => meta.number === number
          ? { ...meta, width: size.width, height: size.height }
          : meta))
      }, [])

      useEffect(() => {
        if (apiRef) apiRef.current = { scrollToPage }
        return () => { if (apiRef) apiRef.current = null }
      }, [apiRef, scrollToPage])

      useEffect(() => {
        if (focus?.page) scrollToPage(focus.page)
      }, [focus?.nonce, focus?.page, scrollToPage])

      const handleScroll = () => {
        const now = performance.now()
        if (now - lastScrollAt.current < 90) return
        lastScrollAt.current = now
        if (scrollRaf.current) return
        scrollRaf.current = requestAnimationFrame(() => {
          scrollRaf.current = 0
          const root = scrollRef.current
          if (!root) return
          let best = currentRef.current
          const rootTop = root.getBoundingClientRect().top
          for (const meta of metas) {
            const node = pageEls.current.get(meta.number)
            if (node && node.getBoundingClientRect().top - rootTop <= 90) best = meta.number
          }
          if (best !== currentRef.current) {
            currentRef.current = best
            setCurrent(best)
            setPageInput(String(best))
          }
        })
      }

      const go = (number) => scrollToPage(number)
      const total = metas.length

      return h('div', { className: 'lr-pdf-viewer' },
        h('div', { className: 'lr-pdf-toolbar' },
          h('div', { className: 'lr-pdf-group' },
            h(IconButton, { title: '上一页', onClick: () => go(current - 1), className: 'lr-pdf-btn' }, h(IconPagePrev, { size: 15 })),
            h('input', {
              className: 'lr-pdf-page-input',
              value: pageInput,
              inputMode: 'numeric',
              'aria-label': '页码',
              onChange: (event) => setPageInput(event.target.value.replace(/[^\d]/g, '')),
              onKeyDown: (event) => { if (event.key === 'Enter') go(pageInput) },
              onBlur: () => go(pageInput),
            }),
            h('span', { className: 'lr-pdf-total' }, `/ ${total || '?'}`),
            h(IconButton, { title: '下一页', onClick: () => go(current + 1), className: 'lr-pdf-btn' }, h(IconPageNext, { size: 15 }))),
          h('div', { className: 'lr-pdf-group' },
            h(IconButton, { title: '缩小', onClick: () => setZoom((value) => Math.max(0.5, value - 0.2)), className: 'lr-pdf-btn' }, h(IconMinus, { size: 15 })),
            h('span', { className: 'lr-pdf-zoom' }, `${Math.round(zoom * 100)}%`),
            h(IconButton, { title: '放大', onClick: () => setZoom((value) => Math.min(3, value + 0.2)), className: 'lr-pdf-btn' }, h(IconPlus, { size: 15 })),
            h(IconButton, { title: '适合宽度', onClick: () => setZoom(1), className: 'lr-pdf-btn' }, h(IconFit, { size: 15 })),
            h(IconButton, {
              title: fullscreen ? '退出全屏' : '全屏阅读',
              onClick: onToggleFullscreen,
              className: 'lr-pdf-btn',
              active: fullscreen,
            }, fullscreen ? h(IconCollapse, { size: 15 }) : h(IconExpand, { size: 15 })))),
        h('div', { className: 'lr-pdf-scroll', ref: scrollRef, onScroll: handleScroll },
          loading ? h('div', { className: 'lr-pdf-status' }, h(Spinner, { size: 18 }), '正在加载 PDF…') : null,
          error ? h('div', { className: 'lr-pdf-status is-error' },
            h('span', null, error),
            h('a', { href: pdfUrl(docId, 1), target: '_blank', rel: 'noreferrer' }, '在新窗口打开')) : null,
          metas.map((meta) => h(PdfPageRow, {
            key: meta.number,
            pdfjs,
            pdf,
            meta,
            width,
            zoom,
            focus,
            annotations,
            scrollRoot: scrollRef,
            onHighlight,
            onRequestNote,
            onTranslateSelection,
            onCopyText,
            autoTranslateSelection,
            onEditAnnotation,
            onDeleteAnnotation,
            onChangeAnnotationColor,
            onToggleFullscreen,
            textEnabled: current === meta.number,
            onMeta: updateMeta,
            onMount: (node) => {
              if (node) pageEls.current.set(meta.number, node)
              else pageEls.current.delete(meta.number)
            },
          }))))
    }

    function AnnotationEditor({ draft, isNew, onClose, onSave, onDelete }) {
      const [note, setNote] = useState(draft.note || '')
      return h(Modal, {
        title: draft.text ? (isNew ? '高亮与附注' : '编辑高亮附注') : '页面附注',
        subtitle: draft.text
          ? (isNew ? '先保存高亮；附注可以留空，之后点击高亮还能再编辑。' : '修改附注，或删除这条高亮。')
          : '这条附注会固定在这一页。',
        onClose,
      },
        draft.text ? h('blockquote', { className: 'lr-note-quote' }, draft.text) : null,
        h('label', { className: 'lr-field' }, h('span', null, isNew ? '附注（可选）' : '附注'),
          h('textarea', {
            rows: 5,
            autoFocus: true,
            value: note,
            placeholder: '可选：写下你的理解、疑问或提醒…',
            onChange: (event) => setNote(event.target.value),
          })),
        isNew ? h('div', { className: 'lr-note-hint' }, '只想要高亮也可以直接保存，附注不是必填。') : null,
        h('div', { className: 'lr-modal-actions' },
          isNew ? h('span') : h(Button, { variant: 'danger', icon: h(IconTrash, { size: 13 }), onClick: onDelete }, '删除这条笔记'),
          h('div', { className: 'lr-actions-right' },
            h(Button, { variant: 'ghost', onClick: onClose }, '取消'),
            h(Button, { variant: 'primary', onClick: () => onSave(note.trim()) }, isNew ? '保存高亮' : '保存附注'))))
    }

    function NotesPanel({ annotations, onClose, onJump, onDelete }) {
      return h('div', { className: 'lr-notes-panel' },
        h('div', { className: 'lr-notes-head' },
          h('strong', null, `笔记与高亮 · ${annotations.length}`),
          h(IconButton, { title: '关闭笔记', onClick: onClose }, h(IconX))),
        annotations.length === 0 ? h('div', { className: 'lr-notes-empty' }, '选中 PDF 文字后点“高亮”，可顺手写附注；也可以在笔记面板删除。') : null,
        h('div', { className: 'lr-notes-list' }, annotations.slice().reverse().map((annotation) => h('div', {
          className: 'lr-note-row', key: annotation.id,
        },
          h('button', {
            type: 'button', className: 'lr-note-main',
            onClick: () => onJump(annotation.page),
          },
            h('span', { className: 'lr-note-page' }, `p${annotation.page}`),
            h('span', { className: 'lr-note-text' }, annotation.note || annotation.text || '无附注内容')),
          h(IconButton, {
            title: '删除这条笔记',
            className: 'lr-row-action',
            onClick: () => onDelete(annotation.id),
          }, h(IconTrash, { size: 13 }))))))
    }

    function SourcePane({ doc, content, highlight, onClose, sourceWidth, onSourceWidth, showToast, onTranslateSelection, autoTranslateSelection }) {
      const [pdfFull, setPdfFull] = useState(false)
      const [annotations, setAnnotations] = useState([])
      const [notesOpen, setNotesOpen] = useState(false)
      const [noteDraft, setNoteDraft] = useState(null)
      const viewerApi = useRef(null)

      const startResize = (event) => {
        event.preventDefault()
        const startX = event.clientX
        const startWidth = sourceWidth
        const body = document.querySelector('.lr-body')
        const bodyWidth = body?.clientWidth || window.innerWidth
        const move = (moveEvent) => {
          const next = startWidth + ((startX - moveEvent.clientX) / bodyWidth) * 100
          onSourceWidth(Math.min(70, Math.max(20, next)))
        }
        const up = () => {
          window.removeEventListener('mousemove', move)
          window.removeEventListener('mouseup', up)
          document.body.style.cursor = ''
          document.body.style.userSelect = ''
        }
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        window.addEventListener('mousemove', move)
        window.addEventListener('mouseup', up)
      }

      const copyText = async (text) => {
        if (!text) return
        if (await copyToClipboard(text)) showToast('已复制选中文字', 'success')
        else showToast('复制失败，请手动选择文字复制', 'error')
      }

      const translateText = (payload) => {
        onTranslateSelection?.({ ...payload, nonce: Date.now() })
      }

      useEffect(() => {
        let cancelled = false
        setAnnotations([])
        setNotesOpen(false)
        setNoteDraft(null)
        api(`/annotations?id=${encodeURIComponent(doc.id)}`).then((data) => {
          if (!cancelled) setAnnotations(Array.isArray(data.annotations) ? data.annotations : [])
        }).catch(() => undefined)
        return () => { cancelled = true }
      }, [doc.id])

      const focus = useMemo(() => {
        if (!highlight) return null
        let pageNumber = highlight.page
        let block = null
        const pages = content?.pages || []
        if (highlight.blockId) {
          for (const page of pages) {
            block = page.blocks?.find((item) => item.id === highlight.blockId)
            if (block) { pageNumber = page.number; break }
          }
        }
        if (!block && highlight.quote) {
          const needle = String(highlight.quote).slice(0, 80)
          for (const page of pages) {
            block = page.blocks?.find((item) => item.text.includes(needle))
            if (block) { pageNumber = page.number; break }
          }
        }
        return {
          ...highlight,
          page: pageNumber || 1,
          bbox: block?.bbox || null,
          blockId: block?.id || highlight.blockId,
          nonce: highlight.nonce || Date.now(),
        }
      }, [highlight, content])

      const persist = async (next) => {
        setAnnotations(next)
        try {
          await api('/annotations', {
            method: 'POST',
            body: JSON.stringify({ docId: doc.id, annotations: next }),
          })
        } catch (error) {
          showToast(`附注保存失败：${error.message}`, 'error')
        }
      }

      const addHighlight = (draft) => {
        const annotation = {
          ...draft,
          id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
        }
        persist([...annotations, annotation])
      }

      const saveNote = (note) => {
        if (!noteDraft) return
        if (noteDraft.isNew) {
          const annotation = {
            ...noteDraft.draft,
            note,
            id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            createdAt: new Date().toISOString(),
          }
          persist([...annotations, annotation])
        } else {
          persist(annotations.map((item) => item.id === noteDraft.draft.id ? { ...item, note } : item))
        }
        setNoteDraft(null)
      }

      const deleteNote = () => {
        if (!noteDraft || noteDraft.isNew) return
        persist(annotations.filter((item) => item.id !== noteDraft.draft.id))
        setNoteDraft(null)
      }

      const removeAnnotation = (annotation) => {
        if (!annotation?.id) return
        persist(annotations.filter((item) => item.id !== annotation.id))
        showToast('已删除高亮/附注', 'success')
      }

      const recolorAnnotation = (annotation, color) => {
        if (!annotation?.id) return
        persist(annotations.map((item) => item.id === annotation.id ? { ...item, color } : item))
      }

      return h('aside', {
        className: cx('lr-source', pdfFull && 'is-pdf-full'),
        style: pdfFull ? undefined : { width: `${sourceWidth}%`, flexBasis: `${sourceWidth}%` },
      },
        h('div', { className: 'lr-source-resizer', onMouseDown: startResize, title: '拖动调整原文窗口宽度' }),
        h('div', { className: 'lr-source-head' },
          h('div', { className: 'lr-source-title' },
            h(IconFile, { size: 15 }),
            h('span', null, '原文 PDF'),
            h('span', { className: 'lr-source-page' }, `${doc.pages || '?'} 页`),
            h('span', { className: 'lr-source-page is-hint' }, '滚轮连续阅读')),
          h('div', { className: 'lr-source-actions' },
            h(IconButton, {
              title: '笔记与高亮',
              active: notesOpen,
              onClick: () => setNotesOpen((value) => !value),
            }, h(IconMessage, { size: 15 }), annotations.length ? h('span', { className: 'lr-note-count' }, annotations.length) : null),
            h('a', {
              className: 'lr-icon-btn',
              href: pdfUrl(doc.id, 1),
              target: '_blank',
              rel: 'noreferrer',
              title: '在新窗口打开 PDF',
            }, h(IconExternal, { size: 15 })),
            h(IconButton, { title: '关闭原文窗口', onClick: onClose }, h(IconX)))),
        h('div', { className: 'lr-pdf-wrap' },
          h(PdfContinuousViewer, {
            docId: doc.id,
            focus,
            fullscreen: pdfFull,
            onToggleFullscreen: () => setPdfFull((value) => !value),
            annotations,
            onHighlight: addHighlight,
            onRequestNote: (draft) => setNoteDraft({ draft, isNew: true }),
            onTranslateSelection: translateText,
            onCopyText: copyText,
            autoTranslateSelection,
            onEditAnnotation: (annotation) => setNoteDraft({ draft: annotation, isNew: false }),
            onDeleteAnnotation: removeAnnotation,
            onChangeAnnotationColor: recolorAnnotation,
            apiRef: viewerApi,
          })),
        notesOpen ? h(NotesPanel, {
          annotations,
          onClose: () => setNotesOpen(false),
          onJump: (pageNumber) => { viewerApi.current?.scrollToPage(pageNumber); setNotesOpen(false) },
          onDelete: (id) => persist(annotations.filter((item) => item.id !== id)),
        }) : null,
        noteDraft ? h(AnnotationEditor, {
          draft: noteDraft.draft,
          isNew: noteDraft.isNew,
          onClose: () => setNoteDraft(null),
          onSave: saveNote,
          onDelete: deleteNote,
        }) : null)
    }


    /* ---------------------------------------------------------------- */
    /* chat                                                              */
    /* ---------------------------------------------------------------- */

    function ChatPanel({ doc, onClose, showToast }) {
      const [messages, setMessages] = useState([])
      const [input, setInput] = useState('')
      const [sending, setSending] = useState(false)
      const scrollRef = useRef(null)
      const inputRef = useRef(null)

      useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }, [messages, sending])

      useEffect(() => {
        const timer = setTimeout(() => inputRef.current?.focus(), 120)
        return () => clearTimeout(timer)
      }, [])

      const send = useCallback(async (question) => {
        const text = String(question ?? input).trim()
        if (!text || sending) return
        const next = [...messages, { role: 'user', content: text }]
        setMessages(next)
        setInput('')
        setSending(true)
        try {
          const data = await api('/chat', {
            method: 'POST',
            body: JSON.stringify({
              docId: doc?.id,
              question: text,
              history: messages.map((message) => ({ role: message.role, content: message.content })),
            }),
          })
          setMessages((current) => [...current, { role: 'assistant', content: data.answer }])
        } catch (error) {
          setMessages((current) => [...current, { role: 'assistant', content: `抱歉，生成回答时出错：${error.message}`, error: true }])
        } finally {
          setSending(false)
        }
      }, [doc?.id, input, messages, sending])

      const suggestions = doc
        ? ['这篇论文的核心创新是什么？', '实验为什么要这样设计？', '这篇论文有哪些局限性？', '用更通俗的话解释一下方法']
        : ['文献库里有哪些论文？', '帮我推荐先读哪一篇？']

      const exportChat = () => {
        if (!messages.length) {
          showToast?.('还没有问答内容', 'error')
          return
        }
        const title = doc?.title || '文献库'
        const date = new Date().toLocaleString('zh-CN')
        const markdown = [
          '# 文献问答',
          '',
          `- 文献：${title}`,
          `- 导出时间：${date}`,
          '',
          ...messages.flatMap((message, index) => [
            `## ${message.role === 'user' ? '问' : '答'} ${message.role === 'user' ? Math.ceil((index + 1) / 2) : Math.ceil(index / 2)}`,
            '',
            String(message.content || ''),
            '',
          ]),
        ].join('\n')
        const safe = title.replace(/[\\/:*?"<>|]/g, ' ').slice(0, 60).trim() || '文献'
        if (downloadText(`${safe}-问答.md`, markdown)) showToast?.('已导出问答 Markdown', 'success')
        else showToast?.('导出失败，请复制内容', 'error')
      }

      return h('div', { className: 'lr-chat' },
        h('div', { className: 'lr-chat-head' },
          h('div', null, h(IconMessage, { size: 16 }), h('strong', null, '问问 DSH Agent'),
            h('span', null, doc ? `· ${doc.title}` : '· 文献库')),
          h('div', { className: 'lr-chat-head-actions' },
            h(IconButton, { title: '导出问答（Markdown）', onClick: exportChat, disabled: !messages.length }, h(IconDownload, { size: 15 })),
            h(IconButton, { title: '收起提问', onClick: onClose }, h(IconX)))),
        h('div', { className: 'lr-chat-scroll', ref: scrollRef },
          messages.length === 0 ? h('div', { className: 'lr-chat-empty' },
            h('p', null, doc ? '我已经读过这篇文献，可以回答方法、实验、结果和局限相关的问题。' : '可以从文献库层面提问，也可以先打开一篇文献。'),
            h('div', { className: 'lr-chat-suggestions' }, suggestions.map((item, i) => h('button', {
              type: 'button', key: i, onClick: () => send(item),
            }, item)))) : null,
          messages.map((message, i) => h('div', { key: i, className: cx('lr-msg', message.role === 'user' ? 'is-user' : 'is-agent', message.error && 'is-error') },
            message.role === 'assistant' ? h('div', { className: 'lr-msg-avatar' }, h(IconSpark, { size: 14 })) : null,
            h('div', { className: 'lr-msg-body' }, message.role === 'assistant'
              ? h(Markdown, { text: message.content, compact: true })
              : h('p', null, message.content)))),
          sending ? h('div', { className: 'lr-msg is-agent' },
            h('div', { className: 'lr-msg-avatar' }, h(IconSpark, { size: 14 })),
            h('div', { className: 'lr-msg-body lr-thinking' }, h(Spinner, { size: 13 }), 'Agent 正在翻原文…')) : null),
        h('div', { className: 'lr-chat-input' },
          h('textarea', {
            ref: inputRef,
            value: input,
            rows: 2,
            placeholder: '随时提问，Enter 发送，Shift+Enter 换行',
            onChange: (event) => setInput(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                send()
              }
            },
          }),
          h('button', {
            type: 'button', className: 'lr-send', disabled: sending || !input.trim(),
            onClick: () => send(), title: '发送',
          }, sending ? h(Spinner, { size: 15 }) : h(IconSend, { size: 17 }))))
    }

    /* ---------------------------------------------------------------- */
    /* modals                                                            */
    /* ---------------------------------------------------------------- */

    function FolderModal({ folder, onClose, onSaved, showToast }) {
      const [name, setName] = useState(folder?.name || '')
      const [description, setDescription] = useState(folder?.description || '')
      const [busy, setBusy] = useState(false)
      const [confirming, setConfirming] = useState(false)
      const isEdit = Boolean(folder?.id)
      const save = async () => {
        if (!name.trim()) { showToast('文件夹名称不能为空', 'error'); return }
        setBusy(true)
        try {
          if (isEdit) {
            await api('/folder', { method: 'POST', body: JSON.stringify({ action: 'update', id: folder.id, name, description }) })
            showToast('文件夹已更新', 'success')
          } else {
            await api('/folder', { method: 'POST', body: JSON.stringify({ action: 'create', name, description }) })
            showToast('文件夹已创建', 'success')
          }
          await onSaved()
          onClose()
        } catch (error) { showToast(error.message, 'error') } finally { setBusy(false) }
      }
      const remove = async () => {
        if (!isEdit) return
        setBusy(true)
        try {
          await api('/folder', { method: 'POST', body: JSON.stringify({ action: 'delete', id: folder.id }) })
          showToast('文件夹已删除', 'success')
          await onSaved()
          onClose()
        } catch (error) { showToast(error.message, 'error') } finally { setBusy(false) }
      }
      return h(Modal, {
        title: isEdit ? '编辑文件夹' : '新建文件夹',
        subtitle: '给文件夹一个名字，并写下你希望记住的说明。',
        onClose,
      },
        h('label', { className: 'lr-field' }, h('span', null, '名称'),
          h('input', { value: name, autoFocus: true, maxLength: 80, placeholder: '例如：强化学习 / 这篇论文综述', onChange: (event) => setName(event.target.value) })),
        h('label', { className: 'lr-field' }, h('span', null, '说明'),
          h('textarea', { value: description, rows: 4, maxLength: 2000, placeholder: '例如：关注 LLM Agent 的规划与工具使用，重点读实验部分。', onChange: (event) => setDescription(event.target.value) })),
        h('div', { className: 'lr-modal-actions' },
          isEdit && !confirming ? h(Button, { variant: 'danger', onClick: () => setConfirming(true), disabled: busy }, '删除文件夹') : h('span'),
          h('div', { className: 'lr-actions-right' },
            confirming ? h(React.Fragment, null,
              h(Button, { variant: 'ghost', onClick: () => setConfirming(false), disabled: busy }, '取消'),
              h(Button, { variant: 'danger', onClick: remove, disabled: busy }, busy ? '删除中…' : '确认删除'))
              : h(React.Fragment, null,
                h(Button, { variant: 'ghost', onClick: onClose }, '取消'),
                h(Button, { variant: 'primary', onClick: save, disabled: busy }, busy ? '保存中…' : '保存')))))
    }

    function DocModal({ doc, folders, onClose, onSaved, showToast }) {
      const [title, setTitle] = useState(doc.title || '')
      const [folderId, setFolderId] = useState(doc.folderId || 'inbox')
      const [busy, setBusy] = useState(false)
      const [confirming, setConfirming] = useState(false)
      const save = async () => {
        setBusy(true)
        try {
          await api('/document', { method: 'POST', body: JSON.stringify({ action: 'update', id: doc.id, title, folderId }) })
          showToast('文献信息已更新', 'success')
          await onSaved()
          onClose()
        } catch (error) { showToast(error.message, 'error') } finally { setBusy(false) }
      }
      const remove = async () => {
        setBusy(true)
        try {
          await api('/document', { method: 'POST', body: JSON.stringify({ action: 'delete', id: doc.id }) })
          showToast('文献已删除', 'success')
          await onSaved()
          onClose()
        } catch (error) { showToast(error.message, 'error') } finally { setBusy(false) }
      }
      return h(Modal, { title: '文献信息', subtitle: '可以重命名文献，或把它移动到别的文件夹。', onClose },
        h('label', { className: 'lr-field' }, h('span', null, '标题'),
          h('input', { value: title, maxLength: 300, autoFocus: true, onChange: (event) => setTitle(event.target.value) })),
        h('label', { className: 'lr-field' }, h('span', null, '文件夹'),
          h('select', { value: folderId, onChange: (event) => setFolderId(event.target.value) },
            folders.map((folder) => h('option', { key: folder.id, value: folder.id }, folder.name)))),
        h('div', { className: 'lr-modal-actions' },
          !confirming ? h(Button, { variant: 'danger', onClick: () => setConfirming(true), disabled: busy }, '删除文献') : h('span'),
          h('div', { className: 'lr-actions-right' },
            confirming ? h(React.Fragment, null,
              h(Button, { variant: 'ghost', onClick: () => setConfirming(false), disabled: busy }, '取消'),
              h(Button, { variant: 'danger', onClick: remove, disabled: busy }, busy ? '删除中…' : '确认删除'))
              : h(React.Fragment, null,
                h(Button, { variant: 'ghost', onClick: onClose }, '取消'),
                h(Button, { variant: 'primary', onClick: save, disabled: busy }, busy ? '保存中…' : '保存')))))
    }

    /* ---------------------------------------------------------------- */
    /* library                                                           */
    /* ---------------------------------------------------------------- */

    function SettingsModal({ settings, onClose, onSaved, pickDirectory, showToast }) {
      const [busy, setBusy] = useState(false)
      const [confirmReset, setConfirmReset] = useState(false)
      const choose = async () => {
        if (!pickDirectory) { showToast('当前环境没有目录选择器，请直接在插件配置中设置 libraryDir', 'error'); return }
        let dir
        try { dir = await pickDirectory() } catch (error) { showToast(error.message, 'error'); return }
        if (!dir) return
        setBusy(true)
        try {
          await api('/settings', { method: 'POST', body: JSON.stringify({ libraryDir: dir }) })
          showToast('文献库已迁移到新位置', 'success')
          await onSaved()
          onClose()
        } catch (error) { showToast(error.message, 'error') } finally { setBusy(false) }
      }
      const reset = async () => {
        setBusy(true)
        try {
          await api('/settings', { method: 'POST', body: JSON.stringify({ reset: true }) })
          showToast('已迁回默认位置', 'success')
          await onSaved()
          onClose()
        } catch (error) { showToast(error.message, 'error') } finally { setBusy(false) }
      }
      return h(Modal, {
        title: '文献库位置',
        subtitle: '上传的 PDF、总结、译文和学习资料都保存在这里。可以迁移到任意空文件夹。',
        onClose,
      },
        h('div', { className: 'lr-setting-block' },
          h('div', { className: 'lr-setting-label' }, '当前位置'),
          h('code', { className: 'lr-path' }, settings?.libraryDir || '读取中…'),
          h('div', { className: 'lr-setting-note' }, `默认：${settings?.defaultLibraryDir || '插件目录 / library'}`),
          settings?.configOverride ? h('div', { className: 'lr-setting-warn' }, `当前被插件配置覆盖：${settings.configOverride}`) : null),
        h('div', { className: 'lr-setting-actions' },
          h(Button, { variant: 'primary', onClick: choose, disabled: busy, icon: h(IconFolder, { size: 15 }) }, busy ? '迁移中…' : '选择新位置'),
          confirmReset
            ? h(React.Fragment, null,
              h(Button, { variant: 'ghost', onClick: () => setConfirmReset(false), disabled: busy }, '取消'),
              h(Button, { variant: 'danger', onClick: reset, disabled: busy }, busy ? '迁移中…' : '确认恢复'))
            : h(Button, { variant: 'ghost', onClick: () => setConfirmReset(true), disabled: busy }, '恢复默认位置')),
        h('div', { className: 'lr-setting-note' }, '切换位置时会把整个文献库复制到新文件夹，成功后删除旧位置。请先等待正在进行的生成任务结束。'))
    }

    function LibraryPane({
      state, selectedDocId, selectedIds, targetFolder, setTargetFolder,
      onSelectDoc, onToggleSelect, onNewFolder, onEditFolder, onUploadClick,
      onGenerateGuide, onOpenGuide, onDeleteGuide, uploading, activeGuideId,
    }) {
      const [collapsed, setCollapsed] = useState(() => new Set())
      const fileInput = useRef(null)
      const docsByFolder = useMemo(() => {
        const map = new Map()
        for (const folder of state?.folders || []) map.set(folder.id, [])
        for (const doc of state?.documents || []) {
          if (!map.has(doc.folderId)) map.set(doc.folderId, [])
          map.get(doc.folderId).push(doc)
        }
        for (const list of map.values()) list.sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)))
        return map
      }, [state])

      const toggle = (id) => {
        setCollapsed((current) => {
          const next = new Set(current)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
        setTargetFolder(id)
      }

      return h('aside', { className: 'lr-library' },
        h('div', { className: 'lr-lib-head' },
          h('div', null,
            h('div', { className: 'lr-lib-kicker' }, 'LIBRARY'),
            h('h2', null, '我的文献')),
          h(IconButton, { title: '新建文件夹', onClick: onNewFolder }, h(IconPlus))),
        h('button', {
          type: 'button', className: cx('lr-upload-mini', uploading && 'is-busy'),
          onClick: () => fileInput.current?.click(),
        },
          uploading ? h(Spinner, { size: 15 }) : h(IconUpload, { size: 15 }),
          h('span', null, uploading ? `正在解析 ${uploading}` : '上传 PDF'),
          h('kbd', null, '拖拽')),
        h('input', {
          ref: fileInput, type: 'file', accept: 'application/pdf,.pdf', multiple: true,
          style: { display: 'none' },
          onChange: (event) => { onUploadClick(Array.from(event.target.files || [])); event.target.value = '' },
        }),
        h('div', { className: 'lr-lib-scroll' },
          (state?.folders || []).map((folder) => {
            const docs = docsByFolder.get(folder.id) || []
            const open = !collapsed.has(folder.id)
            return h('section', { className: cx('lr-folder', targetFolder === folder.id && 'is-target'), key: folder.id },
              h('div', { className: 'lr-folder-row' },
                h('button', { type: 'button', className: 'lr-folder-main', onClick: () => toggle(folder.id) },
                  h('span', { className: 'lr-chevron' }, h(IconChevron, { size: 13, open })),
                  h('span', { className: 'lr-folder-icon' }, h(IconFolder, { size: 16 })),
                  h('span', { className: 'lr-folder-name' }, folder.name),
                  h('span', { className: 'lr-folder-count' }, docs.length)),
                h(IconButton, { title: '编辑文件夹', className: 'lr-row-action', onClick: () => onEditFolder(folder) }, h(IconMore, { size: 15 }))),
              open && folder.description ? h('div', { className: 'lr-folder-desc' }, folder.description) : null,
              open ? h('div', { className: 'lr-doc-list' },
                docs.length === 0 ? h('button', {
                  type: 'button', className: 'lr-folder-empty', onClick: () => { setTargetFolder(folder.id); fileInput.current?.click() },
                }, '+ 上传到这个文件夹') : docs.map((doc) => h('div', {
                  key: doc.id,
                  className: cx('lr-doc-row', selectedDocId === doc.id && 'is-active', selectedIds.includes(doc.id) && 'is-checked'),
                  onClick: () => onSelectDoc(doc.id),
                },
                  h('input', {
                    type: 'checkbox',
                    checked: selectedIds.includes(doc.id),
                    onClick: (event) => event.stopPropagation(),
                    onChange: () => onToggleSelect(doc.id),
                    'aria-label': `选择 ${doc.title}`,
                  }),
                  h('div', { className: 'lr-doc-row-main' },
                    h('div', { className: 'lr-doc-row-title', title: doc.title }, doc.title),
                    h('div', { className: 'lr-doc-row-meta' },
                      h('span', null, `${doc.pages || '?'} 页`),
                      doc.hasSummary ? h('span', { className: 'lr-mini-tag' }, '总结') : null,
                      doc.status === 'error' ? h('span', { className: 'lr-mini-tag is-error' }, '解析失败') : null))))) : null)
          }),
          (state?.guides || []).length ? h('section', { className: 'lr-folder lr-guides' },
            h('div', { className: 'lr-folder-row' },
              h('div', { className: 'lr-folder-main is-static' },
                h('span', { className: 'lr-folder-icon' }, h(IconLayers, { size: 16 })),
                h('span', { className: 'lr-folder-name' }, '学习资料'),
                h('span', { className: 'lr-folder-count' }, state.guides.length))),
            h('div', { className: 'lr-doc-list' }, state.guides.map((guide) => h('div', {
              key: guide.id,
              className: cx('lr-guide-row', activeGuideId === guide.id && 'is-active'),
              onClick: () => onOpenGuide(guide.id),
            },
              h('span', { className: 'lr-guide-icon' }, h(IconLayers, { size: 14 })),
              h('div', { className: 'lr-doc-row-main' },
                h('div', { className: 'lr-doc-row-title' }, guide.title),
                h('div', { className: 'lr-doc-row-meta' }, `${(guide.docIds || []).length} 篇 · ${fmtDate(guide.createdAt)}`)),
              h(IconButton, {
                title: '删除学习资料',
                className: 'lr-row-action',
                onClick: (event) => { event.stopPropagation(); onDeleteGuide(guide) },
              }, h(IconTrash, { size: 14 })))))) : null),
        h('div', { className: cx('lr-selection-bar', selectedIds.length > 0 && 'is-visible') },
          h('div', { className: 'lr-selection-count' }, h(IconCheck, { size: 14 }), `已选 ${selectedIds.length} 篇`),
          h(Button, { variant: 'primary', icon: h(IconLayers, { size: 15 }), onClick: onGenerateGuide, disabled: !selectedIds.length }, '生成学习资料'))
      )
    }

    /* ---------------------------------------------------------------- */
    /* main application                                                  */
    /* ---------------------------------------------------------------- */

    function ReaderApp({ pickDirectory }) {
      const [state, setState] = useState(null)
      const [selectedDocId, setSelectedDocId] = useState(null)
      const [detail, setDetail] = useState(null)
      const [content, setContent] = useState(null)
      const [mode, setMode] = useState('summary')
      const [selectionRequest, setSelectionRequest] = useState(null)
      const [rightOpen, setRightOpen] = useState(true)
      const [focusLayout, setFocusLayout] = useState(false)
      const [locateEnabled, setLocateEnabled] = useState(() => {
        try { return localStorage.getItem('lr-locate-hover') !== '0' } catch { return true }
      })
      const [autoSelectionTranslate, setAutoSelectionTranslate] = useState(() => {
        try { return localStorage.getItem('lr-auto-selection-translate') === '1' } catch { return false }
      })
      const [sourceWidth, setSourceWidth] = useState(38)
      const previousWidth = useRef(38)
      const [highlight, setHighlight] = useState(null)
      const [dragOver, setDragOver] = useState(false)
      const [uploading, setUploading] = useState(null)
      const [targetFolder, setTargetFolder] = useState('inbox')
      const [selectedIds, setSelectedIds] = useState([])
      const [activeGuide, setActiveGuide] = useState(null)
      const [activeGuideId, setActiveGuideId] = useState(null)
      const [job, setJob] = useState(null)
      const [jobId, setJobId] = useState(null)
      const [chatOpen, setChatOpen] = useState(false)
      const [modal, setModal] = useState(null)
      const [settings, setSettings] = useState(null)
      const [loadingDoc, setLoadingDoc] = useState(false)
      const [loadError, setLoadError] = useState('')
      const [toast, showToast] = useToast()
      const rootRef = useRef(null)
      const dragDepth = useRef(0)
      const selectedIdRef = useRef(null)
      selectedIdRef.current = selectedDocId

      const activeDoc = useMemo(
        () => state?.documents.find((doc) => doc.id === selectedDocId) || detail?.doc || null,
        [state, selectedDocId, detail],
      )

      const refreshState = useCallback(async (preferredId) => {
        const next = await api('/state')
        setState(next)
        setSelectedIds((current) => current.filter((id) => next.documents.some((doc) => doc.id === id)))
        setTargetFolder((current) => next.folders.some((folder) => folder.id === current) ? current : 'inbox')
        const wanted = preferredId || selectedIdRef.current
        if (!wanted && next.documents.length) {
          setSelectedDocId(next.documents[0].id)
        }
        return next
      }, [])

      const loadDoc = useCallback(async (id) => {
        if (!id) return
        setLoadingDoc(true)
        setDetail(null)
        setContent(null)
        setHighlight(null)
        try {
          const [docData, contentData] = await Promise.all([
            api(`/doc?id=${encodeURIComponent(id)}`),
            api(`/content?id=${encodeURIComponent(id)}`).catch(() => null),
          ])
          if (selectedIdRef.current !== id) return
          setDetail(docData)
          setContent(contentData)
        } catch (error) {
          showToast(error.message, 'error')
        } finally {
          setLoadingDoc(false)
        }
      }, [showToast])

      const selectDoc = useCallback((id) => {
        setSelectedDocId(id)
        selectedIdRef.current = id
        setMode('summary')
        setSelectionRequest(null)
        setActiveGuide(null)
        setActiveGuideId(null)
        setChatOpen(false)
        loadDoc(id)
      }, [loadDoc])

      useEffect(() => {
        let cancelled = false
        api('/state').then((next) => {
          if (cancelled) return
          setState(next)
          if (next.documents.length) {
            setSelectedDocId(next.documents[0].id)
            selectedIdRef.current = next.documents[0].id
            loadDoc(next.documents[0].id)
          }
        }).catch((error) => {
          if (!cancelled) {
            setLoadError(error.message)
            showToast(error.message, 'error')
          }
        })
        return () => { cancelled = true }
      }, [loadDoc, showToast])

      /* poll one generation job */
      useEffect(() => {
        if (!jobId) return undefined
        let stopped = false
        let timer
        const tick = async () => {
          try {
            const next = await api(`/job?id=${encodeURIComponent(jobId)}`)
            if (stopped) return
            setJob({ ...next, mode: next.kind })
            if (next.status !== 'running') {
              clearInterval(timer)
              setJobId(null)
              if (next.status === 'done') {
                if (next.kind === 'guide' && next.result?.guide) {
                  const guide = next.result.guide
                  const data = await api(`/guide?id=${encodeURIComponent(guide.id)}`)
                  if (stopped) return
                  setActiveGuide({ ...guide, content: data.content })
                  setActiveGuideId(guide.id)
                  setMode('guide')
                  showToast('学习资料已生成', 'success')
                } else {
                  const id = next.result?.docId || selectedIdRef.current
                  if (id) {
                    setMode('summary')
                    await loadDoc(id)
                  }
                  showToast('精简总结完成', 'success')
                }
                await refreshState()
              } else if (next.status === 'error') {
                showToast(next.error || '生成失败', 'error')
              }
            }
          } catch (error) {
            if (!stopped) {
              clearInterval(timer)
              setJobId(null)
              showToast(error.message, 'error')
            }
          }
        }
        tick()
        timer = setInterval(tick, 1600)
        return () => { stopped = true; clearInterval(timer) }
      }, [jobId, loadDoc, refreshState, showToast])

      const uploadFiles = useCallback(async (files) => {
        const pdfs = Array.from(files || []).filter((file) => /\.pdf$/i.test(file.name) || file.type === 'application/pdf')
        if (!pdfs.length) { showToast('只支持 PDF 文件', 'error'); return }
        const before = new Set((state?.documents || []).map((doc) => doc.id))
        for (const file of pdfs) {
          setUploading(file.name)
          try {
            const data = await fileToBase64(file)
            const next = await api('/upload', {
              method: 'POST',
              body: JSON.stringify({ name: file.name, folderId: targetFolder, data }),
            })
            setState(next)
            const added = next.documents.find((doc) => !before.has(doc.id))
            if (added) {
              before.add(added.id)
              selectDoc(added.id)
              if (added.status === 'error') showToast(`已上传，但解析失败：${added.error || '未知错误'}`, 'error')
              else if (next.job) {
                setJob({ ...next.job, mode: 'summary' })
                setJobId(next.job.id)
                showToast(`已导入「${added.title}」，Agent 正在自动生成总结…`, 'success')
              } else showToast(`已导入「${added.title}」`, 'success')
            }
          } catch (error) {
            showToast(`${file.name} 上传失败：${error.message}`, 'error')
          } finally {
            setUploading(null)
          }
        }
      }, [selectDoc, showToast, state, targetFolder])

      const onDrop = useCallback((event) => {
        event.preventDefault()
        dragDepth.current = 0
        setDragOver(false)
        uploadFiles(event.dataTransfer?.files)
      }, [uploadFiles])

      const onDragEnter = useCallback((event) => {
        event.preventDefault()
        dragDepth.current += 1
        setDragOver(true)
      }, [])

      const onDragLeave = useCallback((event) => {
        event.preventDefault()
        dragDepth.current -= 1
        if (dragDepth.current <= 0) { dragDepth.current = 0; setDragOver(false) }
      }, [])

      const showSource = useCallback((sourceRef) => {
        if (!sourceRef || !locateEnabled) return
        setRightOpen(true)
        setHighlight({ ...sourceRef, nonce: Date.now() })
      }, [locateEnabled])

      const openSelectionTranslation = useCallback((payload) => {
        if (!payload?.text?.trim()) return
        setSelectionRequest({ ...payload, nonce: Date.now() })
        setMode('selection')
        setRightOpen(true)
        setChatOpen(false)
      }, [])

      const startGeneration = useCallback(async () => {
        if (!activeDoc) return
        if (activeDoc.status !== 'ready') { showToast('这篇文献还没有解析完成', 'error'); return }
        try {
          const data = await api('/analyze', {
            method: 'POST',
            body: JSON.stringify({ docId: activeDoc.id, mode: 'summary', force: true }),
          })
          if (data.ready) { await loadDoc(activeDoc.id); return }
          setJob({ ...data.job, mode: 'summary' })
          setJobId(data.job.id)
          showToast('开始精读并生成总结…', 'info')
        } catch (error) { showToast(error.message, 'error') }
      }, [activeDoc, loadDoc, showToast])

      const cancelJob = useCallback(async () => {
        if (!jobId) return
        try {
          await api('/cancel', { method: 'POST', body: JSON.stringify({ jobId }) })
          showToast('已请求停止', 'info')
        } catch (error) { showToast(error.message, 'error') }
      }, [jobId, showToast])

      const openSettings = useCallback(async () => {
        try {
          const next = await api('/settings')
          setSettings(next)
          setModal({ type: 'settings' })
        } catch (error) { showToast(error.message, 'error') }
      }, [showToast])

      const toggleFocusLayout = useCallback(() => {
        if (focusLayout) {
          setFocusLayout(false)
          setSourceWidth(previousWidth.current || 38)
        } else {
          previousWidth.current = sourceWidth
          setFocusLayout(true)
          setRightOpen(true)
          setSourceWidth(50)
        }
      }, [focusLayout, sourceWidth])

      const toggleLocate = useCallback((next) => {
        setLocateEnabled(next)
        if (!next) setHighlight(null)
        try { localStorage.setItem('lr-locate-hover', next ? '1' : '0') } catch { /* ignore */ }
      }, [])

      const toggleAutoSelectionTranslate = useCallback((next) => {
        setAutoSelectionTranslate(next)
        try { localStorage.setItem('lr-auto-selection-translate', next ? '1' : '0') } catch { /* ignore */ }
      }, [])

      const afterSettingsChange = useCallback(async () => {
        await refreshState()
        if (selectedDocId) await loadDoc(selectedDocId)
      }, [loadDoc, refreshState, selectedDocId])

      const saveCurrent = useCallback(async () => {
        if (!activeDoc || mode !== 'summary' || !detail?.summary) {
          showToast('没有可保存的总结内容', 'error')
          return
        }
        try {
          const data = await api('/save', { method: 'POST', body: JSON.stringify({ docId: activeDoc.id, mode: 'summary' }) })
          showToast(`已保存到 ${data.path}`, 'success')
        } catch (error) { showToast(error.message, 'error') }
      }, [activeDoc, detail, mode, showToast])

      const generateGuide = useCallback(async () => {
        if (!selectedIds.length) { showToast('请先在左侧勾选文献', 'error'); return }
        try {
          const data = await api('/guide', { method: 'POST', body: JSON.stringify({ docIds: selectedIds }) })
          setJob({ ...data.job, mode: 'guide' })
          setJobId(data.job.id)
          showToast(`正在汇总 ${selectedIds.length} 篇文献…`, 'info')
        } catch (error) { showToast(error.message, 'error') }
      }, [selectedIds, showToast])

      const openGuide = useCallback(async (id) => {
        try {
          const data = await api(`/guide?id=${encodeURIComponent(id)}`)
          const meta = (state?.guides || []).find((guide) => guide.id === id)
          setActiveGuide({ ...(meta || { id }), id, content: data.content })
          setActiveGuideId(id)
          setMode('guide')
          setChatOpen(false)
        } catch (error) { showToast(error.message, 'error') }
      }, [state, showToast])

      const deleteGuide = useCallback(async (guide) => {
        try {
          await api('/guide/delete', { method: 'POST', body: JSON.stringify({ id: guide.id }) })
          setActiveGuide(null)
          setActiveGuideId(null)
          setMode('summary')
          await refreshState()
          showToast('学习资料已删除', 'success')
        } catch (error) { showToast(error.message, 'error') }
      }, [refreshState, showToast])

      const toggleSelect = useCallback((id) => {
        setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
      }, [])

      const afterLibraryChange = useCallback(async () => {
        const next = await refreshState()
        if (selectedDocId && !next.documents.some((doc) => doc.id === selectedDocId)) {
          setSelectedDocId(null)
          setDetail(null)
          setContent(null)
        } else if (selectedDocId) {
          await loadDoc(selectedDocId)
        }
      }, [loadDoc, refreshState, selectedDocId])

      const handleDeleteGuideClick = useCallback((guide) => {
        setModal({ type: 'confirm-delete-guide', guide })
      }, [])

      const generating = Boolean(jobId && job?.status === 'running')
      const showJob = generating || (job && job.status === 'error')

      return h('div', {
        className: cx('lr-root', focusLayout && 'is-focus'),
        ref: rootRef,
        onDragEnter,
        onDragOver: (event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' },
        onDragLeave,
        onDrop,
      },
        h('style', null, CSS),

        h('header', { className: 'lr-topbar' },
          h('div', { className: 'lr-brand' },
            h('span', { className: 'lr-brand-mark' }, h(IconBook, { size: 18 })),
            h('div', null, h('strong', null, '文献阅读'), h('span', null, 'Literature Reader'))),
          h('div', { className: 'lr-top-actions' },
            h(Button, { variant: 'soft', icon: h(IconMessage, { size: 14 }), onClick: () => setChatOpen((value) => !value) }, '问问 Agent'),
            h(Button, {
              variant: 'ghost',
              icon: focusLayout ? h(IconCollapse, { size: 14 }) : h(IconExpand, { size: 14 }),
              onClick: toggleFocusLayout,
            }, focusLayout ? '退出专注' : '专注阅读'),
            h(IconButton, { title: '文献库位置', onClick: openSettings }, h(IconSettings)),
            h('span', { className: 'lr-agent-pill' }, h('span', { className: 'lr-live-dot' }), 'DSH Agent 已就绪'),
            h('span', { className: 'lr-top-stat' }, `${state?.stats?.documents ?? 0} 篇文献`),
            h('span', { className: 'lr-top-stat' }, `${state?.stats?.guides ?? 0} 份资料`))),

        h('div', { className: 'lr-body' },
          focusLayout ? null : h(LibraryPane, {
            state, selectedDocId, selectedIds, targetFolder, setTargetFolder,
            onSelectDoc: selectDoc,
            onToggleSelect: toggleSelect,
            onNewFolder: () => setModal({ type: 'folder', folder: null }),
            onEditFolder: (folder) => setModal({ type: 'folder', folder }),
            onUploadClick: uploadFiles,
            onGenerateGuide: generateGuide,
            onOpenGuide: openGuide,
            onDeleteGuide: handleDeleteGuideClick,
            uploading,
            activeGuideId,
          }),

          h('main', { className: 'lr-main' },
            !state && !loadError ? h('div', { className: 'lr-loading' }, h(Spinner, { size: 20 }), '正在打开文献库…') : null,
            !state && loadError ? h('div', { className: 'lr-crash' },
              h('div', { className: 'lr-crash-mark' }, '!'),
              h('h2', null, '文献库没有加载成功'),
              h('p', null, loadError),
              h('div', { className: 'lr-crash-actions' },
                h(Button, { variant: 'primary', onClick: () => window.location.reload() }, '重新加载'),
                h(Button, { variant: 'ghost', onClick: () => { setLoadError(''); api('/state').then((next) => { setState(next); if (next.documents[0]) selectDoc(next.documents[0].id) }).catch((error) => setLoadError(error.message)) } }, '重试'))) : null,
            state && !activeDoc && mode !== 'guide' ? h(EmptyState, {
              hasDocs: state.documents.length > 0,
              uploading,
              onUpload: () => document.querySelector('.lr-upload-mini')?.click(),
            }) : null,
            mode === 'guide' && activeGuide && !(showJob && job?.mode === 'guide') ? h(GuideView, {
              guide: activeGuide,
              onDelete: () => setModal({ type: 'confirm-delete-guide', guide: activeGuide }),
            }) : null,
            mode === 'guide' && showJob && job?.mode === 'guide' ? h('div', { className: 'lr-guide-job' },
              h('div', { className: 'lr-job-wrap' },
                h(JobProgress, { job, onCancel: cancelJob }))) : null,
            activeDoc && mode !== 'guide' ? h(React.Fragment, null,
              h('div', { className: 'lr-doc-top' },
                h('div', { className: 'lr-doc-heading' },
                  h('div', { className: 'lr-doc-kicker' }, h(IconFile, { size: 13 }), activeDoc.filename || 'PDF'),
                  h('h1', { title: activeDoc.title }, activeDoc.title),
                  h('div', { className: 'lr-doc-meta' },
                    h('span', null, `${activeDoc.pages || '?'} 页`),
                    h('span', null, fmtBytes(activeDoc.size)),
                    h('span', null, `导入于 ${fmtDate(activeDoc.addedAt)}`),
                    activeDoc.status === 'error' ? h('span', { className: 'lr-error-text' }, activeDoc.error) : null)),
                h('div', { className: 'lr-doc-actions' },
                  h(IconButton, { title: '编辑文献信息', onClick: () => setModal({ type: 'doc', doc: activeDoc }) }, h(IconEdit)),
                  h(IconButton, {
                    title: rightOpen ? '收起原文窗口' : '打开原文窗口',
                    active: rightOpen,
                    onClick: () => setRightOpen((value) => !value),
                  }, h(IconRight)),
                  mode === 'summary' ? h(IconButton, { title: '保存当前总结', onClick: saveCurrent }, h(IconSave)) : null)),
              h('div', { className: 'lr-modebar' },
                h('div', { className: 'lr-tabs' },
                  h('button', {
                    type: 'button', className: cx(mode === 'summary' && 'is-active'),
                    onClick: () => setMode('summary'),
                  }, h(IconSpark, { size: 15 }), '精简内容总结',
                    detail?.summary ? h('span', { className: 'lr-tab-dot' }) : null),
                  h('button', {
                    type: 'button', className: cx(mode === 'selection' && 'is-active'),
                    onClick: () => setMode('selection'),
                  }, h(IconTranslate, { size: 15 }), '划词翻译',
                    selectionRequest ? h('span', { className: 'lr-tab-dot' }) : null)),
                h('div', { className: 'lr-mode-actions' },
                  mode === 'summary' ? h(React.Fragment, null,
                    h(Switch, { checked: locateEnabled, onChange: toggleLocate, label: '悬停定位', title: '鼠标悬停总结时自动定位到 PDF 原文' }),
                    h(Button, {
                      variant: 'primary',
                      icon: h(IconSpark, { size: 14 }),
                      onClick: () => startGeneration(),
                      disabled: generating || activeDoc.status !== 'ready',
                    }, detail?.summary ? '重新生成总结' : '生成总结'))
                    : h('span', { className: 'lr-mode-hint' }, '在右侧 PDF 中划选文字，自动翻译'))),

              showJob && job?.mode === mode ? h('div', { className: 'lr-job-wrap' },
                h(JobProgress, { job, onCancel: cancelJob })) : null,

              activeDoc.status === 'extracting' ? h('div', { className: 'lr-extracting' },
                h(Spinner, { size: 20 }), '正在解析 PDF 文本与图片…') : null,
              activeDoc.status === 'error' ? h('div', { className: 'lr-error-panel' },
                h('strong', null, 'PDF 解析失败'),
                h('p', null, activeDoc.error || '未知错误'),
                h(Button, {
                  variant: 'primary',
                  onClick: async () => {
                    try {
                      const next = await api('/document', { method: 'POST', body: JSON.stringify({ action: 'reextract', id: activeDoc.id }) })
                      setState(next)
                      await loadDoc(activeDoc.id)
                    } catch (error) { showToast(error.message, 'error') }
                  },
                }, '重新解析')) : null,

              loadingDoc ? h('div', { className: 'lr-loading is-doc' }, h(Spinner, { size: 20 }), '正在读取文献…') : null,
              !loadingDoc && activeDoc.status === 'ready' && mode === 'summary' && !detail?.summary && !showJob
                ? h('div', { className: 'lr-generate-empty' },
                  h('div', { className: 'lr-generate-icon' }, h(IconSpark, { size: 28 })),
                  h('h2', null, '还没有精简总结'),
                  h('p', null, 'Agent 会通读全文，输出研究总结、实验逻辑步骤、重要参数与结果，并把每句实验描述对应到原文位置。'),
                  h('div', { className: 'lr-generate-actions' },
                    h(Button, { variant: 'primary', onClick: () => startGeneration() }, '生成精简总结'),
                    h(Button, { variant: 'ghost', onClick: () => setMode('selection') }, '去划词翻译')))
                : null,
              !loadingDoc && activeDoc.status === 'ready' && mode === 'summary' && detail?.summary
                ? h(SummaryView, { summary: detail.summary, content, onSource: showSource, locateEnabled })
                : null,
              !loadingDoc && activeDoc.status === 'ready' && mode === 'selection'
                ? h(SelectionTranslationView, {
                  selection: selectionRequest,
                  doc: activeDoc,
                  showToast,
                  autoTranslate: autoSelectionTranslate,
                  onToggleAuto: toggleAutoSelectionTranslate,
                })
                : null) : null),

          rightOpen && activeDoc && mode !== 'guide' ? h(SourcePane, {
            doc: activeDoc,
            content,
            highlight: locateEnabled ? highlight : null,
            onClose: () => setRightOpen(false),
            sourceWidth,
            onSourceWidth: setSourceWidth,
            showToast,
            onTranslateSelection: openSelectionTranslation,
            autoTranslateSelection: autoSelectionTranslate,
          }) : null),

        !chatOpen ? h('button', {
          type: 'button', className: 'lr-chat-fab', onClick: () => setChatOpen(true),
          title: '向 DSH Agent 提问',
        }, h(IconMessage, { size: 18 }), '问问 Agent') : null,
        chatOpen ? h(ChatPanel, {
          key: activeDoc?.id || 'library',
          doc: activeDoc || null,
          onClose: () => setChatOpen(false),
          showToast,
        }) : null,

        dragOver ? h('div', { className: 'lr-drag-overlay' },
          h('div', { className: 'lr-drag-card' },
            h(IconUpload, { size: 38 }),
            h('strong', null, '松开鼠标，导入 PDF'),
            h('span', null, `将保存到「${(state?.folders || []).find((folder) => folder.id === targetFolder)?.name || '默认文献库'}」`))) : null,

        toast ? h('div', { className: cx('lr-toast', `is-${toast.tone}`) },
          toast.tone === 'error' ? h(IconX, { size: 15 }) : h(IconCheck, { size: 15 }),
          h('span', null, toast.text)) : null,

        modal?.type === 'folder' ? h(FolderModal, {
          folder: modal.folder,
          onClose: () => setModal(null),
          onSaved: afterLibraryChange,
          showToast,
        }) : null,
        modal?.type === 'doc' ? h(DocModal, {
          doc: modal.doc,
          folders: state?.folders || [],
          onClose: () => setModal(null),
          onSaved: afterLibraryChange,
          showToast,
        }) : null,
        modal?.type === 'settings' ? h(SettingsModal, {
          settings,
          onClose: () => setModal(null),
          onSaved: afterSettingsChange,
          pickDirectory,
          showToast,
        }) : null,
        modal?.type === 'confirm-delete-guide' ? h(Modal, {
          title: '删除学习资料',
          subtitle: '删除后无法恢复。文献本身不会被删除。',
          onClose: () => setModal(null),
        },
          h('p', { className: 'lr-confirm-text' }, `确定删除「${modal.guide.title}」？`),
          h('div', { className: 'lr-modal-actions' },
            h('span'),
            h('div', { className: 'lr-actions-right' },
              h(Button, { variant: 'ghost', onClick: () => setModal(null) }, '取消'),
              h(Button, {
                variant: 'danger',
                onClick: async () => {
                  const guide = modal.guide
                  setModal(null)
                  await deleteGuide(guide)
                },
              }, '删除')))) : null
      )
    }

    /* ---------------------------------------------------------------- */
    /* panel icon                                                        */
    /* ---------------------------------------------------------------- */

    function PanelIcon({ size = 18, active }) {
      return h('span', {
        style: {
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: size, height: size, color: active ? 'var(--dsw-alias-brand-primary)' : 'currentColor',
        },
      }, h(IconBook, { size }))
    }

    class ReaderErrorBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null }
      }
      static getDerivedStateFromError(error) {
        return { error }
      }
      render() {
        if (this.state.error) {
          return h('div', { className: 'lr-crash' },
            h('div', { className: 'lr-crash-mark' }, '!'),
            h('h2', null, '文献阅读界面出错了'),
            h('p', null, this.state.error?.message || String(this.state.error)),
            h('div', { className: 'lr-crash-actions' },
              h(Button, { variant: 'primary', onClick: () => window.location.reload() }, '重新加载插件')))
        }
        return this.props.children
      }
    }

    /* ---------------------------------------------------------------- */
    /* CSS                                                               */
    /* ---------------------------------------------------------------- */

    const CSS = `
.lr-root{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:"Segoe UI","PingFang SC","Microsoft YaHei",system-ui,sans-serif;font-size:14px;line-height:1.55;overflow:hidden;position:relative}
.lr-root *{box-sizing:border-box}
.lr-root button,.lr-root input,.lr-root textarea,.lr-root select{font:inherit;color:inherit}
.lr-root.is-focus .lr-top-stat{display:none}
.lr-root.is-focus .lr-main{flex:1}
.lr-topbar{height:56px;flex:0 0 56px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-base))}
.lr-brand{display:flex;align-items:center;gap:11px}
.lr-brand-mark{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;box-shadow:0 4px 12px rgba(37,99,235,.25)}
.lr-brand>div{display:flex;flex-direction:column;line-height:1.15}
.lr-brand strong{font-size:14px;letter-spacing:.2px}
.lr-brand span{font-size:10.5px;color:var(--dsw-alias-label-secondary);letter-spacing:.6px;text-transform:uppercase}
.lr-top-actions{display:flex;align-items:center;gap:14px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.lr-agent-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-1)}
.lr-live-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-success-primary) 18%,transparent)}
.lr-top-stat{white-space:nowrap}
.lr-body{flex:1;min-height:0;display:flex}
.lr-library{width:264px;flex:0 0 264px;min-height:0;display:flex;flex-direction:column;background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-base));border-right:1px solid var(--dsw-alias-border-l1)}
.lr-lib-head{height:64px;flex:0 0 64px;display:flex;align-items:center;justify-content:space-between;padding:0 14px 0 18px}
.lr-lib-kicker{font-size:9.5px;letter-spacing:1.4px;color:var(--dsw-alias-label-secondary);font-weight:600}
.lr-lib-head h2{margin:1px 0 0;font-size:16px;font-weight:650;letter-spacing:.2px}
.lr-upload-mini{margin:0 14px 10px;flex:0 0 38px;display:flex;align-items:center;gap:8px;padding:0 11px;border:1px dashed var(--dsw-alias-border-l2);border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:12.5px;text-align:left;transition:all .15s}
.lr-upload-mini:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1)}
.lr-upload-mini.is-busy{opacity:.8;cursor:wait}
.lr-upload-mini kbd{margin-left:auto;font-size:9.5px;padding:1px 5px;border:1px solid var(--dsw-alias-border-l1);border-radius:4px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary)}
.lr-lib-scroll{flex:1;min-height:0;overflow:auto;padding:2px 8px 14px}
.lr-lib-scroll::-webkit-scrollbar,.lr-main::-webkit-scrollbar,.lr-source-scroll::-webkit-scrollbar,.lr-chat-scroll::-webkit-scrollbar{width:9px;height:9px}
.lr-lib-scroll::-webkit-scrollbar-thumb,.lr-main::-webkit-scrollbar-thumb,.lr-source-scroll::-webkit-scrollbar-thumb,.lr-chat-scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l1);border-radius:6px;border:2px solid transparent;background-clip:content-box}
.lr-folder{margin:1px 0 3px;border-radius:9px;padding:1px 0}
.lr-folder.is-target{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 5%,transparent)}
.lr-folder-row{display:flex;align-items:center;border-radius:8px;min-height:33px}
.lr-folder-row:hover{background:var(--dsw-alias-bg-layer-1)}
.lr-folder-main{flex:1;min-width:0;display:flex;align-items:center;gap:6px;padding:5px 5px 5px 7px;border:0;background:transparent;cursor:pointer;text-align:left}
.lr-folder-main.is-static{cursor:default}
.lr-chevron{display:inline-flex;color:var(--dsw-alias-label-secondary);width:14px}
.lr-folder-icon{display:inline-flex;color:var(--dsw-alias-label-secondary)}
.lr-folder-name{flex:1;min-width:0;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lr-folder-count{font-size:10.5px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-radius:999px;padding:0 6px;min-width:18px;text-align:center}
.lr-row-action{opacity:0;flex:0 0 auto;margin-right:3px}
.lr-folder-row:hover .lr-row-action,.lr-doc-row:hover .lr-row-action,.lr-guide-row:hover .lr-row-action{opacity:1}
.lr-folder-desc{margin:0 8px 6px 27px;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.lr-doc-list{display:flex;flex-direction:column;gap:1px;padding:1px 0 4px}
.lr-doc-row{display:flex;gap:7px;align-items:flex-start;padding:7px 6px 7px 8px;margin-left:13px;border-radius:8px;cursor:pointer;border:1px solid transparent}
.lr-doc-row:hover{background:var(--dsw-alias-bg-layer-1)}
.lr-doc-row.is-active{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,transparent)}
.lr-doc-row input[type=checkbox]{width:13px;height:13px;margin:3px 0 0;accent-color:var(--dsw-alias-brand-primary);flex:0 0 auto;cursor:pointer}
.lr-doc-row-main{flex:1;min-width:0}
.lr-doc-row-title{font-size:12.2px;line-height:1.4;font-weight:520;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lr-doc-row-meta{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-top:3px;font-size:10px;color:var(--dsw-alias-label-secondary)}
.lr-mini-tag{font-size:9px;line-height:1.2;padding:1px 4px;border-radius:3px;background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);color:var(--dsw-alias-state-success-primary)}
.lr-mini-tag.is-blue{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 11%,transparent);color:var(--dsw-alias-brand-primary)}
.lr-mini-tag.is-error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary)}
.lr-folder-empty{margin:2px 0 4px 27px;padding:7px;border:1px dashed var(--dsw-alias-border-l1);border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:10.5px;cursor:pointer;text-align:left}
.lr-folder-empty:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.lr-guides{margin-top:12px;border-top:1px solid var(--dsw-alias-border-l1);padding-top:9px}
.lr-guide-row{display:flex;gap:7px;align-items:flex-start;padding:7px;margin-left:4px;border-radius:8px;cursor:pointer}
.lr-guide-row:hover{background:var(--dsw-alias-bg-layer-1)}
.lr-guide-row.is-active{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent)}
.lr-guide-icon{display:inline-flex;color:var(--dsw-alias-brand-primary);margin-top:2px}
.lr-selection-bar{display:none;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.lr-selection-bar.is-visible{display:flex}
.lr-selection-count{flex:1;display:flex;align-items:center;gap:5px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.lr-main{flex:1;min-width:0;min-height:0;overflow:auto;position:relative;background:var(--dsw-alias-bg-base)}
.lr-main::-webkit-scrollbar{width:10px}
.lr-doc-top{padding:22px 28px 0;max-width:980px;margin:0 auto;display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.lr-doc-heading{min-width:0}
.lr-doc-kicker{display:flex;align-items:center;gap:5px;font-size:10px;letter-spacing:.2px;color:var(--dsw-alias-label-secondary);margin-bottom:4px;max-width:620px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lr-doc-heading h1{font-size:20px;line-height:1.32;font-weight:680;margin:0 0 7px;letter-spacing:-.25px;overflow-wrap:anywhere}
.lr-doc-meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.lr-doc-meta span+span:before{content:"";display:inline-block;width:2px;height:2px;border-radius:50%;background:currentColor;opacity:.45;margin-right:12px;vertical-align:middle}
.lr-error-text{color:var(--dsw-alias-state-error-primary)}
.lr-doc-actions{display:flex;gap:2px;flex:0 0 auto}
.lr-icon-btn{width:30px;height:30px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;text-decoration:none;flex:0 0 auto}
.lr-icon-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.lr-icon-btn.is-active{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-brand-primary)}
.lr-icon-btn.is-danger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary)}
.lr-modebar{position:sticky;top:0;z-index:5;margin:16px auto 0;max-width:980px;padding:8px 28px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:color-mix(in srgb,var(--dsw-alias-bg-base) 92%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--dsw-alias-border-l1)}
.lr-tabs{display:flex;gap:2px;padding:3px;background:var(--dsw-alias-bg-layer-2);border-radius:9px}
.lr-tabs button{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:6px 11px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:560;white-space:nowrap}
.lr-tabs button.is-active{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:0 1px 3px rgba(0,0,0,.09)}
.lr-tab-dot{width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-state-success-primary)}
.lr-mode-actions{display:flex;gap:7px;align-items:center}
.lr-btn{display:inline-flex;align-items:center;gap:6px;height:31px;padding:0 12px;border:1px solid transparent;border-radius:7px;cursor:pointer;font-size:12px;font-weight:540;white-space:nowrap;transition:background .15s,border-color .15s,opacity .15s}
.lr-btn:disabled{opacity:.45;cursor:not-allowed}
.lr-icon-btn:disabled{opacity:.35;cursor:not-allowed}
.lr-btn.is-primary{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);border-color:var(--dsw-alias-brand-primary)}
.lr-btn.is-primary:hover:not(:disabled){filter:brightness(1.06)}
.lr-btn.is-soft{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent)}
.lr-btn.is-soft:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent)}
.lr-btn.is-ghost{background:transparent;border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}
.lr-btn.is-ghost:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.lr-btn.is-danger{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 20%,transparent)}
.lr-btn.is-danger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 16%,transparent)}
.lr-job-wrap{max-width:980px;margin:14px auto 0;padding:0 28px}
.lr-job{border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-brand-primary) 4%,var(--dsw-alias-bg-layer-1));border-radius:11px;padding:13px 15px}
.lr-job.is-error{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 4%,var(--dsw-alias-bg-layer-1))}
.lr-job-head{display:flex;align-items:center;gap:10px}
.lr-job-titles{flex:1;display:flex;flex-direction:column;min-width:0}
.lr-job-titles strong{font-size:12.5px}
.lr-job-titles span{font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.lr-job-dot{width:9px;height:9px;border-radius:50%;background:var(--dsw-alias-state-error-primary);flex:0 0 auto}
.lr-job-bar{height:3px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);margin:9px 0 8px;overflow:hidden}
.lr-job-bar span{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,#3b82f6,#60a5fa);transition:width .7s ease}
.lr-job-partial{margin:0;white-space:pre-wrap;word-break:break-word;max-height:150px;overflow:auto;font-family:ui-monospace,Consolas,monospace;font-size:10.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:8px}
.lr-job-hint{font-size:11px;color:var(--dsw-alias-label-secondary)}
.lr-job-error{font-size:11.5px;color:var(--dsw-alias-state-error-primary);margin:6px 0}
.lr-spinner{display:inline-block;border:2px solid color-mix(in srgb,currentColor 22%,transparent);border-top-color:currentColor;border-radius:50%;animation:lr-spin .7s linear infinite;flex:0 0 auto}
@keyframes lr-spin{to{transform:rotate(360deg)}}
.lr-loading{height:100%;min-height:240px;display:flex;align-items:center;justify-content:center;gap:9px;color:var(--dsw-alias-label-secondary);font-size:12px}
.lr-loading.is-doc{height:180px;min-height:0}
.lr-crash{max-width:520px;margin:12vh auto 0;padding:24px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,var(--dsw-alias-border-l1));border-radius:12px;background:var(--dsw-alias-bg-layer-1);text-align:center}
.lr-crash-mark{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;margin:0 auto 10px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary);font-weight:800;font-size:20px}
.lr-crash h2{font-size:16px;margin:0 0 6px}
.lr-crash p{font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);word-break:break-word;margin:0 0 14px}
.lr-crash-actions{display:flex;gap:8px;justify-content:center}
.lr-extracting{max-width:980px;margin:24px auto;padding:24px 34px;display:flex;align-items:center;gap:10px;color:var(--dsw-alias-label-secondary);font-size:12.5px}
.lr-error-panel{max-width:980px;margin:24px auto;padding:20px 34px}
.lr-error-panel strong{color:var(--dsw-alias-state-error-primary);font-size:14px}
.lr-error-panel p{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6}
.lr-doc-article{max-width:900px;margin:0 auto;padding:26px 28px 90px}
.lr-doc-hero{padding-bottom:22px;border-bottom:1px solid var(--dsw-alias-border-l1);margin-bottom:8px}
.lr-doc-hero.is-compact{padding-bottom:16px}
.lr-doc-hero h1{font-size:27px;line-height:1.28;letter-spacing:-.5px;font-weight:720;margin:0 0 7px;overflow-wrap:anywhere}
.lr-doc-en{font-size:12.5px;line-height:1.5;color:var(--dsw-alias-label-secondary);font-style:italic;margin-bottom:10px}
.lr-one-line{font-size:13.5px;line-height:1.7;color:var(--dsw-alias-label-secondary);margin:11px 0 14px;max-width:760px}
.lr-doc-badges{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}
.lr-doc-badges span{display:inline-flex;align-items:center;gap:5px;font-size:10px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:3px 8px}
.lr-guide-kicker{display:flex;align-items:center;gap:6px;font-size:10.5px;letter-spacing:.7px;color:var(--dsw-alias-brand-primary);text-transform:uppercase;margin-bottom:8px}
.lr-section{padding-top:27px}
.lr-sec-title{display:flex;gap:13px;align-items:flex-start;margin-bottom:16px}
.lr-sec-index{font-size:10px;font-weight:700;letter-spacing:1px;color:var(--dsw-alias-brand-primary);padding-top:4px;font-variant-numeric:tabular-nums}
.lr-sec-title h2{font-size:18px;line-height:1.3;font-weight:680;margin:0;letter-spacing:-.2px}
.lr-sec-title div>span{font-size:9px;letter-spacing:1.5px;color:var(--dsw-alias-label-secondary);font-weight:600}
.lr-summary-grid{display:grid;grid-template-columns:1fr;gap:9px}
.lr-info-card{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:9px;padding:13px 14px}
.lr-info-card.is-wide{grid-column:1/-1;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 3%,var(--dsw-alias-bg-layer-1));border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,var(--dsw-alias-border-l1))}
.lr-info-label{display:block;font-size:10px;letter-spacing:.8px;color:var(--dsw-alias-brand-primary);font-weight:650;margin-bottom:5px}
.lr-info-card p{margin:0;font-size:12.5px;line-height:1.72;color:var(--dsw-alias-label-primary)}
.lr-subblock{margin-top:18px}
.lr-subhead{display:flex;align-items:center;justify-content:space-between;font-size:11px;letter-spacing:.5px;color:var(--dsw-alias-label-secondary);font-weight:640;margin-bottom:8px;text-transform:uppercase}
.lr-subhead span{text-transform:none;font-weight:400;letter-spacing:0;font-size:10px;opacity:.8}
.lr-findings{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}
.lr-findings li{position:relative;padding-left:16px;font-size:12.8px;line-height:1.7}
.lr-findings li:before{content:"";position:absolute;left:2px;top:9px;width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-brand-primary);opacity:.7}
.lr-cite{display:inline;border:0;background:transparent;color:inherit;text-align:left;padding:0;cursor:pointer;font:inherit;line-height:inherit;border-bottom:1px dotted color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent);transition:background .12s}
.lr-cite:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent);border-bottom-color:var(--dsw-alias-brand-primary)}
.lr-cite-page{display:inline-block;margin-left:5px;font-size:9px;line-height:1.4;padding:0 4px;border-radius:3px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);color:var(--dsw-alias-brand-primary);border:0;font-weight:600;vertical-align:1px}
.lr-cite-plain{font:inherit}
.lr-chips{display:flex;gap:6px;flex-wrap:wrap}
.lr-chip{font-size:11px;line-height:1.45;padding:4px 9px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}
.lr-limits{margin:0;padding-left:17px;font-size:12px;line-height:1.7;color:var(--dsw-alias-label-secondary)}
.lr-timeline{display:flex;flex-direction:column;gap:0}
.lr-step{display:flex;gap:13px;min-height:0}
.lr-step-rail{width:26px;flex:0 0 26px;display:flex;flex-direction:column;align-items:center;padding-top:1px}
.lr-step-num{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,var(--dsw-alias-bg-layer-1));border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 25%,var(--dsw-alias-border-l1));color:var(--dsw-alias-brand-primary);font-size:10px;font-weight:700;z-index:1}
.lr-step-line{flex:1;width:1px;background:var(--dsw-alias-border-l1);margin:4px 0}
.lr-step-card{flex:1;min-width:0;padding:0 0 19px;cursor:default}
.lr-step-card:hover .lr-step-head h3{color:var(--dsw-alias-brand-primary)}
.lr-step-head{display:flex;align-items:baseline;gap:9px;justify-content:space-between}
.lr-step-head h3{margin:0;font-size:14px;line-height:1.4;font-weight:650}
.lr-step-card p{margin:4px 0 0;font-size:12.5px;line-height:1.72;color:var(--dsw-alias-label-primary)}
.lr-step-purpose{margin-top:8px;padding:8px 11px;border-left:2px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 35%,transparent);background:var(--dsw-alias-bg-layer-1);border-radius:0 6px 6px 0}
.lr-step-purpose span{font-size:9.5px;letter-spacing:.5px;color:var(--dsw-alias-label-secondary);font-weight:650}
.lr-step-purpose p{margin:1px 0 0;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.lr-table-block{margin-top:15px}
.lr-table-wrap{overflow-x:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}
.lr-table{width:100%;border-collapse:collapse;font-size:11.5px;min-width:480px}
.lr-table th{text-align:left;font-size:9.5px;letter-spacing:.6px;color:var(--dsw-alias-label-secondary);font-weight:650;padding:8px 11px;background:var(--dsw-alias-bg-layer-2);border-bottom:1px solid var(--dsw-alias-border-l1);white-space:nowrap}
.lr-table td{padding:8px 11px;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 65%,transparent);vertical-align:top;line-height:1.55}
.lr-table tr:last-child td{border-bottom:0}
.lr-table tbody tr:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 4%,transparent)}
.lr-table td.is-strong{font-weight:600;white-space:nowrap}
.lr-value{font-family:ui-monospace,Consolas,monospace;font-size:10.5px;background:var(--dsw-alias-bg-layer-2);padding:1px 5px;border-radius:4px;border:1px solid var(--dsw-alias-border-l1);white-space:nowrap}
.lr-terms{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}
.lr-term{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:9px 11px;background:var(--dsw-alias-bg-layer-1)}
.lr-term-zh{font-size:12px;font-weight:640}
.lr-term-en{font-size:10px;color:var(--dsw-alias-brand-primary);font-style:italic;margin-top:1px}
.lr-term-note{font-size:10.5px;color:var(--dsw-alias-label-secondary);margin-top:3px;line-height:1.5}
.lr-raw-wrap{margin-top:22px}
.lr-raw-hint{font-size:11px;color:var(--dsw-alias-state-warn-primary)}
.lr-raw{white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.7;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:13px;max-height:600px;overflow:auto}
.lr-doc-foot{display:flex;align-items:center;gap:6px;margin-top:32px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l1);font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.lr-text-btn{margin-left:auto;border:0;background:transparent;font-size:10.5px;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:2px 4px}
.lr-text-btn.is-danger:hover{color:var(--dsw-alias-state-error-primary)}
.lr-translation{font-size:14px;line-height:1.95;color:var(--dsw-alias-label-primary);padding-top:9px}
.lr-translation .lr-markdown p{margin:0 0 14px}
.lr-figures{padding-top:34px}
.lr-figure-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.lr-figure{margin:0;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.lr-figure img{display:block;width:100%;max-height:360px;object-fit:contain;background:var(--dsw-alias-bg-layer-2);cursor:zoom-in}
.lr-figure figcaption{padding:8px 10px;font-size:10.5px;line-height:1.55;color:var(--dsw-alias-label-secondary);border-top:1px solid var(--dsw-alias-border-l1)}
.lr-figure-page{display:block;font-size:9px;letter-spacing:.5px;color:var(--dsw-alias-brand-primary);font-weight:650;margin-bottom:2px}
.lr-markdown{font-size:13.5px;line-height:1.85}
.lr-markdown.is-compact{font-size:12px;line-height:1.7}
.lr-md-h{margin:22px 0 9px;line-height:1.35;letter-spacing:-.2px}
h1.lr-md-h{font-size:23px;font-weight:720}
h2.lr-md-h{font-size:18px;font-weight:680}
h3.lr-md-h{font-size:15px;font-weight:650}
h4.lr-md-h,h5.lr-md-h,h6.lr-md-h{font-size:13.5px;font-weight:650}
.lr-markdown.is-compact .lr-md-h{margin:14px 0 5px}
.lr-markdown p{margin:0 0 11px}
.lr-md-list{margin:0 0 12px;padding-left:21px}
.lr-md-list li{margin:3px 0}
.lr-markdown blockquote{margin:10px 0;padding:8px 13px;border-left:3px solid var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1);border-radius:0 6px 6px 0;color:var(--dsw-alias-label-secondary);font-size:12.5px}
.lr-markdown code{font-family:ui-monospace,Consolas,monospace;font-size:.88em;background:var(--dsw-alias-bg-layer-2);padding:1px 4px;border-radius:4px}
.lr-md-pre{white-space:pre-wrap;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:12px;font-size:11px;line-height:1.6;overflow:auto}
.lr-md-table-wrap{overflow-x:auto;margin:10px 0 15px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px}
.lr-md-table{width:100%;border-collapse:collapse;font-size:11.5px;min-width:420px}
.lr-md-table th{background:var(--dsw-alias-bg-layer-2);text-align:left;padding:7px 9px;font-size:10px;letter-spacing:.4px;border-bottom:1px solid var(--dsw-alias-border-l1);white-space:nowrap}
.lr-md-table td{padding:7px 9px;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 60%,transparent);vertical-align:top}
.lr-md-table tr:last-child td{border-bottom:0}
.lr-doc-hero+.lr-guide-body{padding-top:12px}
.lr-guide-body{padding-top:6px}
.lr-generate-empty{max-width:620px;margin:10vh auto 0;padding:0 34px;text-align:center}
.lr-generate-icon{width:56px;height:56px;border-radius:16px;display:grid;place-items:center;margin:0 auto 14px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-brand-primary);border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 20%,var(--dsw-alias-border-l1))}
.lr-generate-icon.is-blue{background:color-mix(in srgb,#0ea5e9 10%,var(--dsw-alias-bg-layer-1));color:#0284c7;border-color:color-mix(in srgb,#0ea5e9 25%,var(--dsw-alias-border-l1))}
.lr-generate-empty h2{font-size:18px;font-weight:680;margin:0 0 7px}
.lr-generate-empty p{font-size:12.5px;line-height:1.75;color:var(--dsw-alias-label-secondary);margin:0 auto 18px;max-width:480px}
.lr-generate-actions{display:flex;gap:8px;justify-content:center}
.lr-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;text-align:center;overflow:auto}
.lr-empty-art{position:relative;margin-bottom:16px}
.lr-empty-book{width:78px;height:78px;border-radius:22px;display:grid;place-items:center;background:linear-gradient(135deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 15%,var(--dsw-alias-bg-layer-1)),var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-brand-primary);border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,var(--dsw-alias-border-l1));box-shadow:0 10px 30px rgba(37,99,235,.1)}
.lr-empty-spark{position:absolute;right:-9px;top:-7px;width:31px;height:31px;border-radius:50%;display:grid;place-items:center;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);color:#f59e0b}
.lr-empty-title{font-size:23px;font-weight:700;letter-spacing:-.4px;margin:0 0 8px}
.lr-empty-sub{font-size:12.5px;line-height:1.75;color:var(--dsw-alias-label-secondary);max-width:520px;margin:0 0 20px}
.lr-dropzone{width:min(520px,100%);min-height:118px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:1.5px dashed color-mix(in srgb,var(--dsw-alias-brand-primary) 35%,var(--dsw-alias-border-l2));border-radius:14px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 3%,transparent);color:var(--dsw-alias-brand-primary);cursor:pointer;padding:18px}
.lr-dropzone strong{font-size:13px;font-weight:600}
.lr-dropzone span{font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.lr-dropzone:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 6%,transparent)}
.lr-empty-features{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:26px;max-width:760px;width:100%}
.lr-feature{display:flex;gap:8px;text-align:left;padding:11px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);min-width:0}
.lr-feature-icon{width:26px;height:26px;border-radius:7px;display:grid;place-items:center;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary);flex:0 0 auto}
.lr-feature strong{display:block;font-size:10.5px;margin-bottom:2px}
.lr-feature span{display:block;font-size:9.5px;line-height:1.45;color:var(--dsw-alias-label-secondary)}
.lr-source{width:38%;min-width:320px;max-width:none;flex:0 0 38%;display:flex;flex-direction:column;border-left:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);min-height:0;position:relative}
.lr-source-resizer{position:absolute;left:-4px;top:0;bottom:0;width:8px;cursor:col-resize;z-index:8;background:transparent}
.lr-source-resizer:hover,.lr-source-resizer:active{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 35%,transparent)}
.lr-source-head{height:48px;flex:0 0 48px;display:flex;align-items:center;justify-content:space-between;padding:0 10px 0 14px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.lr-source-title{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:620;min-width:0}
.lr-source-page{font-size:9px;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);padding:1px 5px;border-radius:4px;margin-left:2px}
.lr-source-actions{display:flex;gap:1px;align-items:center}
.lr-source-tabs{height:35px;flex:0 0 35px;display:flex;gap:2px;padding:4px 10px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.lr-source-tabs button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font-size:11px;padding:3px 9px;border-radius:5px;cursor:pointer}
.lr-source-tabs button:hover{background:var(--dsw-alias-bg-layer-2)}
.lr-source-tabs button.is-active{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.lr-source-scroll{flex:1;min-height:0;overflow:auto;padding:14px 14px 60px;scroll-behavior:smooth}
.lr-source-loading{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:11.5px;padding:20px 0}
.lr-page-card{margin-bottom:14px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);overflow:hidden}
.lr-page-head{display:flex;justify-content:space-between;padding:5px 10px;background:var(--dsw-alias-bg-layer-2);border-bottom:1px solid var(--dsw-alias-border-l1);font-size:9.5px;color:var(--dsw-alias-label-secondary);letter-spacing:.5px}
.lr-source-block{margin:0;padding:7px 11px;font-size:11.5px;line-height:1.7;color:var(--dsw-alias-label-primary);border-left:2px solid transparent;transition:background .16s,border-color .16s,box-shadow .16s;overflow-wrap:anywhere}
.lr-source-block+.lr-source-block{border-top:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 50%,transparent)}
.lr-source-block.is-heading{font-weight:650;font-size:12px;padding-top:9px;padding-bottom:5px;color:var(--dsw-alias-label-primary)}
.lr-source-block.is-hit{background:color-mix(in srgb,#f59e0b 17%,transparent);border-left-color:#f59e0b;box-shadow:inset 0 0 0 1px color-mix(in srgb,#f59e0b 25%,transparent)}
.lr-pdf-wrap{flex:1;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-2)}
.lr-pdf-viewer{flex:1;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-2)}
.lr-pdf-toolbar{flex:0 0 38px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.lr-pdf-group{display:flex;align-items:center;gap:1px}
.lr-pdf-btn{width:26px;height:26px}
.lr-pdf-page-input{width:38px;height:24px;text-align:center;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;background:var(--dsw-alias-bg-base);font-size:11px;outline:none}
.lr-pdf-page-input:focus{border-color:var(--dsw-alias-brand-primary)}
.lr-pdf-total,.lr-pdf-zoom{font-size:9.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;min-width:28px;text-align:center;font-variant-numeric:tabular-nums}
.lr-pdf-stage{flex:1;min-height:0;overflow:auto;padding:16px 12px 30px;display:flex;justify-content:center;align-items:flex-start;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 85%,#000 15%)}
.lr-pdf-stage::-webkit-scrollbar{width:9px;height:9px}
.lr-pdf-stage::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l1);border-radius:6px;border:2px solid transparent;background-clip:content-box}
.lr-pdf-canvas{background:#fff;border-radius:2px;box-shadow:0 8px 30px rgba(0,0,0,.32);max-width:100%;height:auto;flex:0 0 auto}
.lr-pdf-status{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:11px;padding:30px 10px;text-align:center}
.lr-pdf-status.is-error{color:var(--dsw-alias-state-error-primary)}
.lr-pdf-status a{color:var(--dsw-alias-brand-primary);font-size:11px}
.lr-source.is-pdf-full{position:fixed;inset:14px;width:auto;max-width:none;z-index:90;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 28px 90px rgba(0,0,0,.5);overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.lr-setting-block{margin-top:14px;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base)}
.lr-setting-label{font-size:9.5px;letter-spacing:.6px;color:var(--dsw-alias-label-secondary);font-weight:650;text-transform:uppercase;margin-bottom:5px}
.lr-path{display:block;font-family:ui-monospace,Consolas,monospace;font-size:10.5px;line-height:1.6;word-break:break-all;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:7px 8px;color:var(--dsw-alias-label-primary)}
.lr-setting-note{font-size:10px;line-height:1.55;color:var(--dsw-alias-label-secondary);margin-top:7px}
.lr-setting-warn{font-size:10px;line-height:1.55;color:var(--dsw-alias-state-warn-primary);margin-top:5px}
.lr-setting-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
.lr-guide-job{padding-top:4px}
.lr-pdf-scroll{flex:1;min-height:0;overflow:auto;padding:16px 14px 50px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 88%,#000 12%);scroll-behavior:smooth;scrollbar-gutter:stable}
.lr-pdf-scroll::-webkit-scrollbar{width:10px}
.lr-pdf-scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l1);border-radius:6px;border:2px solid transparent;background-clip:content-box}
.lr-pdf-page-wrap{position:relative;width:100%;display:flex;flex-direction:column;align-items:center;margin:0 auto 22px}
.lr-pdf-page-label{font-size:9px;letter-spacing:.8px;color:var(--dsw-alias-label-secondary);margin:0 0 5px;text-transform:uppercase}
.lr-pdf-page-surface{position:relative;background:#fff;border-radius:2px;box-shadow:0 8px 28px rgba(0,0,0,.3);overflow:hidden;--scale-factor:1;flex:0 0 auto}
.lr-pdf-canvas{display:block;width:100%;height:100%;max-width:none}
.lr-pdf-text-layer{position:absolute;inset:0;overflow:hidden;line-height:1;text-align:initial;z-index:3}
.lr-pdf-text-layer span,.lr-pdf-text-layer br{position:absolute;white-space:pre;color:transparent;transform-origin:0% 0%;cursor:text}
.lr-pdf-text-layer ::selection{background:rgba(59,130,246,.35)}
.lr-pdf-highlight-layer{position:absolute;inset:0;z-index:4;pointer-events:none}
.lr-ann-highlight{position:absolute;border-radius:2px;box-shadow:none;pointer-events:auto;cursor:pointer;transition:filter .15s;mix-blend-mode:multiply}
.lr-ann-highlight.is-active{outline:1.5px solid rgba(37,99,235,.65);outline-offset:1px}
.lr-ann-toolbar{position:absolute;z-index:14;display:flex;align-items:center;gap:1px;padding:3px;border-radius:8px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);box-shadow:0 8px 24px rgba(0,0,0,.28)}
.lr-ann-toolbar button{display:inline-flex;align-items:center;gap:4px;border:0;background:transparent;color:var(--dsw-alias-label-primary);font-size:10.5px;padding:5px 7px;border-radius:5px;cursor:pointer;white-space:nowrap}
.lr-ann-toolbar button:hover{background:var(--dsw-alias-bg-layer-2)}
.lr-ann-toolbar button.is-danger{color:var(--dsw-alias-state-error-primary)}
.lr-ann-colors{display:flex;gap:3px;padding:0 5px;margin-left:2px;border-left:1px solid var(--dsw-alias-border-l1)}
.lr-ann-color{width:14px;height:14px;border-radius:50%;border:1px solid rgba(0,0,0,.18);padding:0!important}
.lr-ann-color.is-active{box-shadow:0 0 0 2px var(--dsw-alias-bg-overlay),0 0 0 3px var(--dsw-alias-brand-primary)}
.lr-selection-preview{position:absolute;border-radius:2px;background:rgba(59,130,246,.30);box-shadow:inset 0 0 0 1px rgba(37,99,235,.35);pointer-events:none}
.lr-ann-highlight:hover{filter:brightness(.92)}
.lr-focus-highlight{position:absolute;background:rgba(245,158,11,.32);box-shadow:0 0 0 2px rgba(245,158,11,.8),0 0 24px rgba(245,158,11,.28);border-radius:2px;pointer-events:none;animation:lr-focus-pulse .9s ease}
@keyframes lr-focus-pulse{0%{box-shadow:0 0 0 2px rgba(245,158,11,.95),0 0 0 8px rgba(245,158,11,.25)}100%{box-shadow:0 0 0 2px rgba(245,158,11,.8),0 0 24px rgba(245,158,11,.28)}}
.lr-ann-pin{position:absolute;right:6px;top:6px;z-index:5;width:20px;height:20px;border-radius:50%;border:1px solid rgba(180,120,0,.45);background:#fef3c7;color:#92400e;display:grid;place-items:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.18)}
.lr-pdf-page-error{position:absolute;inset:0;display:grid;place-items:center;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-state-error-primary);font-size:11px;padding:20px;text-align:center}
.lr-pdf-page-loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 55%,transparent);color:var(--dsw-alias-label-secondary);font-size:10px;z-index:4;pointer-events:none}
.lr-selection-tools{position:absolute;z-index:12;display:flex;gap:2px;padding:3px;border-radius:7px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);box-shadow:0 8px 24px rgba(0,0,0,.25)}
.lr-selection-tools button{display:inline-flex;align-items:center;gap:4px;border:0;background:transparent;color:var(--dsw-alias-label-primary);font-size:10.5px;padding:5px 7px;border-radius:5px;cursor:pointer;white-space:nowrap}
.lr-selection-tools button:hover{background:var(--dsw-alias-bg-layer-2)}
.lr-selection-dot{width:8px;height:8px;border-radius:2px;background:#facc15;display:inline-block}
.lr-note-count{position:absolute;transform:translate(9px,-9px);background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-size:8px;line-height:1;border-radius:999px;padding:2px 4px;font-weight:700}
.lr-source-page.is-hint{background:transparent;color:var(--dsw-alias-label-secondary);font-weight:400;padding:0}
.lr-notes-panel{position:absolute;right:10px;top:48px;bottom:10px;width:min(320px,calc(100% - 20px));z-index:20;display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 16px 50px rgba(0,0,0,.32);overflow:hidden}
.lr-notes-head{display:flex;align-items:center;justify-content:space-between;padding:8px 8px 8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:11.5px}
.lr-notes-empty{font-size:10.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);padding:14px}
.lr-notes-list{flex:1;min-height:0;overflow:auto;padding:4px}
.lr-note-row{display:flex;align-items:flex-start;border-radius:7px}
.lr-note-row:hover{background:var(--dsw-alias-bg-layer-2)}
.lr-note-main{flex:1;min-width:0;display:flex;gap:6px;text-align:left;border:0;background:transparent;padding:7px;border-radius:7px;cursor:pointer;color:inherit}
.lr-note-page{font-size:9px;color:var(--dsw-alias-brand-primary);font-weight:650;padding-top:1px;flex:0 0 auto}
.lr-note-text{font-size:10.5px;line-height:1.45;color:var(--dsw-alias-label-primary);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.lr-note-hint{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-tertiary);margin:-2px 0 10px}
.lr-note-quote{margin:6px 0 4px;padding:8px 10px;border-left:2px solid #facc15;background:color-mix(in srgb,#facc15 8%,var(--dsw-alias-bg-base));border-radius:0 5px 5px 0;font-size:10.5px;line-height:1.55;color:var(--dsw-alias-label-secondary);max-height:100px;overflow:auto}
.lr-paper-type{display:inline-flex;align-items:center;font-size:9.5px;letter-spacing:.6px;color:var(--dsw-alias-brand-primary);border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 24%,var(--dsw-alias-border-l1));border-radius:999px;padding:2px 8px;margin-bottom:9px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 5%,transparent)}
.lr-keywords{display:flex;flex-wrap:wrap;gap:5px;margin:12px 0 0}
.lr-keyword{display:inline-flex;align-items:baseline;gap:4px;font-size:10px;padding:3px 7px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}
.lr-keyword em{font-size:8.5px;color:var(--dsw-alias-label-secondary);font-style:normal}
.lr-keypoints{display:flex;flex-direction:column;gap:8px}
.lr-keypoint{position:relative;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:8px;padding:11px 13px;transition:border-color .15s,background .15s}
.lr-keypoint:hover{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 28%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-brand-primary) 3%,var(--dsw-alias-bg-layer-1))}
.lr-keypoint.is-important{border-left:2px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 65%,transparent)}
.lr-keypoint-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.lr-keypoint-cat{font-size:9px;letter-spacing:.5px;color:var(--dsw-alias-brand-primary);font-weight:650;text-transform:uppercase}
.lr-keypoint h3{margin:3px 0 4px;font-size:13px;font-weight:650;line-height:1.4}
.lr-keypoint p{margin:0;font-size:12.2px;line-height:1.7;color:var(--dsw-alias-label-primary)}
.lr-keypoint-flag{position:absolute;right:10px;bottom:9px;font-size:8px;color:var(--dsw-alias-state-warn-primary);letter-spacing:.5px}
.lr-translation-doc{padding-top:8px}
.lr-translation-part{max-width:780px;margin:0 auto;padding:4px 0}
.lr-translation-part-head{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px}
.lr-trans-part-index{font-size:9px;letter-spacing:1px;color:var(--dsw-alias-brand-primary);font-weight:700;padding-top:5px}
.lr-translation-part-head h2{font-size:19px;line-height:1.35;font-weight:680;margin:0;letter-spacing:-.2px}
.lr-trans-divider{position:relative;max-width:780px;margin:28px auto 26px;border-top:1px dashed var(--dsw-alias-border-l2);text-align:center}
.lr-trans-divider span{position:relative;top:-9px;background:var(--dsw-alias-bg-base);padding:0 12px;font-size:9px;letter-spacing:1.2px;color:var(--dsw-alias-brand-primary);font-weight:600}
.lr-translation-part .lr-markdown{font-size:14.5px;line-height:2.02}
.lr-translation-part .lr-markdown p{margin:0 0 18px}
.lr-translation-part .lr-markdown p:last-child{margin-bottom:0}
.lr-translation-part .lr-markdown h3,.lr-translation-part .lr-markdown h4{margin:18px 0 8px;font-size:14.5px}
.lr-translation-part .lr-markdown li{margin:5px 0}
.lr-inline-figures{display:grid;grid-template-columns:1fr;gap:12px;margin:18px 0 22px}
.lr-inline-figure{margin:0;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.lr-inline-figure img{display:block;width:100%;max-height:460px;object-fit:contain;background:var(--dsw-alias-bg-layer-2);cursor:zoom-in}
.lr-inline-figure figcaption{padding:7px 9px;font-size:10px;line-height:1.5;color:var(--dsw-alias-label-secondary);border-top:1px solid var(--dsw-alias-border-l1)}
.lr-translation-figures{border-top:1px dashed var(--dsw-alias-border-l2);margin-top:10px;padding-top:18px}
.lr-translation-figures-head{font-size:16px;font-weight:650;margin-bottom:4px}
.lr-chat{position:absolute;right:24px;bottom:0;width:min(440px,calc(100% - 48px));height:min(480px,70%);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-bottom:0;border-radius:13px 13px 0 0;display:flex;flex-direction:column;box-shadow:0 -12px 40px rgba(0,0,0,.14);z-index:20}
.lr-chat-head{display:flex;align-items:center;justify-content:space-between;padding:9px 10px 9px 13px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:0 0 auto}
.lr-chat-head>div:first-child{display:flex;align-items:center;gap:6px;font-size:12px;min-width:0}
.lr-chat-head strong{font-weight:650;white-space:nowrap}
.lr-chat-head span{font-size:9.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lr-chat-scroll{flex:1;min-height:0;overflow:auto;padding:13px;display:flex;flex-direction:column;gap:10px}
.lr-chat-empty{text-align:center;padding:10px 6px}
.lr-chat-empty p{font-size:11px;line-height:1.65;color:var(--dsw-alias-label-secondary);margin:0 0 12px}
.lr-chat-suggestions{display:flex;flex-direction:column;gap:5px}
.lr-chat-suggestions button{text-align:left;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:7px;padding:7px 9px;font-size:11px;cursor:pointer;line-height:1.4}
.lr-chat-suggestions button:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.lr-msg{display:flex;gap:7px;align-items:flex-start}
.lr-msg-avatar{width:22px;height:22px;flex:0 0 22px;border-radius:7px;display:grid;place-items:center;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-brand-primary);margin-top:1px}
.lr-msg-body{min-width:0;font-size:12px;line-height:1.7;padding:8px 10px;border-radius:9px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);max-width:calc(100% - 30px)}
.lr-msg-body p{margin:0 0 6px}
.lr-msg-body p:last-child{margin-bottom:0}
.lr-msg.is-user{justify-content:flex-end}
.lr-msg.is-user .lr-msg-body{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent);max-width:88%}
.lr-msg.is-error .lr-msg-body{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,var(--dsw-alias-border-l1));color:var(--dsw-alias-state-error-primary)}
.lr-thinking{display:flex;align-items:center;gap:7px;color:var(--dsw-alias-label-secondary)}
.lr-chat-input{flex:0 0 auto;display:flex;gap:7px;padding:9px;border-top:1px solid var(--dsw-alias-border-l1);align-items:flex-end}
.lr-chat-input textarea{flex:1;resize:none;min-height:38px;max-height:100px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);padding:8px 9px;font-size:11.5px;line-height:1.5;outline:none}
.lr-chat-input textarea:focus{border-color:var(--dsw-alias-brand-primary)}
.lr-send{width:36px;height:36px;border:0;border-radius:8px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);display:grid;place-items:center;cursor:pointer;flex:0 0 36px}
.lr-send:disabled{opacity:.4;cursor:not-allowed}
.lr-chat-head-actions{display:flex;align-items:center;gap:2px}
.lr-chat-fab{position:absolute;right:24px;bottom:20px;display:inline-flex;align-items:center;gap:7px;height:35px;padding:0 13px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:11.5px;font-weight:550;cursor:pointer;box-shadow:0 5px 18px rgba(0,0,0,.12);z-index:15}
.lr-chat-fab:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.lr-drag-overlay{position:fixed;inset:0;z-index:100;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,rgba(0,0,0,.28));backdrop-filter:blur(3px);display:grid;place-items:center;pointer-events:none}
.lr-drag-card{min-width:320px;padding:28px 34px;border-radius:16px;background:var(--dsw-alias-bg-base);border:2px dashed var(--dsw-alias-brand-primary);display:flex;flex-direction:column;align-items:center;gap:7px;color:var(--dsw-alias-brand-primary);box-shadow:0 20px 60px rgba(0,0,0,.2)}
.lr-drag-card strong{font-size:16px}
.lr-drag-card span{font-size:11px;color:var(--dsw-alias-label-secondary)}
.lr-switch{display:inline-flex;align-items:center;gap:7px;border:0;background:transparent;padding:2px 0;cursor:pointer;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.lr-switch-track{width:28px;height:16px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);position:relative;transition:background .15s,border-color .15s;flex:none}
.lr-switch-thumb{position:absolute;left:2px;top:2px;width:10px;height:10px;border-radius:50%;background:var(--dsw-alias-label-secondary);transition:transform .15s,background .15s}
.lr-switch.is-on .lr-switch-track{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,transparent);border-color:var(--dsw-alias-brand-primary)}
.lr-switch.is-on .lr-switch-thumb{transform:translateX(12px);background:var(--dsw-alias-brand-primary)}
.lr-switch-label{font-size:11px;line-height:1}
.lr-mode-hint{font-size:11px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.lr-selection-translate{max-width:860px}
.lr-st-toggle-row{display:flex;align-items:center;gap:10px;margin:10px 0 12px;flex-wrap:wrap}
.lr-st-toggle-hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.lr-st-card{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.lr-st-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:12px;color:var(--dsw-alias-label-secondary)}
.lr-st-head strong{font-size:12px;font-weight:650;color:var(--dsw-alias-label-primary);letter-spacing:.2px}
.lr-st-source{display:block;width:100%;min-height:190px;max-height:360px;resize:vertical;border:0;outline:none;background:transparent;padding:14px 16px;font-size:14.5px;line-height:1.95;color:var(--dsw-alias-label-primary)}
.lr-st-source::placeholder{color:var(--dsw-alias-label-tertiary)}
.lr-st-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 14px;border-top:1px solid var(--dsw-alias-border-l1)}
.lr-st-hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.lr-st-arrow{text-align:center;font-size:20px;line-height:1;color:var(--dsw-alias-brand-primary);margin:8px 0}
.lr-st-card.is-result{min-height:220px}
.lr-st-loading{display:flex;align-items:center;justify-content:center;gap:8px;min-height:180px;font-size:13px;color:var(--dsw-alias-label-secondary)}
.lr-st-empty{display:flex;align-items:center;justify-content:center;min-height:180px;padding:20px;text-align:center;font-size:13px;color:var(--dsw-alias-label-tertiary)}
.lr-st-error{padding:16px;color:var(--dsw-alias-state-error-primary);font-size:13px;line-height:1.7}
.lr-st-result{padding:14px 16px;font-size:14.5px;line-height:2.02;color:var(--dsw-alias-label-primary)}
.lr-st-result .lr-markdown p{margin:0 0 13px}
.lr-st-result .lr-markdown p:last-child{margin-bottom:0}
.lr-st-result-actions{display:flex;justify-content:flex-end;gap:6px;padding:9px 14px;border-top:1px solid var(--dsw-alias-border-l1)}
.lr-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:200;display:flex;align-items:center;gap:8px;max-width:min(620px,calc(100% - 40px));padding:9px 14px;border-radius:9px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);box-shadow:0 10px 35px rgba(0,0,0,.18);font-size:11.5px;line-height:1.45;color:var(--dsw-alias-label-primary);animation:lr-toast-in .18s ease}
.lr-toast.is-error{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,var(--dsw-alias-border-l1));color:var(--dsw-alias-state-error-primary)}
.lr-toast.is-success svg{color:var(--dsw-alias-state-success-primary)}
@keyframes lr-toast-in{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
.lr-modal-backdrop{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.36);display:grid;place-items:center;padding:24px;backdrop-filter:blur(2px)}
.lr-modal{width:min(460px,100%);max-height:90vh;display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:13px;box-shadow:0 26px 80px rgba(0,0,0,.32);overflow:hidden}
.lr-modal.is-wide{width:min(680px,100%)}
.lr-modal-head{display:flex;align-items:flex-start;justify-content:space-between;padding:16px 16px 10px 19px}
.lr-modal-title{font-size:15px;font-weight:680}
.lr-modal-sub{font-size:11px;line-height:1.55;color:var(--dsw-alias-label-secondary);margin-top:3px;max-width:360px}
.lr-modal-body{padding:4px 19px 17px;overflow:auto}
.lr-field{display:flex;flex-direction:column;gap:5px;margin-top:11px}
.lr-field>span{font-size:10.5px;letter-spacing:.4px;color:var(--dsw-alias-label-secondary);font-weight:600}
.lr-field input,.lr-field textarea,.lr-field select{border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base);padding:8px 9px;font-size:12.5px;outline:none;width:100%}
.lr-field input:focus,.lr-field textarea:focus,.lr-field select:focus{border-color:var(--dsw-alias-brand-primary)}
.lr-field textarea{resize:vertical;line-height:1.6}
.lr-modal-actions{display:flex;align-items:center;justify-content:space-between;margin-top:20px;gap:10px}
.lr-actions-right{display:flex;gap:7px;justify-content:flex-end}
.lr-confirm-text{font-size:12.5px;line-height:1.65;color:var(--dsw-alias-label-secondary);margin:4px 0 0}
@media (max-width:1200px){.lr-library{width:240px;flex-basis:240px}.lr-source{width:38%;flex-basis:38%;min-width:300px}.lr-empty-features{grid-template-columns:repeat(2,1fr)}.lr-doc-top,.lr-modebar,.lr-job-wrap{padding-left:20px;padding-right:20px}.lr-doc-article{padding-left:20px;padding-right:20px}.lr-summary-grid{grid-template-columns:1fr}}
@media (max-width:980px){.lr-library{width:232px;flex-basis:232px}.lr-source{position:absolute;right:0;top:0;bottom:0;width:60%;min-width:0;flex-basis:60%;z-index:12;box-shadow:-12px 0 35px rgba(0,0,0,.14)}.lr-top-stat{display:none}.lr-doc-heading h1{font-size:19px}.lr-modebar{flex-wrap:wrap}.lr-chat{width:calc(100% - 30px);right:15px}.lr-terms{grid-template-columns:1fr}}
`
    return {
      inject: ['slots'],
      apply(ctx) {
        function ReaderPanel(props) {
          return h(ReaderErrorBoundary, null, h(ReaderApp, {
            ...props,
            pickDirectory: () => ctx.get('uiWorkspace')?.pickDirectory?.() ?? Promise.resolve(null),
          }))
        }
        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'reader',
          order: 20,
          label: () => '文献阅读',
        }, PanelIcon)), 'literature-reader: sidebar entry')
        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'reader',
        }, ReaderPanel)), 'literature-reader: main panel')
      },
    }
  },
})

