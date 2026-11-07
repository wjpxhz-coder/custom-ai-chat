# Custom AI Chat (个人自定义 AI 人设对话网站 v2.0)

这是一个**现代扁平极简风格**的高颜值单页面 AI 对话客户端，支持自定义多 AI 人设，直连包括 **ChatAnywhere、DeepSeek、OpenAI、硅基流动 (SiliconFlow)、月之暗面 (Kimi)、Ollama 本地大模型** 在内的任意兼容 OpenAI 规范的 API 接口，并原生支持 **DeepSeek-R1 深度思考推演链** 展示。

无需任何后端服务器或复杂的 Node.js 环境，零配置免费一键部署到 **GitHub Pages**。

---

## ✨ 核心亮点与升级 (v2.0)

- 🎨 **现代化极致扁平美学**：参考 ChatGPT / Claude / Linear 官方设计语言，提供深浅双色主题无感平滑切换，微光发光态与高可读性呼吸感排版。
- 🌐 **自由多服务商预设 (Multi-Provider)**：
  - 默认提供 **ChatAnywhere (国内优化)**、**DeepSeek 官方 API**、**OpenAI 官方**、**硅基流动 (SiliconFlow)**、**月之暗面 (Moonshot / Kimi)**、**Ollama (本地私有部署)** 等快捷一键切换，亦可自定义任意反代 Base URL。
- 🧠 **原生思维链推演支持 (Reasoning Chain)**：
  - 针对 **DeepSeek-R1**、OpenAI o1/o3-mini 等深度推理模型，智能捕获推理过程并渲染为科技感微光思考卡片，支持自由折叠与展开。
- 📝 **专业级 Markdown 与科学公式排版**：
  - 集成 **Marked.js** + **DOMPurify**，支持完整的 GFM 表格、引用、列表与任务清单，杜绝 XSS 注入风险。
  - **Highlight.js** 代码语法高亮（涵盖 Python、JS、C++、Go、Bash、SQL 等主流语言），配备语言标签与一键复制代码功能。
  - **KaTeX** 数学公式原生渲染，完美呈现行内 `$E=mc^2$` 与独立块式数学公式。
- ⏹️ **流式生成控制与交互增强**：
  - 支持 **实时中止生成 (Stop Generation)**，随时截断长文本流。
  - 支持**重新生成 (Regenerate)**、**全文复制**、**单条消息删除**。
  - **智能滚动检测**：用户向上翻阅历史消息时停止强行下滚，并提供悬浮快捷“回到底部”药丸按钮。
- 🔍 **高效会话管理与数据自由**：
  - 会话列表实时关键字模糊搜索。
  - 会话标题双击/点击快速重命名。
  - **上下文轮数控制**：可自定义携带历史轮数（单轮/3轮/6轮/12轮/全部），在保证连贯对话的同时节省 Token 费用。
  - **全量数据备份与恢复**：支持一键导出全部数据为 JSON，支持导入恢复；支持单次会话导出为标准 Markdown 文档。
- 🔐 **本地隐私与密钥绝对安全**：
  - 纯前端客户端架构，API Key 与所有对话记录均严格保存在用户本地浏览器的 `localStorage` 中，绝不经由任何第三方中间服务器。

---

## 🛠️ 本地体验与运行

本项目为纯前端静态单页面架构，开箱即用：

1. 克隆或下载本仓库代码到本地。
2. 双击根目录下的 `index.html` 即可在现代浏览器（Chrome、Edge、Safari、Firefox 等）中直接打开。
3. 打开侧边栏，选择您使用的服务商预设（如 ChatAnywhere 或 DeepSeek），输入对应的 **API Key** 并点击“保存配置”。
4. 挑选或新建您的 AI 人设，即可畅享智能对话！

---

## 🚀 GitHub Pages 部署指南

您可以将其**免费、零维护**部署到 GitHub Pages：

1. **推送到 GitHub 仓库**：
   确保仓库中包含核心代码文件：
   - `index.html`
   - `app.js`
   - `README.md`

2. **开启 GitHub Pages**：
   - 进入 GitHub 仓库页面的 **Settings** (设置) -> **Pages**。
   - 在 **Build and deployment** 下的 **Source** 选择 `Deploy from a branch`。
   - **Branch** 选择 `main`，目录选择 `/ (root)`，点击 **Save**。

3. **在线访问**：
   等待 GitHub Actions 部署完成后，即可通过专属域名在线访问：
   `https://<您的GitHub用户名>.github.io/<仓库名称>/`

---

## 🔒 隐私与安全性说明

- **无泄露风险**：当您将本项目公开开源在 GitHub 时，仓库代码中没有任何敏感凭据。
- **本地直连**：浏览器发起的所有请求均直接经由 Fetch 握手至目标 API 服务器，没有中间代理商转存数据。
