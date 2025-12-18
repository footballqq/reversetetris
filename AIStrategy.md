# AIStrategy（当前实现说明）

本项目的 AI 目标是：在给定棋盘 `Grid` 与当前方块 `Piece` 的情况下，从所有可落点中选择一个落点，使局面在“洞/被盖住的空格”层面尽量健康、并尽量消行与保持低高度，从而更不容易触顶。

> 注意：当前实现是“单步启发式”（one-ply heuristic），未实现 lookahead；也未做“可达性搜索”（是否真能从出生位置移动/旋转到该落点），因此会存在一些看起来“人类能更好摆放”的情况，后续会通过日志复现并针对性补指标或做搜索改进。

---

## 1. 决策入口与落点枚举

文件：`src/ai/AIController.ts`

核心方法：`AIController.findBestMove(grid, piece, weights)`

枚举方式：

- 遍历旋转 `r = 0..3`
- 遍历 `x`（当前实现为 `-2 .. Grid.WIDTH + 1` 的宽松范围）
- 对每个 `(x, r)`：
  - 若在 `y=0` 不能放置则跳过（简单的出生位可放判断）
  - 用“硬降落”方式从上往下找最大可放的 `y`
  - 在克隆棋盘上模拟 `lockPiece` 并执行 `clearLines` 后评估指标

评估是在“锁定+清行后”的棋盘上做的，因此“能消行的摆法”会体现在最终指标（例如洞减少、总高度降低）。

---

## 2. 评估指标（Metrics）

文件：`src/core/Grid.ts`、`src/ai/AIController.ts`

### 2.1 `holes`（经典隔空洞）

`Grid.countHoles()`：同一列中，出现过方块后，在其下方出现的空格数量。

- 这是“被上方盖住”的洞，通常最难修复，是最高优先级风险之一。

### 2.2 `holesCreated`（新增隔空洞）

`holesCreated` 是“落子后新增的洞”的数量，用洞位图对比计算：

- `holesBeforeMap`：落子前洞位图
- `holesAfterMap`：落子后（含清行后）洞位图
- `holesCreated = after && !before` 的格子数

它解决“净洞数相同但这一手引入了新的洞”的情况：AI 会倾向于不制造新洞。

### 2.3 `blockades`（洞上方压着的方块数）

`Grid.countBlockades()`：同一列里，只要该方块下方存在空格，就计为一个 blockade。

洞越多、压洞的方块越多，后续越难修复。这个指标用于区分同洞数下的“洞是否更难填”。

### 2.4 `wellSums`（井/夹缝）

`Grid.getWellSums()`：空格若左右两侧（或一侧是墙）都是方块，则属于“井格”。使用深度累加的方式惩罚深井（1+2+...）。

它捕捉“左右夹空/靠墙夹空”的结构性风险，避免形成深井。

### 2.5 高度与平整度

- `maxHeight`：`Grid.getHeight()`，棋盘最高列高度（越高越接近触顶）
- `aggregateHeight`：`Grid.getAggregateHeight()`，各列高度之和
- `bumpiness`：`Grid.getBumpiness()`，相邻列高度差之和（越大越“分散/不平”）

---

## 3. 难度与比较规则（Strategy）

文件：`src/ai/AIController.ts`、`src/levels/LevelConfig.ts`、`src/core/GameEngine.ts`

### 3.1 EASY / NORMAL / HARD（加权评分）

对每个候选落点计算：

```
score =
  aggregateHeight * heightWeight
  + linesCleared * linesWeight
  + holes * holesWeight
  + wellSums * wellsWeight(默认从 holesWeight 派生)
  + blockades * (holesWeight * 0.5)
  + bumpiness * bumpinessWeight
  + topOutPenalty(若立即触顶，极大负分)
```

并选取 `score` 最大的落点（低难度可带随机噪声）。

### 3.2 GOD（词典序优先级，硬规则）

GOD 不主要看加权分，而是按“硬优先级”逐层比较（越前面越硬）：

1. 不立即触顶（`gameOverAfterMove=false` 优先）
2. `holes` 更少
3. `holesCreated` 更少
4. `blockades` 更少
5. `wellSums` 更少
6. `linesCleared` 更多
7. `aggregateHeight` 更低
8. `bumpiness` 更低
9. （可选）更靠边（`edgeDistance` 更小，作为最后平局决胜）
10. 仍平局时用 `score` 兜底

这样可以最大程度符合“先别留洞/别造洞，再谈消行与高度”的策略偏好。

### 3.3 难度覆盖（UI 设置 vs 关卡默认）

`GameEngine.setDifficulty(...)` 会设置一个“难度覆盖”（override），`loadLevel` 会优先使用该覆盖而不是关卡默认难度，以保证你在 Settings 里选的难度能真实生效，并且 HUD 显示一致。

---

## 4. 解释你看到的“为什么不去右边/不消行”

当你觉得某个摆法更好时，通常有三类原因：

1) **指标取舍**：例如“去右边更低”但会造成 `holesCreated` 或 `blockades` 更高，GOD 会拒绝。

2) **可达性缺失**：当前 AI 只判断“该落点是否能在棋盘中硬降落”，不保证从出生位真的能通过移动/旋转到达（没有 BFS/墙踢/SRS），因此可能与人类直觉不一致。

3) **井定义不足**：你提到“不是两边夹的 well 但也像一种凹槽”，这类结构可能需要额外指标（例如边缘凹槽/transition 指标/row+col transitions），后续可根据日志补。

---

## 5. 调试与复现（强烈推荐）

### 5.1 HUD 快捷键

- `D`：开关 debug HUD（显示 `HOLES(+NEW) / BLOCK / WELLS / PRED ...`）
- `V`：开关版本号显示（底部一行 `vX.Y.Z+<sha>`）
- `S`：开关 AI LOG 面板（右侧文本框，带 COPY）

### 5.2 AI LOG 内容（用于复现）

打开 `S` 后可复制：

- 当前时间、版本号、难度、回合数
- 当前棋盘 `grid=...`（22x10 数组）
- `order=...`：GOD 词典序比较链
- `decidedBy=...`：best 与第二名第一个出现差异的指标
- `best` 与 `top(N/M)` 候选列表：每条含 `holes/holesCreated/blockades/wellSums/maxHeight/aggregateHeight/...`

你把该 log 发回来即可 1:1 重放与定位。

---

## 6. 已知短板与下一步方向（不在本次实现范围）

- Lookahead（2-step）：对下一块做期望或最坏情况（minimax）评估，解决单步短视。
- 可达性搜索：加入 BFS（含旋转）+ SRS/墙踢，避免“理论落点可放但实际到不了”的问题。
- 更丰富的结构指标：row/column transitions、well 变体、edge-well、surface parity 等。

