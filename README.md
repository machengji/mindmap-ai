# MindMap AI - 智能思维导图生成工具

MindMap AI 是一款由 AI 驱动的现代化思维导图工具，旨在通过人工智能技术辅助用户进行知识架构和思维发散。它不仅支持传统的思维导图编辑功能，还能利用 DeepSeek 等大语言模型自动为节点生成结构化的子节点。

![Vue 3](https://img.shields.io/badge/Vue.js-3.x-4fc08d?logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-latest-646cff?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38bdf8?logo=tailwind-css)

## ✨ 核心特性

- 🤖 **AI 自动分解**：基于 DeepSeek API，遵循 MECE 原则（相互独立，完全穷尽）为选中节点自动生成 4-8 个逻辑严密的子节点。
- ☁️ **云端同步与存储**：
  - 集成 **LeanCloud** 数据库，支持思维导图的云端保存与多项目管理。
  - 自动记录更新时间，支持历史记录回溯与管理。
  - 支持 API Key 云端同步（可选）。
- 📂 **本地文件系统支持**：
  - 利用 **File System Access API** 实现本地文件的直接读取、编辑与保存。
  - 支持导入/导出 `.json` 或 `.mindmap` 格式文件。
- 🎨 **高度可定制化**：
  - **多种主题**：内置“商务精英”、“清甜马卡龙”及“深邃暗黑”三套精美主题。
  - **线条风格**：支持圆角、直角和波浪线三种线条风格。
  - **手绘滤镜**：可选的手绘风滤镜（通过 SVG Filter 实现）。
- 📎 **多媒体支持**：
  - 支持在节点中上传并展示图片（宫格排列）。
  - 支持为节点添加文件附件（PDF、Word、TXT 等）。
- 交互体验：
  - 流畅的缩放（鼠标滚轮/双指捏合）与平移。
  - 节点拖拽布局与实时自动重绘。
  - 响应式设计，适配移动端。
- 🛡️ **隐私与本地化**：API Key 本地存储，确保数据安全。

## 🛠️ 技术栈

- **前端框架**：Vue 3 (Composition API)
- **构建工具**：Vite
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **图标**：Lucide Vue Next
- **AI 引擎**：OpenAI SDK (配置为 DeepSeek 接口)
- **渲染技术**：原生 SVG + 动态布局算法

## 🚀 快速上手

### 环境要求
- Node.js 18.x 或更高版本
- npm 或 pnpm

### 安装步骤

1. 克隆仓库：
   ```bash
   git clone https://github.com/your-username/mindmap-ai.git
   cd mindmap-ai
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

4. 构建项目：
   ```bash
   npm run build
   ```

## ⚙️ 配置说明

在使用 AI 分解功能前，你需要在浏览器控制台或通过应用界面设置你的 DeepSeek API Key。

1. 获取 [DeepSeek API Key](https://platform.deepseek.com/)。
2. 应用启动后，系统会默认尝试从 `localStorage` 读取 `deepseek_api_key`。
3. 可以在代码中使用 `setApiKey('your-key')` 进行设置。

## 📂 项目结构

```text
mindmap-ai/
├── src/
│   ├── assets/             # 静态资源
│   ├── components/         # 组件
│   │   └── CustomMindMap.vue # 核心思维导图渲染组件
│   ├── services/           # 服务层
│   │   ├── ai.ts           # DeepSeek API 集成
│   │   ├── storage.ts      # 文件上传与存储逻辑
│   │   └── fileSystem.ts   # 本地文件操作
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # 工具函数
│   ├── App.vue             # 主应用入口
│   └── main.ts             # 挂载脚本
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

## 📝 开源协议

MIT License.