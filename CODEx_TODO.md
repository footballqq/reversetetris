# CODEx_TODO.md

- [x] 修复: 天花板下降直接导致 AI 输掉的问题 (Top Out 逻辑优化)
    - [x] 修改 `Grid.isGameOver` 以天花板为死亡线
    - [x] 在 `Renderer` 中始终显示发光的天花板警戒线 (Ceiling Bar)
    - [x] 修复 AI 生成点：方块现在在天花板下方生成，避免“出生即死”
- [x] 功能: 在 UI 中显示已下降的方块数量 (BLOCKS)
- [x] 优化: 天花板下降的时机与 AI 的感知逻辑 (已实现降落频率调整与净收益评估)
- [x] 文档: 更新 `AIStrategy.md` 与游戏内 `How to Play` 说明
- [x] 修复: 彻底解决 AI 预测与落点执行不一致的问题 (统一搜索逻辑)
