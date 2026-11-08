# 打包、上传 GitHub、发给别人

这个项目不是独立的 `.exe` 软件，而是 **DeepSeek Harness 的插件**。  
对方需要先安装 DSH，再安装插件；插件本身负责文献库、PDF 阅读、总结、翻译和问答。

---

## 1. 先打包

在项目根目录（`D:\dsh_workspace\plugin_reader`）打开 PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-release.ps1
```

脚本会生成：

```text
release/
  literature-reader-0.5.1/             # 完整插件，可直接安装
  literature-reader-0.5.1.zip          # 发给别人的完整包（约 20 MB）
  literature-reader-0.5.1-source/      # GitHub 仓库用的源码目录
  literature-reader-0.5.1-source.zip   # 源码压缩包
```

打包会**自动排除**：

- `package/library/`：你的 PDF、总结、笔记和旧译文；
- `samples/`：测试 PDF；
- `screenshots/`：演示截图；
- `tmp-*`：临时文件。

不要把 `library/` 上传到 GitHub，否则会把你的论文和个人数据一起公开。

> `release/` 每次打包都会被清空。准备长期维护时，把 `release/literature-reader-0.5.1-source` 复制到独立目录（例如 `D:\Github\literature-reader`）再 `git init`，不要直接在 `release/` 里提交。

---

## 2. 发给别人：直接安装完整包

把 `release/literature-reader-0.5.1.zip` 发给对方。

对方操作：

1. 解压到一个固定目录，例如：

   ```text
   D:\DSH-Plugins\literature-reader
   ```

   如果解压后目录叫 `literature-reader-0.5.1`，可以直接选它，或重命名为 `literature-reader`。

2. 打开 DSH。
3. 左侧点 **「插件」**。
4. 右上角点 **「添加插件」**。
5. 在输入框粘贴解压后的目录：

   ```text
   D:\DSH-Plugins\literature-reader
   ```

   注意：要选到 **包含 `package.json` 的那一层**，不是外面的 `release` 文件夹。

6. 点 **「安装」**。
7. 安装完成后，如果插件没有自动出现，重启一次 DSH；再到「插件」里确认「文献阅读」已启用。

完整包已经带了：

- PDF.js；
- Windows 版 PyMuPDF；
- 插件 Host / Client 代码。

对方不需要再装 Python 包。

### 常见问题

**提示“找不到 package.json”**  
路径选错了。应该选解压后的 `literature-reader` 目录，而不是 `release` 或 `literature-reader\package`。

**安装后打不开**  
先重启 DSH；再到「插件」确认插件已启用。插件依赖 DSH 的 `webServer`，DSH 启动完成后才会注册接口。

**Windows 提示脚本被阻止**  
如果对方是从源码安装，需要运行 `install-vendor.ps1`，可先右键 zip → 属性 → 勾选“解除锁定”，或在 PowerShell 里：

```powershell
Unblock-File .\scripts\install-vendor.ps1
```

**不要删除解压目录**  
DSH 的本地目录安装是链接到该目录的；删除后插件会失效。

---

## 3. 上传 GitHub

### 方法 A：GitHub Desktop（推荐，不用敲 git 命令）

1. 安装 GitHub Desktop，登录 GitHub 账号。
2. 菜单 **File → Add local repository**。
3. 选择：

   ```text
   D:\dsh_workspace\plugin_reader\release\literature-reader-0.5.1-source
   ```

4. 如果提示“不是 Git 仓库”，点 **create a repository**：
   - Name：`literature-reader`
   - 选择 Public 或 Private
   - 点 Create Repository
5. 左下角填写提交信息，例如：

   ```text
   feat: DSH literature reader plugin
   ```

6. 点 **Commit to main**。
7. 点右上角 **Publish repository**。
   - 想公开就取消勾选 “Keep this code private”
   - 点 Publish

这个 `-source` 目录已经包含：

- `package.json`、`index.js`、`client.js`；
- `vendor/pdfjs`；
- `README.md`、`LICENSE`、`THIRD_PARTY_NOTICES.md`；
- `scripts/install-vendor.ps1`；
- `.gitignore`。

它**不包含** `vendor/python`，所以仓库比较小；别人从源码安装时运行安装脚本即可。

> 注意：源码仓库不含 `vendor/python`，因此**不要直接把 GitHub 仓库地址填进 DSH 安装**，否则 PDF 解析会缺 PyMuPDF。请让用户下载 Release 里的完整 zip；或者把 `vendor/python` 一并提交（体积大，且涉及 AGPL 分发要求）。

### 方法 B：命令行 Git

如果本机装了 Git：

```powershell
cd D:\dsh_workspace\plugin_reader\release\literature-reader-0.5.1-source
git init
git add .
git commit -m "feat: DSH literature reader plugin"
git branch -M main
git remote add origin https://github.com/你的用户名/literature-reader.git
git push -u origin main
```

没装 Git 的话，先安装：

```powershell
winget install Git.Git
```

或者从 https://git-scm.com/download/win 下载。

### 方法 C：网页上传

适合源码包（文件不多）：

1. GitHub 新建仓库 `literature-reader`；
2. 点 **Add file → Upload files**；
3. 把 `release/literature-reader-0.5.1-source` 里面的**内容**拖进去（不是拖整个外层文件夹）；
4. Commit。

如果文件超过网页一次上传限制，改用 GitHub Desktop 或 Git 命令行。

---

## 4. 在 GitHub 上放“可直接安装包”

源码仓库里没有 `vendor/python`，所以别人直接填 GitHub 仓库地址安装时，PDF 解析会缺依赖。  
推荐把完整 zip 放到 **Releases**：

1. 打开 GitHub 仓库页面；
2. 右侧 **Releases → Draft a new release**；
3. Tag 填：

   ```text
   v0.5.1
   ```

4. 标题填：

   ```text
   Literature Reader 0.5.1
   ```

5. 上传：

   ```text
   release/literature-reader-0.5.1.zip
   ```

6. Publish release。

README 里写清楚：

> 下载 Release 里的 `literature-reader-0.5.1.zip`，解压后在 DSH → 插件 → 添加插件里选择该目录。

这样别人不需要自己装 PyMuPDF，也不会把 50 MB 的二进制提交进 Git 历史。

---

## 5. 从源码安装（给想改代码的人）

对方拿到 `-source` 包后：

```powershell
# 1. 解压后进入目录
cd D:\DSH-Plugins\literature-reader-source

# 2. 安装 PyMuPDF 到 vendor/python
powershell -ExecutionPolicy Bypass -File .\scripts\install-vendor.ps1

# 3. 打开 DSH → 插件 → 添加插件
#    路径填这个目录（包含 package.json）
```

如果脚本找不到 Python，可先指定：

```powershell
$env:LITERATURE_READER_PYTHON = 'C:\Path\To\python.exe'
powershell -ExecutionPolicy Bypass -File .\scripts\install-vendor.ps1
```

---

## 6. 更新版本

修改 `package/package.json` 里的版本号，例如：

```json
"version": "0.5.1"
```

然后重新运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-release.ps1
```

GitHub Release 用新 tag，例如 `v0.2.1`，不要覆盖旧版本 zip。

---

## 7. 隐私与许可

- 插件默认把文献存在 `package/library/`（或你迁移后的目录）；打包脚本不会带上它。
- 插件调用 DSH 当前模型生成总结/翻译；PDF 原文件不会上传到第三方服务器，除非你自己接入了外部模型。
- 本项目原创代码使用 MIT 许可，见 `LICENSE`。
- PDF.js 使用 Apache-2.0。
- PyMuPDF 使用 **AGPL-3.0**，不属于 MIT。  
  完整 zip 里带了 PyMuPDF 二进制；公开分发前请阅读 `THIRD_PARTY_NOTICES.md`，遵守 AGPL 的源码与许可要求。  
  如果不想处理这个许可问题，GitHub 仓库只放源码（不含 `vendor/python`），让别人运行安装脚本自行安装。
