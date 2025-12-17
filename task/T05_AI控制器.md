# T05 - AI 控制器 (AIController)

## 阶段
**Phase 3: AI 实现**

## 目标
实现 AI 自动放置方块的决策算法，支持不同难度等级。

## 任务清单

### 5.1 评分系统设计
- [x] 创建 `src/ai/AIController.ts`
- [x] 定义评分权重接口
```typescript
interface AIWeights {
  heightWeight: number;      // 总高度惩罚（负值）
  linesWeight: number;       // 消行奖励（正值）
  holesWeight: number;       // 空洞惩罚（负值，最重要）
  bumpinessWeight: number;   // 表面不平整惩罚（负值）
}
```

### 5.2 核心算法
- [x] `findBestMove(grid, piece)`: 返回最佳落点 `{ x, rotation, score }`
- [x] 遍历所有可能的 (x, rotation) 组合
- [x] 模拟放置后计算评分
- [x] 返回得分最高的位置

### 5.3 评分函数
- [x] `evaluateGrid(grid)`: 对网格状态打分
  - 计算聚合高度（所有列高度之和）
  - 计算完整行数
  - 计算空洞数量
  - 计算相邻列高度差之和（bumpiness）

### 5.4 难度预设
```typescript
const AI_DIFFICULTY = {
  EASY: {
    heightWeight: -0.3,
    linesWeight: 0.5,
    holesWeight: -0.5,
    bumpinessWeight: -0.2,
    randomFactor: 0.3,  // 30% 概率随机选择
  },
  NORMAL: {
    heightWeight: -0.51,
    linesWeight: 0.76,
    holesWeight: -0.36,
    bumpinessWeight: -0.18,
    randomFactor: 0,
  },
  HARD: {
    // 同 NORMAL，但启用 Lookahead
    ...NORMAL,
    lookahead: 1,
  }
};
```

### 5.5 高级功能（可选）
- [ ] Lookahead：考虑下一个可能的方块
- [ ] 添加随机失误（降低 AI 智商）

## 验收标准
- AI 可以自动找到任意方块的最佳落点
- 不同难度 AI 表现有明显差异
- 算法效率：单次决策 < 50ms

## 预计工时
4-6 小时

## 依赖
- T02（Grid 克隆、评估方法）
- T03（Piece 数据）

## 参考资料
- Pierre Dellacherie 算法
- El-Tetris 论文
