# Reverse Tetris (反向俄罗斯方块)

![Game Banner](docs/banner.png) *<!-- 你可以在 docs 目录下添加一张游戏截图作为 Banner -->*

## 🎮 游戏简介

**Reverse Tetris** 是一款创新的反向俄罗斯方块游戏。与传统玩法不同，你不再直接控制方块的下落，而是扮演"发牌员"的角色！

你的目标是**从给出的三个选项中选择最"合适"的方块投喂给 AI**。
- **作为玩家**：你需要根据当前关卡的目标，精心策划，给 AI 制造消除机会，或者故意给 AI 制造麻烦（取决于游戏模式，但在本游戏中通常是帮助 AI 消除或者在对战模式中坑害 AI，本作目前的模式是**给 AI 喂方块，帮助 AI 消除行数以过关**，或者在无尽模式中看 AI 能坚持多久）。

*(注：当前核心玩法设定为帮助 AI 消除指定行数以通过关卡)*

## ✨ 核心特性

- **反向玩法**：独特的"我选你下"机制，考验策略规划能力。
- **智能 AI**：内置基于启发式算法的 AI，会自动计算最佳落点。
- **关卡系统**：包含 100+ 个难度递增的关卡，具备不同的初始盘面和挑战目标。
- **视觉盛宴**：流畅的粒子特效、屏幕震动反馈以及霓虹风格的现代 UI。
- **全平台适配**：基于 HTML5 Canvas 开发，完美支持 PC 与 移动端，自适应各种屏幕尺寸。

## 🚀 快速开始

### 环境要求
- Node.js (推荐 v16+)
- npm 或 yarn

### 安装步骤

1. **克隆项目 / 下载源码**
   ```bash
   git clone <repository_url>
   cd reversetetris
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **开始游戏**
   打开浏览器访问终端显示的地址（通常是 `http://localhost:5173`）。

### 构建生产版本
```bash
npm run build
```
构建产物将生成在 `dist` 目录下。

## ☁️ 部署（Cloudflare Pages）

你遇到的“能访问但黑屏、只剩一个🔇按钮”的典型原因是：`dist/index.html` 里引用静态资源用了**绝对路径**（例如 `/assets/...`），当站点实际被托管在**子路径**下时会导致资源 404，JS 没加载 → 页面只剩 HTML 里的那个按钮。

本项目已在 `vite.config.ts` 设置 `base: './'`，构建后会生成 `./assets/...` 的**相对路径**，在 Cloudflare Pages/子路径/纯静态上传场景都更稳。

### 方式 A：让 Cloudflare Pages 自动构建（推荐）
- **Build command**：`npm run build`
- **Build output directory**：`dist`
- （可选）**Node 版本**：16+（与本地一致即可）

### 方式 B：只上传静态文件（dist）
- 确保上传的是 `dist/` 目录“里面的内容”（根目录有 `index.html` 和 `assets/`），而不是把整个 `dist/` 再嵌套一层。
- 使用 Wrangler 可直接部署：`npx wrangler pages deploy dist`

## 🕹️ 操作指南

### 游戏目标
每个关卡都有一个**消除行数**的目标（例如：消除 10 行）。达成目标即可解锁下一关。

### 交互方式
- **PC 端**：
  - **点击** 右侧（或下方）的三个方块之一进行选择。
  - **键盘快捷键**：
    - `1`, `2`, `3`: 选择对应位置的方块。
    - `P`: 暂停游戏。
    - `R`: 重新开始。
    - `Esc`: 打开菜单。
  
- **移动端**：
  - **点击/触摸** 屏幕上的候选方块直接选择。
  - 界面会自动适配竖屏操作。

## 🛠️ 技术栈

- **语言**: TypeScript
- **构建工具**: Vite
- **渲染引擎**:原生 HTML5 Canvas API (无第三方渲染库)
- **样式**: CSS3 (Variables, Flex/Grid)
- **架构**: 
  - ECS (Entity-Component-System) 风格的模块化设计
  - 独立的 AI 运算层 (`AIController`)
  - 事件驱动的 UI 管理 (`InputManager` -> `GameEngine` -> `Renderer`)

## 📂 目录结构

```
src/
├── ai/             # AI 核心逻辑 (评估函数、搜索算法)
├── audio/          # 音频管理 (Web Audio API)
├── core/           # 游戏核心 (GameEngine, Grid, Piece)
├── levels/         # 关卡生成器与配置
├── render/         # 渲染系统 (Renderer, Animator, Particles)
├── ui/             # UI 交互与输入管理
├── main.ts         # 程序入口
└── style.css       # 全局样式
```

## 📝 开发计划 & 待办

查看 [task 目录](./task/) 获取详细的开发任务列表与进度。

- [x] 核心玩法实现
- [x] 关卡系统
- [x] 移动端移动适配
- [ ] 更多特殊方块
- [ ] 在线排行榜 (规划中)

## 🤝 贡献

欢迎提交 Issue 或 Pull Request！

## 📄 许可证

MIT License

npm run dev       # 开发模式，热更新，未编译（Vite/Webpack）
npm run build     # 编译打包
npm run preview   # 预览编译结果

 npx serve .\dist

# 在当前目录启动服务器
serve

# 指定目录
serve ./dist

# 指定端口
serve -p 3000

# 单页应用模式（所有路由指向 index.html）
serve -s ./dist

这是 Windows PowerShell 的 PATH 问题，npm 全局安装的包没有加入环境变量。
解决方法
方法 1：用 npx 运行（最简单）
bashDownloadCopy codenpx serve
方法 2：添加 npm 全局路径到 PATH
先查看 npm 全局安装路径：
bashDownloadCopy codenpm config get prefix
然后把返回的路径（通常是 C:\Users\你的用户名\AppData\Roaming\npm）添加到系统环境变量 PATH 中。
添加后重启终端即可。
方法 3：用完整路径运行
bashDownloadCopy code# 查看 serve 安装位置
npm list -g serve

# 直接运行
& "$(npm config get prefix)\serve"
建议先用 npx serve 快速解决，后续再处理 PATH 问题。