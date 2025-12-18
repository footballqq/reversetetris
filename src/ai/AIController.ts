
import { Grid } from '@/core/Grid';
import { Piece } from '@/core/Piece';
import { PIECE_TYPE_TO_ID } from '@/core/PieceData';

export interface AIWeights {
    heightWeight: number;
    linesWeight: number;
    holesWeight: number;
    wellsWeight?: number;
    bumpinessWeight: number;
    randomFactor?: number; // 0-1 probability to pick random move (simulating mistakes)
    lookahead?: number; // Not implemented yet
    // When true, use lexicographic priorities instead of weighted-sum comparison.
    // Priority order (best to worst):
    // 1) avoid immediate top-out
    // 2) minimize classic holes (covered empty cells)
    // 3) minimize blockades (blocks above empty cells)
    // 4) minimize wells (laterally enclosed valleys)
    // 5) maximize lines cleared
    // 6) minimize aggregate height
    // 7) minimize bumpiness
    // 6) prefer edges (optional tie-breaker)
    lexicographic?: boolean;
    // When true (and lexicographic enabled), prefer placements closer to walls as a final tie-breaker.
    preferEdges?: boolean;
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
    },
    // Strongest heuristic-only difficulty (no lookahead yet).
    GOD: {
        heightWeight: -0.6,
        linesWeight: 2.5,
        holesWeight: -0.9,
        wellsWeight: -0.25,
        bumpinessWeight: -0.22,
        lexicographic: true,
        preferEdges: true,
    },
};

export interface MoveResult {
    x: number;
    rotation: number;
    score: number;
    linesCleared: number;
    aggregateHeight: number;
    holes: number; // classic covered holes
    blockades: number;
    bumpiness: number;
    gameOverAfterMove: boolean;
    edgeDistance: number;
    wellSums: number;
}

export class AIController {

    public findBestMove(grid: Grid, piece: Piece, weights: AIWeights): MoveResult | null {
        let bestScore = -Infinity;
        let bestLex: {
            gameOverAfterMove: boolean;
            holes: number;
            blockades: number;
            wellSums: number;
            linesCleared: number;
            aggregateHeight: number;
            bumpiness: number;
            edgeDistance: number;
        } | null = null;
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

                const edgeDistance = this.computeEdgeDistance(blocks, x);

                // Simulate
                const evalResult = this.evaluateMove(grid, blocks, x, validY, piece.type, weights);
                let score = evalResult.score;

                // Add noise for low difficulty
                if (weights.randomFactor && weights.randomFactor > 0) {
                    const noise = (Math.random() - 0.5) * weights.randomFactor * 50;
                    score += noise;
                }

                const candidate = {
                    gameOverAfterMove: evalResult.gameOverAfterMove,
                    holes: evalResult.holes,
                    blockades: evalResult.blockades,
                    wellSums: evalResult.wellSums,
                    linesCleared: evalResult.linesCleared,
                    aggregateHeight: evalResult.aggregateHeight,
                    bumpiness: evalResult.bumpiness,
                    edgeDistance,
                };

                const isBetter = weights.lexicographic
                    ? this.isBetterLexicographic(candidate, bestLex, !!weights.preferEdges)
                    : score > bestScore;

                if (isBetter) {
                    bestLex = candidate;
                    bestScore = score;
                    bestMove = {
                        x,
                        rotation: r,
                        score,
                        linesCleared: evalResult.linesCleared,
                        aggregateHeight: evalResult.aggregateHeight,
                        holes: evalResult.holes,
                        blockades: evalResult.blockades,
                        bumpiness: evalResult.bumpiness,
                        gameOverAfterMove: evalResult.gameOverAfterMove,
                        edgeDistance,
                        wellSums: evalResult.wellSums,
                    };
                }
            }
        }

        return bestMove;
    }

    private isBetterLexicographic(
        candidate: {
            gameOverAfterMove: boolean;
            holes: number;
            blockades: number;
            wellSums: number;
            linesCleared: number;
            aggregateHeight: number;
            bumpiness: number;
            edgeDistance: number;
        },
        best: {
            gameOverAfterMove: boolean;
            holes: number;
            blockades: number;
            wellSums: number;
            linesCleared: number;
            aggregateHeight: number;
            bumpiness: number;
            edgeDistance: number;
        } | null,
        preferEdges: boolean
    ): boolean {
        if (!best) return true;

        // 1) avoid immediate top-out
        if (candidate.gameOverAfterMove !== best.gameOverAfterMove) {
            return candidate.gameOverAfterMove === false;
        }

        // 2) minimize holes
        if (candidate.holes !== best.holes) return candidate.holes < best.holes;

        // 3) minimize blockades
        if (candidate.blockades !== best.blockades) return candidate.blockades < best.blockades;

        // 4) minimize wells
        if (candidate.wellSums !== best.wellSums) return candidate.wellSums < best.wellSums;

        // 5) maximize lines cleared
        if (candidate.linesCleared !== best.linesCleared) return candidate.linesCleared > best.linesCleared;

        // 6) minimize height
        if (candidate.aggregateHeight !== best.aggregateHeight) return candidate.aggregateHeight < best.aggregateHeight;

        // 7) minimize bumpiness
        if (candidate.bumpiness !== best.bumpiness) return candidate.bumpiness < best.bumpiness;

        // 6) prefer edges (optional tie-breaker)
        if (preferEdges && candidate.edgeDistance !== best.edgeDistance) {
            return candidate.edgeDistance < best.edgeDistance;
        }

        return false;
    }

    private computeEdgeDistance(blocks: { x: number, y: number }[], offsetX: number): number {
        // Smaller is "closer to a wall". We take the minimum distance among blocks so that
        // any contact/near-contact to the wall wins tie-breaks.
        let minDistance = Infinity;
        for (const block of blocks) {
            const absX = offsetX + block.x;
            const distToWall = Math.min(absX, (Grid.WIDTH - 1) - absX);
            if (distToWall < minDistance) minDistance = distToWall;
        }
        return minDistance === Infinity ? 0 : minDistance;
    }

    // Evaluate the grid state after this move
    private evaluateMove(
        grid: Grid,
        blocks: { x: number, y: number }[],
        x: number,
        y: number,
        pieceType: any,
        weights: AIWeights
    ): {
        score: number;
        linesCleared: number;
        aggregateHeight: number;
        holes: number;
        blockades: number;
        wellSums: number;
        bumpiness: number;
        gameOverAfterMove: boolean;
    } {
        const simGrid = grid.clone();
        const id = PIECE_TYPE_TO_ID[pieceType as keyof typeof PIECE_TYPE_TO_ID] || 1;

        simGrid.lockPiece(blocks, x, y, id);
        const lines = simGrid.clearLines();

        // Metrics
        const aggregateHeight = simGrid.getAggregateHeight();
        const wellSums = simGrid.getWellSums();
        const holes = simGrid.countHoles();
        const blockades = simGrid.countBlockades();
        const bumpiness = simGrid.getBumpiness();
        const gameOverAfterMove = simGrid.isGameOver();

        // Calculate Score
        let score = 0;

        // Hard guardrail: avoid any move that immediately top-outs if there exists an alternative.
        // (We implement as a huge penalty; selection still works even if every move top-outs.)
        if (gameOverAfterMove) {
            score -= 1_000_000;
        }

        score += aggregateHeight * weights.heightWeight;
        score += lines * weights.linesWeight;
        score += holes * weights.holesWeight;
        // Blockades are always bad; by default, scale from holesWeight unless overridden elsewhere.
        score += blockades * (weights.holesWeight * 0.5);
        const wellsWeight = weights.wellsWeight ?? (weights.holesWeight * 0.25);
        score += wellSums * wellsWeight;
        score += bumpiness * weights.bumpinessWeight;

        return { score, linesCleared: lines, aggregateHeight, holes, blockades, wellSums, bumpiness, gameOverAfterMove };
    }
}
