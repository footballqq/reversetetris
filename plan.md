# 反向俄罗斯方块 (Reverse Tetris) - 游戏设计方案

## 1. 游戏概述 (Game Overview)
**核心概念**：打破传统俄罗斯方块玩家消除行的模式，本游戏中玩家扮演“捣乱者”（Chaos），电脑 AI 扮演“整理者”（Order）。
**目标**：玩家通过选择方块投喂给 AI，利用刁钻的方块组合迫使 AI 无法消除行并最终堆叠至触顶（Game Over），从而获得胜利。
**平台**：Web (HTML5/Canvas) 优先，架构设计需兼容移动端 (iOS/Android) 移植。

## 2. 核心玩法 (Core Mechanics)

### 2.1 游戏循环 (Game Loop)
1.  **生成阶段**：系统随机生成 3 个待选方块（Tetrominoes）。
2.  **决策阶段**：玩家在有限时间内（或无限制）从 3 个选项中选择 1 个“最难处理”的方块。
    *   *付费/高级功能*：可选范围扩大至 4 个，增加玩家策略深度。
3.  **执行阶段**：AI 接手该方块，在 0.5 秒内计算最优点并完成落子操作。
4.  **判定阶段**：
    *   **消行**：如果 AI 成功消行，分数/进度增加（对玩家不利）。
    *   **堆叠**：如果没有消行，方块堆积。
    *   **胜负**：
        *   **玩家胜**：AI 堆叠触顶（Top Out）。
        *   **玩家负**：AI 坚持存活一定回合数，或消除了指定数量的行（视关卡目标而定）。

### 2.2 玩家操作 (Player Input)
*   **Web端**：鼠标点击或键盘选择（1, 2, 3）。
*   **移动端**：屏幕下方大按钮点击选择。
*   **交互反馈**：选择后方块飞入棋盘，AI 快速移动放置。

### 2.3 AI 行为 (AI Behavior)
电脑需要具备模拟人类高手的摆放能力，但需根据关卡难度分级。
*   **决策时间限制**：0.5秒（模拟“思考+操作”延迟，避免瞬移造成的视觉混乱）。
*   **算法逻辑**：评分系统（Cost Function）。
    *   AI 会计算所有可能的落点（位置 + 旋转）。
    *   **评分标准**（AI 倾向于）：
        *   降低整体高度。
        *   减少空洞（Holes）。
        *   增加消行潜力。
        *   保持表面平整度（减少“井”）。
    *   AI 会选择得分最高的落点。

## 3. 关卡与难度设计 (Levels & Difficulty)
共计 100 关 + 随机无尽模式。

### 3.1 难度曲线变量
1.  **AI 智商 (AI Intelligence)**：
    *   *Lv 1-10 (Dumb)*：只看当前一步，权重偏向随意，容易失误。
    *   *Lv 11-50 (Normal)*：标准 Pierre Dellacherie 算法变体，注重平稳。
    *   *Lv 51-100 (God)*：具备 Lookahead（向后看一步），预判玩家意图，极难“坑”死。
2.  **另外的存活条件**：
    *   初期关卡：AI 只要消除 5 行就算玩家输。
    *   后期关卡：AI 需要消除 20 行，甚至更久，玩家有更多机会制造混乱。
3.  **初始盘面**：
    *   关卡开始时，盘面上可能已经预置了一些垃圾行（Garbage Lines）。
    *   有趣的设定：预置的垃圾行可能留有明显缺口（给 AI 机会），也可能杂乱无章（帮玩家忙）。

### 3.2 关卡结构示例
*   **Level 1**: 空盘，AI 智商低，AI 需消除 3 行获胜。玩家极易通过制造空洞取胜。
*   **Level 10**: 盘面有一半高度的垃圾块，AI 智商中等。
*   **Level 50 (Boss)**: AI 智商极高，速度快（0.3s），需让 AI 存活 2 分钟。

## 4. 技术架构 (Technical Architecture)

### 4.1 技术栈
*   **语言**：TypeScript / JavaScript (ES6+)。
*   **渲染**：HTML5 Canvas (高性能，易移植)。
*   **框架**：无重型游戏引擎，使用轻量级架构（MVC 模式）。
    *   `Model`: Tetris 逻辑、Grid 数据、AI 算法。
    *   `View`: Canvas 绘制、动画效果。
    *   `Controller`: 下落循环、用户输入响应。
*   **打包**：Vite (快速开发)。

### 4.2 移动端移植 (Portability)
*   设计遵循 **Responsive Web Design**。
*   Canvas 大小动态适配屏幕宽高比（Aspect Ratio）。
*   UI 控件（选择按钮）位于屏幕底部，适应手指操作区域。
*   未来可通过 **Capacitor** 或 **Cordova** 包装为原生 App。

### 4.3 音频 (Audio)
*   不依赖外部 MP3/WAV 文件。
*   使用 **Web Audio API** 实时合成。
    *   **BGM**: 简单的波形合成（Oscillator），生成类 8-bit 复古风格循环音乐。
    *   **SFX**: 落子声、消行声、GameOver 声通过合成器生成。

## 5. 详细功能模块 (Component Breakdown)

| 模块 | 功能描述 | 复杂度 |
| :--- | :--- | :--- |
| **GameEngine** | 核心循环，状态管理（Menu, Playing, Paused, Win, Lose） | 中 |
| **GridSystem** | 10x20 网格数据结构，碰撞检测，行消除检测 | 中 |
| **PieceFactory** | 生成 7 种标准方块，支持 SRS 旋转规则（可选简化版） | 低 |
| **AIController** | 核心难点。输入Grid和当前方块，输出最佳 `(x, rotation)` | 高 |
| **InputManager** | 鼠标/触摸事件处理，映射到游戏选块逻辑 | 低 |
| **Renderer** | 绘制网格、方块、幽灵块（Ghost Piece）、UI 覆盖层 | 中 |
| **AudioManager** | Web Audio API 封装，播放音效和 BGM | 中 |

## 6. 开发计划 (Implementation Steps)
1.  **基础设施**：搭建 Vite + TS 环境，设置 Canvas。
2.  **核心逻辑**：实现俄罗斯方块基本规则（移动、旋转、堆叠、消行）。
3.  **AI 实现**：编写评分算法，让电脑能自动玩。
4.  **交互层**：实现“玩家三选一”机制对接 AI。
5.  **关卡系统**：配置 1-100 关数据结构。
6.  **UI/UX**：美化界面，添加动画和音频。
7.  **适配**：移动端触摸优化。

## 7. 暂存数据结构 (AI Score Weights)
为了方便调整 AI 性格，我们将权重参数化：
```typescript
interface AIWeights {
    heightWeight: number;       // 总高度惩罚
    linesWeight: number;        // 消行奖励
    holesWeight: number;        // 空洞惩罚（最重要）
    bumpinessWeight: number;    // 表面不平整惩罚
}
```
通过调整这些权重，可以创造出不同风格的 AI（例如：激进消行型、保守堆叠型）。
