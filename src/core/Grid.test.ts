
import { describe, it, expect, beforeEach } from 'vitest';
import { Grid } from './Grid';

describe('Grid', () => {
    let grid: Grid;

    beforeEach(() => {
        grid = new Grid();
    });

    it('should initialize empty', () => {
        expect(grid.isCellEmpty(0, 0)).toBe(true);
        expect(grid.getHeight()).toBe(0);
    });

    it('should lock pieces', () => {
        // Lock a block at 0, 21 (bottom left)
        // Remember TOTAL_ROWS is 22, so index 0..21.
        // 21 is bottom row.
        grid.lockPiece([{ x: 0, y: 0 }], 0, 21, 1);
        expect(grid.isCellEmpty(0, 21)).toBe(false);
        expect(grid.isCellEmpty(1, 21)).toBe(true);
    });

    it('should calculate height', () => {
        grid.lockPiece([{ x: 0, y: 0 }], 0, 21, 1);
        expect(grid.getHeight()).toBe(1);

        grid.lockPiece([{ x: 0, y: 0 }], 0, 20, 1);
        expect(grid.getHeight()).toBe(2);
    });

    it('should clear lines', () => {
        // Fill bottom row
        for (let x = 0; x < 10; x++) {
            grid.lockPiece([{ x: 0, y: 0 }], x, 21, 1);
        }

        // Add one block above
        grid.lockPiece([{ x: 0, y: 0 }], 0, 20, 1);

        expect(grid.clearLines()).toBe(1);

        // Block above should fall down
        expect(grid.isCellEmpty(0, 21)).toBe(false);
        expect(grid.isCellEmpty(1, 21)).toBe(true); // Should be empty now
    });

    it('should count holes', () => {
        //   X
        // X . X
        grid.lockPiece([{ x: 0, y: 0 }], 0, 21, 1); // Left
        grid.lockPiece([{ x: 0, y: 0 }], 2, 21, 1); // Right
        grid.lockPiece([{ x: 0, y: 0 }], 1, 20, 1); // Top Middle

        // Gap at (1, 21) is a hole because (1, 20) is filled
        expect(grid.countHoles()).toBe(1);
    });

    it('should calculate bumpiness', () => {
        // Col 0: H=1
        // Col 1: H=3
        // Col 2: H=1
        // Bumpiness = |1-3| + |3-1| + |1-0|... = 2 + 2 + 1 = 5 (rest are 0)

        grid.lockPiece([{ x: 0, y: 0 }], 0, 21, 1);

        grid.lockPiece([{ x: 0, y: 0 }], 1, 21, 1);
        grid.lockPiece([{ x: 0, y: 0 }], 1, 20, 1);
        grid.lockPiece([{ x: 0, y: 0 }], 1, 19, 1);

        grid.lockPiece([{ x: 0, y: 0 }], 2, 21, 1);

        // Height: [1, 3, 1, 0...]
        // Diff: |1-3|=2, |3-1|=2, |1-0|=1. Total 5.
        expect(grid.getBumpiness()).toBe(5);
    });
});
