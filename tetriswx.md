# Reverse Tetris 微信小程序「完全复刻」迁移方案（先方案，不写代码）

目标：把当前 Web 版 Reverse Tetris（Vite + TypeScript + Canvas + DOM/CSS 覆盖层）在微信小程序内**功能与体验尽量一致**地复刻：菜单/关卡/设置/暂停/胜负结算/分享、统计与存档、AI 日志面板、移动端交互、音效与 BGM、（可选）调试 HUD 与版本显示。

---

## 1. 关键结论（可行性与难点）

- **可行**：核心渲染已是 Canvas 2D；迁移到小程序 `canvas`（2D）是“适配而非重写”。
- **最大成本**：Web 的 DOM + CSS 覆盖层（UIManager）要改成小程序 WXML + WXSS + 组件体系；Web API（`window/document/localStorage/navigator.share/clipboard` 等）要替换为 `wx.*`。
- **分享“完全一致”不可能**：小程序分享受平台约束（必须通过用户手势触发；朋友圈/聊天的文案可控范围有限）。但可以做到“点击 Share -> 弹出转发 + 自动生成炫耀标题/口号 + 一键复制文案 + 生成海报可保存”，传播效果等价甚至更强。

---

## 2. 复刻范围（Feature Parity Checklist）

### 2.1 玩法与逻辑
- 反向投喂（3 选 1）
- AI 自动落子与动画队列
- 天花板下降规则（按难度间隔）
- 关卡系统（含底层杂乱盘面）
- 胜负判定（含 top-out 边界修复：出生点无合法落点/触顶/天花板下降压到块）
- 难度 easy/normal/hard/god 与 AI 权重

### 2.2 UI/交互
- 主菜单：Start / Levels / Stats / HowTo / Settings
- 关卡选择（解锁逻辑）
- 暂停菜单（手机无 Esc：提供左上角 ☰ 按钮，等效 Esc）
- 胜利/失败结算（显示本局数据 + Share）
- HUD（关卡/目标/进度）
- AI Log 面板（查看 + 复制）

### 2.3 存档与统计
- 本地存档：累计分数、累计消行、累计投喂块数、最高通关、成就
- 关卡解锁进度（至少能复刻现有逻辑）

### 2.4 音频
- 点击/消行/胜利/失败等音效
- BGM 循环 + 开关按钮

### 2.5 分享传播
- 分享到聊天/群：使用小程序转发能力（`onShareAppMessage`）
- 分享到朋友圈：提供“生成海报 -> 保存到相册 -> 发朋友圈”的强传播路径（推荐）
- 分享内容含：关卡、难度、投喂块数、电脑消行进度、夸张口号

---

## 3. 技术选型（建议）

### 3.1 小程序技术路线
- **原生微信小程序 + TypeScript**（最稳、性能最好、Canvas 兼容性可控）
- 引入：`miniprogram-api-typings`（类型提示）
- 构建：微信开发者工具自带构建，或用轻量脚手架做 TS 编译与路径别名（不引入重框架，降低不确定性）

> 备选：Taro/uni-app 可做 UI 迁移更快，但 Canvas 2D、性能、API 细节和调试成本更高；“完全复刻 + 性能优先”更适合原生路线。

### 3.2 Canvas 方案
- 使用 `canvas` 组件的 **2D context**（通过 `createSelectorQuery().select('#game').node()` 获取 `Canvas` 节点并 `getContext('2d')`）。
- DPR 适配：按 `wx.getSystemInfoSync().pixelRatio` 设置 `canvas.width/height`，再 `ctx.scale(dpr, dpr)`，保持逻辑坐标为 CSS 像素。

### 3.3 音频方案
- Web Audio（振荡器）在小程序不等价：改为 **音频素材文件**（mp3/wav）+ `wx.createInnerAudioContext()`：
  - BGM：1 个 `InnerAudioContext`，`loop=true`
  - SFX：短音效用复用或对象池（避免频繁创建导致卡顿）

---

## 4. 项目结构（建议落地形态）

### 4.1 代码分层
- **core/**：纯逻辑（Grid/Piece/GameEngine/LevelGenerator/AIController）尽量保持不依赖平台
- **platform/wx/**：微信适配层（Storage/Clipboard/Share/Audio/Time/Canvas）
- **render/**：Renderer 保持 canvas 2D，但把“获取尺寸/监听 resize”改成由外部注入（微信端由页面负责）
- **ui/**：由 Web 的 UIManager（DOM 拼接）迁移为小程序组件（WXML/WXSS）

### 4.2 页面与组件划分
- `pages/game/index`：单页承载游戏（canvas + overlays）
- 组件：
  - `components/overlay-menu`
  - `components/overlay-levels`
  - `components/overlay-stats`
  - `components/overlay-howto`
  - `components/overlay-settings`
  - `components/overlay-pause`
  - `components/overlay-result`（win/lose 共用）
  - `components/ai-log-panel`
  - `components/topbar`（☰ 菜单 + 🔊/🔇 + 可选 debug/version）

---

## 5. 现有 Web 代码到小程序的映射（迁移清单）

### 5.1 直接复用（理论上不改或微改）
- `src/core/*`（除存档 API）
- `src/ai/*`（除可能的 `performance.now`/随机数来源，统一封装）
- `src/levels/*`

### 5.2 需要改造（平台相关）
- `SaveManager`：`localStorage` -> `wx.getStorageSync/setStorageSync`
- 分享：`navigator.share/clipboard` -> `open-type="share"` + `wx.setClipboardData`
- UIManager：DOM 拼接 -> WXML 组件（彻底替换）
- Renderer：`window.innerWidth/innerHeight`、`window.addEventListener('resize')` -> 由页面在 `onReady/onResize` 推送尺寸
- InputManager：DOM 事件 -> 小程序 touch 事件（手动换算坐标）
- 音频：Web Audio -> InnerAudioContext + 音效资源

---

## 6. 游戏循环与时钟（微信环境）

### 6.1 帧循环
小程序没有标准 `requestAnimationFrame` 一致行为（不同基础库/机型差异），建议：
- 用 `setTimeout`/`setInterval` 以 60fps 近似（16ms），同时用 `Date.now()` 计算 `dt`
- 或使用 `wx.createSelectorQuery` 获取 canvas 节点后，如果该 context 支持 `requestAnimationFrame` 则优先用（能力检测）

### 6.2 生命周期
- `onShow`：恢复渲染/音频（必要时）
- `onHide`：自动暂停（弹出 pause overlay + 停止循环/音频）

---

## 7. 输入与坐标（触控）

- 监听 `bindtouchstart/bindtouchmove`（至少 touchstart 必须）
- 坐标换算：用 canvas 的实际显示区域（通过 `createSelectorQuery().select('#game').boundingClientRect` 获取 left/top/width/height），将 `touch.clientX/clientY` 映射到逻辑坐标
- 保持与现有 `Renderer.layout` 计算一致，确保“点候选方块选择”的手感一致

---

## 8. 分享设计（微信约束下的“等效复刻”）

### 8.1 分享触发
结算页提供两个动作：
1) **转发给朋友/群**：按钮 `open-type="share"`（这是微信允许的方式）
2) **复制炫耀文案**：按钮调用 `wx.setClipboardData`（解决你现在 Web 端分享文案问题并增强传播）
3) （推荐增强）**生成海报并保存**：在离屏 canvas 画“炫耀海报”（大标题 + 成绩 + 口号 + 二维码/小程序码占位），用 `wx.canvasToTempFilePath` + `wx.saveImageToPhotosAlbum`，用于朋友圈传播

### 8.2 分享内容生成策略
- 标题（用于 `onShareAppMessage.title`）：短、夸张、含关卡与难度，例如：
  - `第${level}关把电脑顶飞了！敢来试试吗？`
  - `我喂了${pieces}块把AI逼到触顶，爽！`
- 路径（`path`）：`/pages/game/index?share=1&level=...&d=...`
  - 分享落地页可以展示“挑战同款关卡/同难度”的引导（不改变主流程）
- 文案（微信转发卡片无法带长文）：放到“复制文案”和“海报”里，长文可与当前 Web 版一致

> 注意：朋友圈分享（`onShareTimeline`）能力和文案可控范围更少，因此“海报保存”是更可靠的朋友圈传播方案。

---

## 9. AI Log 面板复刻

- 用 `scroll-view` + `text` 或 `textarea disabled` 显示日志
- “复制”按钮：`wx.setClipboardData({ data: logText })`
- “关闭/展开”状态存本地（可选）

---

## 10. 音频复刻策略

### 10.1 资源
- BGM：1 个循环文件
- SFX：click/clear/drop/win/lose 各 1 个短音效

### 10.2 播放管理
- AudioManager 改写为微信版：内部维护 contexts
- 静音状态：存 `wx.setStorageSync`
- iOS 首次播放限制：必须由用户手势触发（点击 Start/选择方块时初始化/解锁）

---

## 11. 性能与兼容（必须做的验收项）

- 低端机 60fps 不强求，但必须“不卡输入、不卡 UI、动画流畅”
- canvas 重绘：保持每帧全量绘制（简单可靠），如出现性能问题再做局部优化
- AI 计算：若 god 难度在低端机卡顿，考虑迁移到 `worker`（微信支持 Worker），主线程只做渲染与输入

---

## 12. 测试与验收（Definition of Done）

### 12.1 功能验收
- 关卡进入/选择/返回、难度切换生效
- 选择方块触控准确
- 天花板下降规则与 Web 一致
- 胜负判定与 Web 一致（含边界：出生点堵住、触顶、天花板压到块）
- 存档累计数据正确（重启小程序后仍在）
- 结算页展示数据正确
- Share：转发能触发、复制文案可用、海报可保存（如做）

### 12.2 回归对齐方式（建议）
为保证“完全复刻”，给 Web 与小程序都增加一个“确定性模式”（同种子随机），用同一局输入序列比对关键状态（可作为后续增强；本方案阶段先以人工对齐为主）。

---

## 13. 里程碑计划（完全复刻的实施顺序）

1) **打底：渲染跑通**
   - canvas 2D 初始化 + DPR + 游戏循环 + Renderer 适配
2) **输入跑通**
   - 触控选择候选方块、暂停按钮 ☰、BGM 开关
3) **UI 复刻（菜单/关卡/设置/暂停/结算）**
   - 用组件逐个替换 UIManager 的 overlay
4) **存档与统计**
   - SaveManager 微信化 + Stats 页 + 解锁逻辑
5) **分享闭环**
   - 转发（open-type share）+ 复制文案 +（可选）海报保存
6) **性能与兼容收尾**
   - 机型测试、Worker（如需要）、资源体积控制、审核自查

---

## 14. 风险清单与规避

- **分享限制导致“文案不一致”**：转发只做短标题；长文放到“复制文案”和“海报”里（等效传播）。
- **音频行为差异**：全部用音频素材；首次播放绑定用户点击（避免 iOS 静音/失败）。
- **Canvas 差异**：避免依赖少见 API（如复杂文本测量/阴影过度）；必要时降级效果，保证玩法一致。
- **AI 性能**：先复刻，再按数据决定是否上 Worker。

---

## 15. 输出物（最终交付形态）

- 一个微信小程序项目，`pages/game/index` 单页承载全部 UI 与 canvas
- 功能与 Web 版对齐：玩法、UI、存档、结算、分享、音频
- 一份“对齐检查表”（上述验收项）用于每次迭代回归

