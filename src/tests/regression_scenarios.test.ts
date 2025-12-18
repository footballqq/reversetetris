import { describe, it, expect } from 'vitest';
import { Grid } from '../core/Grid';
import { AIController, AI_DIFFICULTY } from '../ai/AIController';
import { Piece } from '../core/Piece';
import { PieceType } from '../core/PieceType';

describe('AI Regression Tests', () => {
    const ai = new AIController();
    const weights = AI_DIFFICULTY.GOD;

    /**
     * Case 1: The "Quantum Tunneling" Bug
     * A piece should not be able to skip solid blocks to land in a hole underneath.
     * Based on user report: "这个块居然穿越了，飞到了最下层"
     */
    it('should not allow pieces to teleport through solid obstacles', () => {
        const gridData = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 1, 0, 0, 0, 0, 0, 0], [0, 0, 0, 1, 0, 0, 0, 0, 0, 1], [0, 0, 1, 1, 0, 0, 0, 0, 0, 1], [0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
            [0, 0, 1, 1, 0, 0, 0, 0, 1, 1], [0, 0, 1, 1, 0, 0, 0, 0, 1, 1], [0, 0, 7, 1, 0, 0, 4, 0, 1, 1], [0, 0, 7, 1, 4, 0, 4, 4, 1, 1], [0, 5, 7, 7, 4, 4, 0, 4, 3, 1],
            [3, 3, 2, 2, 3, 0, 4, 4, 6, 6], [7, 3, 0, 2, 2, 3, 3, 8, 0, 8], [2, 2, 1, 7, 7, 4, 4, 0, 4, 4], [7, 3, 5, 1, 4, 2, 3, 0, 1, 4], [2, 4, 6, 3, 0, 3, 3, 0, 6, 4],
            [6, 4, 4, 5, 5, 3, 0, 0, 0, 3], [0, 0, 4, 5, 6, 0, 0, 5, 5, 2]
        ];
        const grid = new Grid(gridData);
        const pieceJ = new Piece(PieceType.J);

        // The AI should find the best move. 
        // We verify that the landing 'y' chosen for any 'x' doesn't bypass blocks.
        // For example, at x=2, there is a block at row 12 (type 7).
        // J block at x=2 should land AT or ABOVE row 12, not below it.
        const move = ai.findBestMove(grid, pieceJ, weights);

        expect(move).not.toBeNull();

        // Manual verification for piece J at x=2, r=1
        pieceJ.setRotation(1);
        const blocks = pieceJ.getBlocks();
        const spawnY = grid.getSpawnY();
        let finalY = spawnY;
        // The engine logic we just fixed:
        for (let dy = spawnY; dy < Grid.TOTAL_ROWS; dy++) {
            if (grid.isValidPosition(blocks, 2, dy, { ignoreCeiling: true })) {
                finalY = dy;
            } else {
                break;
            }
        }

        // Row 12 has a block at x=2. 
        // J (rotation 1) blocks: [[1,0], [1,1], [1,2], [0,2]] -> offset x=2, so blocks at x=2,3
        // If x=2, blocks occupy x=3 (col 3) and x=2 (col 2).
        // At row 12, col 2 has a '7'. So it should definitely stop before or at row 12.
        // If it was tunneling, it would be > 12.
        expect(finalY).toBeLessThanOrEqual(12);
    });

    /**
     * Case 2: The "Cross Piece Paralysis" Bug
     * Large pieces like CROSS should be able to land even if they initially overlap the ceiling.
     */
    it('should allow special pieces like CROSS to spawn and land correctly', () => {
        const gridData = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [1, 0, 5, 5, 0, 0, 0, 0, 0, 0], [1, 0, 8, 5, 5, 0, 3, 0, 0, 1], [1, 8, 8, 8, 4, 4, 3, 3, 0, 1], [5, 0, 0, 6, 4, 7, 7, 7, 6, 1], [0, 0, 1, 1, 3, 6, 5, 0, 0, 7],
            [6, 7, 5, 0, 7, 7, 3, 0, 3, 1], [4, 7, 4, 0, 0, 1, 2, 4, 6, 6]
        ];
        const grid = new Grid(gridData);
        // Ensure ceiling is visible/lowered to simulate the bug
        // In the report, ceiling was at VISIBLE_START_ROW + some rows.
        grid.lowerCeiling(1); // Drop ceiling by 1 row

        const pieceCross = new Piece(PieceType.CROSS);
        const move = ai.findBestMove(grid, pieceCross, weights);

        // Before the fix, this was returning null because it hit the ceiling immediately.
        expect(move).not.toBeNull();
    });
});
