
import { Grid } from '@/core/Grid';
import { Piece } from '@/core/Piece';
import { PIECE_TYPE_TO_ID } from '@/core/PieceData';

export interface AIWeights {
    heightWeight: number;
    linesWeight: number;
    holesWeight: number;
    bumpinessWeight: number;
    randomFactor?: number; // 0-1 probability to pick random move (simulating mistakes)
    lookahead?: number; // Not implemented yet
}

export const AI_DIFFICULTY: Record<string, AIWeights> = {
    EASY: {
        heightWeight: -0.3,
        linesWeight: 0.5,
        holesWeight: -0.5,
        bumpinessWeight: -0.2,
        randomFactor: 0.3,
    },
    NORMAL: {
        heightWeight: -0.51,
        linesWeight: 0.76,
        holesWeight: -0.36,
        bumpinessWeight: -0.18,
        randomFactor: 0,
    },
    HARD: {
        heightWeight: -0.51,
        linesWeight: 0.76,
        holesWeight: -0.36,
        bumpinessWeight: -0.18,
        lookahead: 1, // Placeholder
    }
};

export interface MoveResult {
    x: number;
    rotation: number;
    score: number;
}

export class AIController {

    public findBestMove(grid: Grid, piece: Piece, weights: AIWeights): MoveResult | null {
        // Random factor check
        if (weights.randomFactor && Math.random() < weights.randomFactor) {
            // Return a random valid move?
            // Or just a suboptimal one. 
            // For simplicity, let's keep searching but maybe add noise to score?
            // Or just return a random move now.
            // Let's implement real valid random move later if needed, 
            // or just add noise to weights for "bad judgement".
        }

        let bestScore = -Infinity;
        let bestMove: MoveResult | null = null;

        // Try all rotations
        // Note: Some pieces have symmetry (O, I, S, Z). 
        // We can optimize, but for safety iterate 0-3.

        for (let r = 0; r < 4; r++) {
            // Clone piece to rotate without affecting original
            const p = piece.clone();
            p.setRotation(r);
            const blocks = p.getBlocks();

            // Find valid X range
            // We need to check columns 0 to Grid.WIDTH
            // We can just iterate all X and check isValid
            for (let x = -2; x < Grid.WIDTH + 2; x++) {
                // Find hard drop Y
                // let y = -1; // Unused

                // First, check if the piece can exist at the top at this X (spawn or slightly below)
                // Actually we just need to find the LOWEST y that is valid.
                // Start from top visible? Or just drop it.
                // Standard logic: Check if it's valid at spawn Y. If not, skip.
                // Then move down until collision.

                // Optimized Hard Drop:
                // Start from y=0 (or slightly above if needed) and go down.
                // Or start from bottom and go up?
                // Down is easier logic.

                // Check if x is valid horizontally at top
                if (!grid.isValidPosition(blocks, x, 0)) {
                    // It might be valid if spawned higher, but usually we care if it fits in grid.
                    // If it can't fit at y=0, maybe it's out of bounds?
                    // Let's skip if it's completely invalid.
                    // But maybe valid at y=5?
                    // We should iterate y.

                    // Actually, standard Tetris drop:
                    // Only positions reachable from top matter.
                    // If we can't place it at y=0, we can't drop it there (unless we slide, but AI assumes direct drop usually).
                    // Let's assume we can drop from top.

                    // If grid.isValidPosition(blocks, x, 0) is false, check if it's because of collision or bounds.
                    // If bounds (x is too far left/right), skip.
                    // If collision (grid full), Game Over likely, but skip this move.
                }

                // Let's find lowest valid Y
                let validY = -1;

                // Optimization: Binary search or linear scan? Linear is fine for 20 rows.
                // Also need to support "above grid" if we allow playing near top out.
                // Start from y=0.
                if (!grid.isValidPosition(blocks, x, 0)) {
                    // Try finding if it's valid slightly lower/higher?
                    // For now, assume if it can't be at y=0, we skip.
                    // Wait, if board is full, y=0 might be blocked.
                    continue;
                }

                // Drop
                for (let dy = 0; dy < Grid.TOTAL_ROWS; dy++) {
                    if (grid.isValidPosition(blocks, x, dy)) {
                        validY = dy;
                    } else {
                        break;
                    }
                }

                if (validY === -1) continue;

                // Simulate
                const score = this.evaluateMove(grid, blocks, x, validY, piece.type, weights);

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = { x, rotation: r, score };
                }
            }
        }

        return bestMove;
    }

    // Evaluate the grid state after this move
    private evaluateMove(
        grid: Grid,
        blocks: { x: number, y: number }[],
        x: number,
        y: number,
        pieceType: any,
        weights: AIWeights
    ): number {
        // We use a temporary grid or clone?
        // Cloning is safer.
        const simGrid = grid.clone();
        const id = PIECE_TYPE_TO_ID[pieceType as keyof typeof PIECE_TYPE_TO_ID] || 1;

        simGrid.lockPiece(blocks, x, y, id);
        const lines = simGrid.clearLines();

        // Metrics
        const aggregateHeight = simGrid.getAggregateHeight();
        const holes = simGrid.countHoles();
        const bumpiness = simGrid.getBumpiness();

        // Calculate Score
        let score = 0;
        score += aggregateHeight * weights.heightWeight;
        score += lines * weights.linesWeight;
        score += holes * weights.holesWeight;
        score += bumpiness * weights.bumpinessWeight;

        return score;
    }
}
