# DeepSeek WebUI 重构计划文档 (V2)

基于我们之前的讨论和已经完成的初步工作，这里是一份详细的、分步骤的重构计划。

## 核心设计原则与需求目标 (Core Requirements)
1. **架构模式**：彻底的前后端分离架构。
2. **UI/UX**：UI 必须同时完美适配 PC 端和手机端（响应式设计）。
3. **部署与打包**：支持 Docker 部署，支持一键打包。打包后的应用操作流程为：启动后进入一个“启动页面”，由该页面负责启动前端和后端服务。
4. **数据管理**：所有运行产生的数据（数据库、配置、日志等）必须统一存放在运行目录下的 `data` 文件夹内，并分类存放整齐。
5. **核心功能**：
   - 调用各类 LLM API 进行对话。
   - 长期/短期记忆管理。
   - AI 绘图（已预留接口）。
   - TTS 文字转语音（规划中）。
6. **极致可扩展性**：整个项目的可拓展性要做到最高，任何新模型、新功能（如新的绘图 API、新的 TTS 引擎）都能以插件/Provider 的形式无缝接入。

**当前进度**：我们已经完成了最核心的 Provider 抽象（`ILLMProvider`, `IImageProvider`），并将 `server.ts` 和 `MemoryService` 中的硬编码调用替换为了工厂模式调用。

为了保证系统的稳定性，我们将采用**渐进式重构**，每完成一个 Step 都会暂停，等待您测试确认无误后，再进行下一个 Step。

---

## 阶段一：后端架构深度解耦 (Backend Refactoring)

目标：彻底告别 `server.ts` 单体文件，将路由、业务逻辑、数据访问完全分离。

### Step 1: 路由拆分 (Routing Extraction) -> **[进行中/已完成]**
*   **目标**：将 `server.ts` 中长达几百行的 API 路由拆分到独立的文件夹中。
*   **具体操作**：
    *   创建 `server/config.ts` 统一管理 `data` 目录路径，确保所有数据分类存放在 `data` 文件夹下。
    *   创建 `server/routes/` 目录。
    *   提取 `server/routes/chat.ts`：包含 `/api/chat`。
    *   提取 `server/routes/memory.ts`：包含 `/api/memories`, `/api/conversations` 等。
    *   提取 `server/routes/settings.ts`：包含 `/api/settings`。
    *   提取 `server/routes/image.ts`：包含 `/api/extract-prompt`, `/api/generate-image`。
    *   修改 `server.ts`，引入并注册这些路由模块。
*   **测试验收**：启动服务，测试基础的聊天、记忆查看、设置保存、图片生成是否依然正常工作。

### Step 2: 业务逻辑服务化 (Service Extraction)
*   **目标**：将路由文件中的复杂业务逻辑（如 `/api/chat` 中的记忆组装、系统提示词拼接）抽离到 Service 层。
*   **具体操作**：
    *   创建 `server/services/ChatService.ts`，封装核心的对话上下文组装逻辑。
    *   创建 `server/services/BillingService.ts`，将前端的 Token 计费逻辑移动到后端，统一下发每次对话的消耗金额。

---

## 阶段二：前端状态管理与组件化 (Frontend Refactoring)

目标：拆解 2800+ 行的 `App.tsx`，引入 Zustand 进行全局状态管理，彻底解决组件耦合和代码重复问题，并**重点优化 PC 和手机端的响应式适配**。

### Step 3: 引入 Zustand 状态管理 -> **[进行中]**
*   **目标**：将 React state 迁移到全局 Store。
*   **具体操作**：
    *   创建 `src/store/chatStore.ts`：管理 `conversations`, `currentConversationId`, `messages`, `isGenerating` 等。 (已完成)
    *   创建 `src/store/settingStore.ts`：管理 `apiKeys`, `settings`, `isSettingsOpen` 等。 (已完成)
    *   创建 `src/store/storyStore.ts`：管理 `isStoryMode`, `storyDiscussion` 等。 (已完成)
    *   创建 `src/store/uiStore.ts`：管理各类弹窗和侧边栏的 UI 状态。 (已完成)
    *   **下一步**：将 `App.tsx` 中的 45 个 `useState` 逐步替换为使用这些 Store，并拆分组件。

### Step 4: 提取自定义 Hook (统一流式解析)
*   **目标**：解决普通聊天和故事模式中重复的 SSE 解析代码。
*   **具体操作**：
    *   创建 `src/hooks/useChatStream.ts`，封装 `fetch` SSE 流、处理 chunk、更新消息状态的逻辑。

### Step 5: UI 组件大拆分与移动端适配
*   **目标**：将 `App.tsx` 拆分为职责单一的小组件，并确保 Tailwind CSS 的响应式类（如 `md:`, `lg:`）正确应用。
*   **具体操作**：
    *   提取 `Sidebar.tsx` (侧边栏会话列表，移动端可抽屉式滑出)。
    *   提取 `ChatArea.tsx` (主聊天区域)。
    *   提取 `MessageItem.tsx` (单条消息气泡，包含 Markdown 渲染)。
    *   提取 `MessageInput.tsx` (底部输入框)。
    *   提取 `SettingsModal.tsx` (设置弹窗)。
    *   提取 `StoryDiscussionModal.tsx` (故事模式讨论弹窗)。
    *   重写 `App.tsx`，使其仅作为一个 Layout 容器组合上述组件。
*   **测试验收**：前端 UI 渲染正常，在 PC 和手机浏览器中布局合理，聊天交互、切换会话、修改设置等功能正常。

---

## 阶段三：多模型支持与高级特性拓展 (Features Expansion)

目标：在干净的架构上，实现真正的多模型独立配置和新能力接入。

### Step 6: 细粒度多模型配置
*   **目标**：允许用户为不同功能选择不同的 LLM。
*   **具体操作**：
    *   修改前端设置页，增加“默认对话模型”、“记忆处理模型”、“故事引导模型”的独立选择下拉框。
    *   后端 `ChatService` 和 `MemoryService` 根据前端传来的配置，从 `LLMProviderFactory` 动态获取对应的 Provider 实例。

### Step 7: 接入新的 LLM Provider
*   **目标**：验证架构的扩展性。
*   **具体操作**：
    *   实现 `OpenAIProvider.ts` 或 `GeminiProvider.ts`。
    *   在工厂类中注册，前端即可无缝切换使用。

### Step 8: TTS (文字转语音) 架构搭建
*   **目标**：增加语音播报能力。
*   **具体操作**：
    *   后端创建 `server/providers/tts/ITTSProvider.ts` 和具体实现（如 Edge TTS）。
    *   前端 `MessageItem.tsx` 增加播放按钮，调用后端 TTS 接口获取音频流并播放。

---

## 阶段四：打包与部署 (Packaging & Deployment)

### Step 9: Docker 化与一键打包
*   **目标**：实现应用的打包和 Docker 部署，并增加启动页面。
*   **具体操作**：
    *   编写 `Dockerfile` 和 `docker-compose.yml`，确保数据挂载到外部卷。
    *   （可选）如果是桌面端打包，引入 Electron 或 Tauri，并制作一个启动页面（Loading/Splash Screen），在后台启动 Node.js 服务和前端页面。

---

## 执行约定

1.  **严格按步骤执行**：我会先执行 **Step 1**。
2.  **等待测试**：每个 Step 的代码修改完成后，我会停止操作并通知您。
3.  **确认推进**：您在本地或当前环境中测试，确认没问题后，回复我“继续 Step X”或“测试通过，继续”。
4.  **文档同步**：任何需求变更或阶段性总结，都会实时更新到此文档中。
