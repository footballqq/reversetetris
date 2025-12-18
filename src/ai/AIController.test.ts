
import { describe, it, expect } from 'vitest';
import { Grid } from '@/core/Grid';
import { Piece } from '@/core/Piece';
import { PieceType } from '@/core/PieceType';
import { AIController, AI_DIFFICULTY } from './AIController';
import { PIECE_TYPE_TO_ID } from '@/core/PieceData';

describe('AIController', () => {
    it('should calculate best move', () => {
        const grid = new Grid();
        const ai = new AIController();
        const weights = AI_DIFFICULTY.NORMAL;

        // Setup a scenario
        // Fill all columns except col 0 with height 2 blocks
        const id = PIECE_TYPE_TO_ID[PieceType.O];
        for (let x = 1; x < 10; x++) {
            grid.lockPiece([{ x: 0, y: 0 }], x, 21, id);
            grid.lockPiece([{ x: 0, y: 0 }], x, 20, id);
        }

        // Now giving an I piece. 
        // Best move should be x=0, rotation=1 (vertical) or 3 (vertical), to clear 2 lines or at least fill the gap.
        // Actually clearing lines gives huge bonus.
        // Vertical I:
        // shape I: rotation 1 or 3 is vertical.
        // x range: if rotation 1 (vertical in 2nd col of 4x4 matrix?), we need to align.

        const piece = new Piece(PieceType.I);

        const move = ai.findBestMove(grid, piece, weights);

        expect(move).not.toBeNull();
        if (move) {
            // Expect x to be around 0 (depending on rotation offset)
            // I piece rotation 1: [[1, -1], [1, 0], [1, 1], [1, 2]]
            // If placed at gridX, blocks are at gridX+1.
            // We want blocks at x=0. So gridX should be -1.
            // Wait, let's check rotation 1 blocks:
            // [[1, -1], [1, 0], [1, 1], [1, 2]]
            // If gridX = -1:
            // x coords: 0, 0, 0, 0. Valid.

            // If rotation 0 (horizontal): [[-1, 0], [0, 0], [1, 0], [2, 0]]

            // AI should pick rotation 1 or 3 and x such that blocks land in col 0.

            // Let's verify the result logic generally
            // If it clears lines, score should be high.
            // Just verifying it returns a move is good enough for basic smoke test, 
            // but let's check if it picked the hole.

            const p = piece;
            p.setRotation(move.rotation);
            const blocks = p.getBlocks();
            // Check if any block is in col 0
            const inCol0 = blocks.some(b => (move.x + b.x) === 0);
            expect(inCol0).toBe(true);
        }
    });

    it('god should prefer a line-clearing move when available', () => {
        const grid = new Grid();
        const ai = new AIController();
        const weights = AI_DIFFICULTY.GOD;

        // Build a nearly-complete bottom line with a single gap at x=0.
        // Many moves are possible, but only filling x=0 on the bottom row clears a line.
        const id = PIECE_TYPE_TO_ID[PieceType.O];
        for (let x = 1; x < 10; x++) {
            grid.lockPiece([{ x: 0, y: 0 }], x, 21, id);
        }

        const piece = new Piece(PieceType.I);
        const move = ai.findBestMove(grid, piece, weights);

        expect(move).not.toBeNull();
        expect(move?.linesCleared).toBeGreaterThan(0);
    });

    it('god should minimize holes even if it clears a line elsewhere', () => {
        const grid = new Grid();
        const ai = new AIController();
        const weights = AI_DIFFICULTY.GOD;

        // Create a single hole at the bottom: fill x=0..9 at y=21 except x=4 (gap).
        // There are placements that can create/leave holes and others that fill them; god should prefer fewer holes.
        const id = PIECE_TYPE_TO_ID[PieceType.O];
        for (let x = 0; x < 10; x++) {
            if (x === 4) continue;
            grid.lockPiece([{ x: 0, y: 0 }], x, 21, id);
        }

        // Give an O piece; placing it to cover the gap should reduce holes and potentially clear no lines.
        const piece = new Piece(PieceType.O);
        const move = ai.findBestMove(grid, piece, weights);

        expect(move).not.toBeNull();
        // We should avoid creating large classic-hole penalties.
        expect(move?.holes).toBeLessThanOrEqual(1);
    });

    it('god should treat wells (two solid sides) as holes and fill them', () => {
        const grid = new Grid();
        const ai = new AIController();
        const weights = AI_DIFFICULTY.GOD;

        // Create a 1-wide well at x=4 (between x=3 and x=5) with depth 3.
        // This is not a classic "vertical hole" (it is open to the top), but it is enclosed laterally.
        const id = PIECE_TYPE_TO_ID[PieceType.O];
        for (let y = Grid.TOTAL_ROWS - 1; y >= Grid.TOTAL_ROWS - 3; y--) {
            grid.lockPiece([{ x: 0, y: 0 }], 3, y, id);
            grid.lockPiece([{ x: 0, y: 0 }], 5, y, id);
        }

        const piece = new Piece(PieceType.I);
        const move = ai.findBestMove(grid, piece, weights);

        expect(move).not.toBeNull();
        expect(move?.wellSums).toBe(0);
        expect(move?.holes).toBe(0);
        expect(move?.holesCreated).toBe(0);
    });

    it('should return null if no valid move', () => {
        const grid = new Grid();
        const ai = new AIController();

        // Fill top rows completely
        // Realistically this is "Game Over", but finding move might fail.
        // Or if we block spawn area?
        // AI logic checks "isValidPosition" at y=0.
        // Fill the ENTIRE grid to ensure no move is possible
        for (let y = 0; y < Grid.TOTAL_ROWS; y++) {
            grid.data[y].fill(1);
        }

        const piece = new Piece(PieceType.O);
        const move = ai.findBestMove(grid, piece, AI_DIFFICULTY.NORMAL);

        // Should be null because start position (y=0) is blocked
        expect(move).toBeNull();
    });
});
