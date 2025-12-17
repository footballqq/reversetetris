
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
        let bestScore = -Infinity;
        let bestMove: MoveResult | null = null;

        // Try all rotations (0-3)
        for (let r = 0; r < 4; r++) {
            // Clone piece to rotate without affecting original
            const p = piece.clone();
            p.setRotation(r);
            const blocks = p.getBlocks();

            // Find valid X range
            for (let x = -2; x < Grid.WIDTH + 2; x++) {
                // Optimization: Start from valid spawn check
                if (!grid.isValidPosition(blocks, x, 0)) {
                    continue;
                }

                // Find lowest valid Y (Hard Drop)
                let validY = -1;
                for (let dy = 0; dy < Grid.TOTAL_ROWS; dy++) {
                    if (grid.isValidPosition(blocks, x, dy)) {
                        validY = dy;
                    } else {
                        break;
                    }
                }

                if (validY === -1) continue;

                // Simulate
                let score = this.evaluateMove(grid, blocks, x, validY, piece.type, weights);

                // Add noise for low difficulty
                if (weights.randomFactor && weights.randomFactor > 0) {
                    const noise = (Math.random() - 0.5) * weights.randomFactor * 50;
                    score += noise;
                }

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
