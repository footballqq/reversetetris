
import { Grid } from '@/core/Grid';
import { LevelConfig, DIFFICULTY_MAP, AIDifficultyLevel } from './LevelConfig';

export class LevelGenerator {

    public static generateLevel(id: number): LevelConfig {
        let diff: AIDifficultyLevel = 'easy';
        let speed = 800;
        let initialGrid: number[][] | undefined = undefined;
        let pieceChoices = 3;

        // 1. Target Lines: 50 at Level 1, decreasing to 30.
        // Formula: Start at 50, reduce 1 per level until 30.
        let targetLines = Math.max(30, 50 - (id - 1));

        // 2. AI Difficulty and Speed
        if (id <= 10) {
            diff = 'easy';
            speed = 800 - (id * 20);
        } else if (id <= 25) {
            diff = 'normal';
            speed = 600 - ((id - 10) * 15);
        } else if (id <= 50) {
            diff = 'hard';
            speed = 400 - ((id - 25) * 8);
        } else {
            diff = 'god';
            speed = 200;
        }

        // 3. Garbage Lines: 1-5(5), 6-10(4), 11-15(3), 16-20(2), 21-25(1), 26+(0)
        // Formula: start at 5, decrease 1 every 5 levels.
        const garbageLines = Math.max(0, 6 - Math.ceil(id / 5));
        if (garbageLines > 0) {
            initialGrid = this.generateGarbageGrid(garbageLines);
        }

        // Piece Choices upgrade for very late game Boss levels?
        // Let's keep it 3 for now as per user request.

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
