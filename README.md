# Custom AI Chat (个人自定义 AI 人设对话网站)

这是一个**现代扁平极简风格**的单页面 AI 对话客户端，支持自定义 AI 人设，直连 ChatAnywhere 模型接口。您可以非常简单地将其部署到 **GitHub Pages**。

## ✨ 项目特色

- 🎨 **现代扁平极简设计**：参考 ChatGPT / Claude 官方网站设计，提供深浅双色主题，优秀的呼吸感排版和柔和动画过渡。
- 🔐 **密钥绝对安全**：纯前端架构，API 密钥（API Key）、自定义人设及历史会话记录均**仅保存在您本地浏览器的 `localStorage` 中**，绝不上传到任何服务器，绝不硬编码于源码中，部署在公开 GitHub 仓库时也绝无泄露风险。
- 🎭 **自定义 AI 人设**：支持一键切换并维护多个人设，可自定义名称、System Prompt (人设提示词)、Emoji 头像、运行模型（如 `gpt-4o-mini`, `gpt-4o`, `deepseek-chat` 等）及采样温度（Temperature）。
- 💬 **流畅的流式对话**：采用 Fetch Stream 对接 ChatAnywhere 接口，流式返回数据并提供打字机加载效果，支持完整的上下文对话记忆。
- 📝 **极简 Markdown 解析**：完美渲染列表、加粗、行内代码，特别为代码块设计了背景区隔与一键复制代码功能。
- 📱 **完美的自适应布局**：在手机端可折叠侧边栏，为移动设备提供极佳的对话体验。

---

## 🛠️ 本地体验与运行

本项目为纯前端静态页面，无需配置任何复杂的 Node.js 环境或进行打包构建。

1. 克隆或下载本仓库代码到本地。
2. 双击根目录下的 `index.html` 即可在浏览器中直接打开。
3. 打开侧边栏，输入您的 **ChatAnywhere API Key** 并保存。
4. 开始您的自定义人设对话！

---

## 🚀 GitHub Pages 部署指南

因为是纯静态页面，您可以将其**免费、零配置**部署到 GitHub Pages 上：

1. **创建 GitHub 仓库**：
   在您的 GitHub 账号上新建一个公开（Public）或私有（Private）的仓库，例如命名为 `custom-ai-chat`。

2. **推送代码**：
   将以下核心文件推送到该仓库中：
   - `index.html`
   - `app.js`
   - `README.md`

3. **开启 GitHub Pages 托管**：
   - 在您的 GitHub 仓库页面，点击右上角的 **Settings** (设置)。
   - 在左侧菜单栏中找到 **Pages** 选项。
   - 在 **Build and deployment** 下的 **Source** 选择 `Deploy from a branch`。
   - 在 **Branch** 栏中选择您的主分支（通常为 `main` 或 `master`），目录选择 `/ (root)`，点击 **Save** (保存)。

4. **访问您的站点**：
   等待 1-2 分钟，刷新页面，您将在 GitHub Pages 页面顶部看到您的专属在线访问链接，例如：
   `https://<您的用户名>.github.io/custom-ai-chat/`。

---

## 🔒 密钥安全性说明

当您将该项目托管到公共 GitHub 仓库时，**绝不要将 API Key 写入代码中**。
本站的设计机制是：
- 首次进入页面时，系统会提示您输入 API 密钥。
- 该密钥保存在您浏览器本地的 `localStorage` 缓存里（Key 为 `chat_api_key`）。
- 所有的 API 请求均为您的浏览器直接发往 ChatAnywhere 代理服务器 (`https://api.chatanywhere.tech`)。
- **任何人都无法通过查看您在 GitHub 上的开源代码来盗用您的 API 密钥**。
