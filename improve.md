# Toxic Pieces 扩展（实现说明 + 设计约束）

本文件记录“毒块（更难消除/更容易制造洞与井）”的设计目标、落地约束与本仓库的实现点。  
注意：不包含“按关卡/等级精细编排毒块池”的关卡设计，仅提供通用机制与默认参数。

---

## 1. 目标

- 引入更“恶心”的块形（Pentomino / 类 Hexomino / 内凹 / 细长蛇形 / 门框），让玩家可以更稳定地给 AI 制造：
  - 侧向封闭井（wells）
  - 经典洞（holes）
  - 锯齿与高塔（bumpiness / max height）
- 同时避免“连续刷毒块”把游戏变成纯 RNG 崩盘：
  - 候选集中最多出现 1 个毒块
  - 毒块出现有冷却（cooldown）与平均间隔（token bucket）
- 确保 AI 与渲染/碰撞对新块完全兼容：
  - 每个新块必须定义 4 个旋转态（对称也重复填满）
  - AI 的横向搜索范围基于块的 minX/maxX 动态计算，避免漏解/越界

---

## 2. 毒块清单（已实现）

### 2.1 Pentomino（5 格）
- `PENTO_U`
- `PENTO_W`
- `PENTO_F`
- `PENTO_Y`
- `PENTO_V`

### 2.2 细长不直（蛇形）
- `SNAKE_5`（5 格）
- `SNAKE_6`（6 格）

### 2.3 内凹/门框
- `DOORFRAME_7`（7 格，“门框/Π型”）
- 现有 `SQUARE_HOLLOW`（8 格，3×3 去中心）也属于强毒块

---

## 3. 特殊块生成规则（已实现，默认全局生效）

> 关卡设计不在此阶段做，因此这里是“全局默认规则”，后续可接入 LevelConfig 做分段调参。

### 3.1 候选集约束
- 每回合候选集（默认 3 个）最多包含 `1` 个毒块：`maxToxicPerSet = 1`

### 3.2 毒块出现节奏（令牌桶 + 冷却）
- 令牌桶：每回合累积 `1 / toxicEveryTurns` 个令牌，上限 1；当令牌达到 1 且冷却为 0 时可发放 1 个毒块并消耗 1 令牌
- 冷却：发放毒块后设置 `toxicCooldownTurns`，在冷却期间不再发放

默认参数（可后续再调）：
- `toxicEveryTurns = 8`（平均 8 回合 1 次）
- `toxicCooldownTurns = 6`
- `maxToxicPerSet = 1`

### 3.3 与现有金色 special 的关系
- 现有 `specialChance`（LONG_I/CROSS/SQUARE_HOLLOW）逻辑保留
- 毒块作为独立机制插入候选集；不会出现“候选 3 个全是毒块”

---

## 4. AI 适配要点（已实现）

- AI 横向搜索范围不再写死 `x=-2..WIDTH+2`，改为对每个 rotation 的 blocks 计算：
  - `minX = min(block.x)`，`maxX = max(block.x)`
  - 可行 offsetX 范围：`x ∈ [-minX, (WIDTH-1) - maxX]`
- 这样可以：
  - 覆盖超宽块（6/7/8 格）所有合法位置
  - 避免无效 x 导致大量无谓碰撞检查

---

## 5. 实现入口（代码位置）

- 新块枚举：`src/core/PieceType.ts`
- 新块旋转坐标与颜色/ID：`src/core/PieceData.ts`
- 候选集毒块上限/冷却：`src/core/PieceFactory.ts`
- AI 横向搜索范围：`src/ai/AIController.ts`

