<div align="center">
  <img src="./public/pwa-192x192.svg" width="120" height="120" alt="DeepSeek WebUI Logo" />
  <h1>DeepSeek WebUI</h1>
  <p>A professional DeepSeek WebUI client with reasoning display, history persistence, and cost monitoring.</p>
</div>

## 📖 简介 (Introduction)

DeepSeek WebUI 是一款专为 DeepSeek API 打造的现代化、功能丰富的网页客户端。它不仅提供了流畅的对话体验，还内置了强大的长期记忆库、系统提示词模板管理、自定义主题等高级功能，帮助你更高效地使用大语言模型。

## ✨ 核心功能 (Features)

- **🧠 深度思考 (Reasoning) 展示**：完美支持 DeepSeek-R1 等推理模型，直观展示 AI 的思考过程。
- **📚 分层记忆系统 (Tiered Memory)**：内置 SQLite 数据库，自动提取并持久化存储对话中的关键事实与用户画像，实现跨对话的“长期记忆”。
- **📝 提示词模板 (Prompt Templates)**：支持创建、保存和快速应用常用的 System Prompt，一键切换 AI 角色。
- **🎨 高度自定义 (Customizable UI)**：支持亮色/暗色主题无缝切换，并允许用户上传自定义背景图片。
- **💰 成本监控 (Cost Monitoring)**：实时追踪 API Token 消耗与余额，让你对使用成本了如指掌。
- **📂 会话管理 (Conversation Management)**：支持多会话的创建、重命名、删除与本地持久化保存。

## 🚀 使用方法 (How to Use)

1. **配置 API Key**：
   - 点击左下角的“设置”图标（齿轮⚙️）。
   - 在“API 设置”中填入你的 DeepSeek API Key 并保存。
   
2. **开始对话**：
   - 点击左侧边栏的 **“新建对话”** 按钮即可开始全新的交流。
   
3. **设定 AI 角色 (System Prompt)**：
   - 在对话界面顶部，点击 **“点击设定”**。
   - 输入你希望 AI 扮演的角色或遵循的规则（例如：“你是一个专业的翻译官...”）。
   - 你也可以在设置中提前创建好 **“提示词模板”**，在这里一键快速填充。
   
4. **开启长期记忆**：
   - 在设置的“记忆库”选项卡中，开启 **“长期记忆”** 开关。
   - 开启后，AI 会自动记住你提到的关键信息（如你的名字、喜好等），并在未来的对话中自动参考这些背景知识。
   
5. **个性化外观**：
   - 在设置的“外观”选项卡中，你可以自由切换 **深色/浅色模式**，或者上传一张你喜欢的图片作为聊天背景。

## 🐳 Docker 部署 (Docker Deployment)

如果你希望使用 Docker 快速部署本项目（推荐）：

### 方式一：使用 Docker Compose（最简单）

1. 确保你已经安装了 Docker 和 Docker Compose。
2. 在项目根目录下运行：

```bash
docker-compose up -d
```

3. 访问 `http://localhost:2233` 即可使用。
> **注意**：所有数据（记忆库、设置等）会自动持久化保存在当前目录的 `data` 文件夹中。

### 方式二：使用原生 Docker 命令

如果你不想使用 Docker Compose，也可以直接构建并运行容器：

```bash
# 构建镜像
docker build -t deepseek-webui .

# 运行容器（将本地的 data 目录挂载以持久化数据）
docker run -d -p 2233:3000 -v $(pwd)/data:/app/data --name deepseek-webui deepseek-webui
```

## 🔒 访问控制 (Authentication)

如果你将项目部署在局域网或公网，并希望防止他人直接访问，你可以通过设置环境变量来开启基础身份验证 (Basic Auth)：

### Docker Compose 部署：
编辑 `docker-compose.yml` 文件，取消 `environment` 下面关于密码的注释并设置你的密码：
```yaml
    environment:
      - NODE_ENV=production
      - PORT=3000
      - WEBUI_PASSWORD=your_secure_password  # 设置你的密码
      - WEBUI_USERNAME=admin                 # (可选) 设置你的用户名，默认为 admin
```
然后重新启动容器：`docker-compose up -d`

### 原生 Docker 命令部署：
在运行容器时加上 `-e` 参数：
```bash
docker run -d -p 2233:3000 -v $(pwd)/data:/app/data -e WEBUI_PASSWORD=your_secure_password --name deepseek-webui deepseek-webui
```

### 源码本地运行部署：
在项目根目录创建一个 `.env` 文件，并添加以下内容：
```env
WEBUI_PASSWORD=your_secure_password
WEBUI_USERNAME=admin
```
然后重启服务即可生效。

## 🛠️ 本地运行 (Local Development)

如果你希望在本地运行此项目：

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

> **注意**：本项目包含后端服务（用于处理 SQLite 记忆库和 API 代理），请确保使用 `npm run dev` 启动完整的全栈环境。
