
import { Grid } from '@/core/Grid';
import { LevelConfig, DIFFICULTY_MAP, AIDifficultyLevel } from './LevelConfig';

export class LevelGenerator {

    public static generateLevel(id: number): LevelConfig {
        let diff: AIDifficultyLevel = 'easy';
        let targetLines = 12;
        let speed = 500;
        let initialGrid: number[][] | undefined = undefined;
        let pieceChoices = 3;

        if (id <= 10) {
            diff = 'easy';
            // Give the player more time to learn the "feed the AI" strategy.
            targetLines = 10 + Math.floor(id / 2); // 10-15
            speed = 800 - (id * 20); // 780 - 600
        } else if (id <= 30) {
            diff = 'normal';
            targetLines = 17 + Math.floor((id - 10) / 2); // 17-27
            speed = 600 - ((id - 10) * 10); // 600-400
        } else if (id <= 70) {
            diff = 'hard';
            targetLines = 30 + Math.floor((id - 30) / 2); // 30-50
            speed = 400 - ((id - 30) * 5); // 400-200

            // Add Garbage lines starting level 31
            initialGrid = this.generateGarbageGrid(Math.min(10, Math.floor((id - 20) / 5)));
        } else {
            diff = 'god';
            targetLines = 55 + (id - 70); // 55-85
            speed = 200; // Fast
            initialGrid = this.generateGarbageGrid(8 + Math.floor((id - 70) / 5));
        }

        // Piece Choices upgrade at level 20?
        if (id > 50) pieceChoices = 4; // Harder for player if AI is smart? 
        // Wait, more choices = Player has more options to screw AI? Or easier for AI?
        // User said: "如果买断游戏可以4个方块选择1个" -> "Premium feature".
        // Let's stick to 3 for standard levels.

        // Boss Levels
        if (id % 10 === 0) {
            targetLines += 10; // Eliminate more to survive
            // Boss Preset: maybe specific pattern?
        }

        return {
            id,
            name: `Level ${id}`,
            targetLines,
            aiDifficultyLevel: diff,
            aiWeights: DIFFICULTY_MAP[diff],
            aiSpeed: Math.max(100, speed),
            initialGrid,
            pieceChoices
        };
    }

    private static generateGarbageGrid(garbageLines: number): number[][] {
        // Create grid with noise at bottom
        // Use Grid.TOTAL_ROWS (22) and Grid.WIDTH (10)
        // Rows 0-21. 21 is bottom.

        const gridData: number[][] = Array.from({ length: Grid.TOTAL_ROWS }, () => Array(Grid.WIDTH).fill(0));
        const startY = Grid.TOTAL_ROWS - garbageLines;

        for (let y = startY; y < Grid.TOTAL_ROWS; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                // Randomly fill, but ensure at least one empty hole (so lines aren't pre-cleared)
                // Actually if we randomly fill, we might complete a line. we should avoid that.
                if (Math.random() > 0.3) {
                    const id = Math.floor(Math.random() * 7) + 1;
                    gridData[y][x] = id;
                }
            }
            // Ensure gap
            const gapX = Math.floor(Math.random() * Grid.WIDTH);
            gridData[y][gapX] = 0;
        }
        return gridData;
    }
}
