# Literature Reader / 文献阅读

DeepSeek Harness（DSH）的文献阅读插件：在同一个界面里读 PDF、看结构化中文总结、划词翻译、做高亮/附注，并和 Agent 讨论论文。

当前版本：**0.5.1**

## 功能

- **PDF 文献库**：拖拽上传、文件夹、说明、重命名、移动、删除；文献库可迁移到任意本地目录。
- **结构化中文总结**：Agent 根据论文类型自适应生成研究总结、核心要点、实验步骤、参数/结果、结论与术语。
- **原文定位**：悬停总结条目跳转 PDF 并高亮；右侧「悬停定位」开关可关闭自动定位。
- **连续 PDF**：滚轮连续阅读、页码跳转、缩放、适合宽度、拖动分栏、全屏按钮。
- **高亮与附注**：选中文字点「高亮」，可顺手写附注；点击已有高亮弹出「复制 / 附注 / 删除 / 颜色」工具条，支持五种颜色。
- **划词翻译**：默认关闭自动读取，避免打断笔记；打开后 PDF 划词自动翻译，关闭时也可手动送入翻译栏。译文结合论文语境，保留蓝色选区，点击空白清除。
- **问问 Agent**：顶栏/右下角随时提问，基于当前文献总结和原文回答；问答可导出 Markdown。
- **多文献学习资料**：勾选多篇文献生成中文学习资料。

## 安装

1. 解压 `literature-reader-0.5.1.zip` 到一个固定目录（目录中应包含 `package.json`）。
2. 打开 DSH → 左侧「插件」→ 右上角「添加插件」。
3. 输入插件目录路径，点「安装」。
4. 如果没有立即出现，重启 DSH 后在插件页确认「文献阅读」已启用。

> 安装目录不要移动或删除；DSH 的本地目录安装会链接到该位置。

从源码安装、上传 GitHub、发 Release 的详细步骤见 [PUBLISH.md](./PUBLISH.md)。

## 使用手册

完整中文手册：

- Markdown 版：[docs/USER_GUIDE.md](./docs/USER_GUIDE.md)
- Word 版：[docs/文献阅读使用手册-v0.5.1.docx](./docs/文献阅读使用手册-v0.5.1.docx)

手册包含安装、界面、总结、PDF 阅读、高亮附注、划词翻译、问答导出、文献库迁移、隐私与常见问题。

## 目录

```text
.
├── package/                 DSH 插件源码（Host + Client）
│   ├── index.js             Host：文献库、HTTP 路由、LLM、Agent 工具
│   ├── client.js            Web UI：三栏阅读器 + PDF.js
│   ├── scripts/             提取与安装脚本
│   ├── vendor/pdfjs/        PDF.js
│   └── vendor/python/       PyMuPDF（完整包内，源码仓库不提交）
├── docs/USER_GUIDE.md       使用手册
├── PUBLISH.md               打包、上传 GitHub、发 Release
├── LICENSE                  MIT
└── THIRD_PARTY_NOTICES.md   第三方许可
```

## 依赖

- DeepSeek Harness Web UI；
- PDF.js 4.10.38（Apache-2.0）；
- PyMuPDF 1.26.5（AGPL-3.0，完整包内携带；源码安装运行 `scripts/install-vendor.ps1`）；
- 生成总结/翻译/问答使用 DSH 当前默认模型。

## 隐私

- PDF、总结、笔记保存在本机文献库目录；
- 生成内容时只把提取出的文本发送给 DSH 当前模型；
- 不上传到插件的第三方服务器；
- 不要将插件 HTTP 接口直接暴露到公网。

## 许可

原创代码使用 MIT 许可。PDF.js 为 Apache-2.0；PyMuPDF 为 AGPL-3.0，详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。公开分发包含 PyMuPDF 的完整包前，请确认 AGPL 合规。
