
import { Grid } from '@/core/Grid';
import { Piece } from '@/core/Piece';
import { PIECE_TYPE_TO_ID } from '@/core/PieceData';
import { PieceType } from '@/core/PieceType';

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
    holesCreated: number;
    blockades: number;
    bumpiness: number;
    gameOverAfterMove: boolean;
    edgeDistance: number;
    wellSums: number;
}

export interface AIDecisionCandidate extends MoveResult {
    y: number;
}

export interface AIDecisionTrace {
    pieceType: PieceType;
    difficultyFlags: {
        lexicographic: boolean;
        preferEdges: boolean;
    };
    weights: AIWeights;
    best: AIDecisionCandidate;
    top: AIDecisionCandidate[];
    totalCandidates: number;
    decisionOrder: string[];
    decidedBy?: { key: string; best: number | boolean; second: number | boolean };
}

export class AIController {
    private traceEnabled: boolean = false;
    private traceTopK: number = 12;
    private lastTrace: AIDecisionTrace | null = null;

    public setTraceEnabled(enabled: boolean, topK: number = 12) {
        this.traceEnabled = enabled;
        this.traceTopK = Math.max(1, Math.min(50, Math.floor(topK)));
        if (!enabled) this.lastTrace = null;
    }

    public getLastTrace(): AIDecisionTrace | null {
        return this.lastTrace;
    }

    public findBestMove(grid: Grid, piece: Piece, weights: AIWeights): MoveResult | null {
        let bestScore = -Infinity;
        let bestLex: {
            gameOverAfterMove: boolean;
            holes: number;
            holesCreated: number;
            blockades: number;
            wellSums: number;
            linesCleared: number;
            aggregateHeight: number;
            bumpiness: number;
            edgeDistance: number;
        } | null = null;
        let bestMove: MoveResult | null = null;

        const candidates: AIDecisionCandidate[] = this.traceEnabled ? [] : [];
        const holesBeforeMap = this.computeHoleMap(grid);

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
                const evalResult = this.evaluateMove(grid, holesBeforeMap, blocks, x, validY, piece.type, weights);
                let score = evalResult.score;

                // Add noise for low difficulty
                if (weights.randomFactor && weights.randomFactor > 0) {
                    const noise = (Math.random() - 0.5) * weights.randomFactor * 50;
                    score += noise;
                }

                const candidate = {
                    gameOverAfterMove: evalResult.gameOverAfterMove,
                    holes: evalResult.holes,
                    holesCreated: evalResult.holesCreated,
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
                        holesCreated: evalResult.holesCreated,
                        blockades: evalResult.blockades,
                        bumpiness: evalResult.bumpiness,
                        gameOverAfterMove: evalResult.gameOverAfterMove,
                        edgeDistance,
                        wellSums: evalResult.wellSums,
                    };
                }

                if (this.traceEnabled) {
                    candidates.push({
                        x,
                        rotation: r,
                        y: validY,
                        score,
                        linesCleared: evalResult.linesCleared,
                        aggregateHeight: evalResult.aggregateHeight,
                        holes: evalResult.holes,
                        holesCreated: evalResult.holesCreated,
                        blockades: evalResult.blockades,
                        bumpiness: evalResult.bumpiness,
                        gameOverAfterMove: evalResult.gameOverAfterMove,
                        edgeDistance,
                        wellSums: evalResult.wellSums,
                    });
                }
            }
        }

        if (this.traceEnabled) {
            const sorted = [...candidates].sort((a, b) => this.compareCandidates(a, b, weights));
            const bestCandidate = sorted[0];
            const secondCandidate = sorted[1];

            const decisionOrder = weights.lexicographic
                ? [
                    'topOut',
                    'holes',
                    'holesCreated',
                    'blockades',
                    'wellSums',
                    'linesCleared',
                    'aggregateHeight',
                    'bumpiness',
                    ...(weights.preferEdges ? ['edgeDistance'] : []),
                    'score',
                ]
                : ['score'];

            const decidedBy = (bestCandidate && secondCandidate)
                ? this.getDecisionReason(bestCandidate, secondCandidate, weights)
                : undefined;

            if (bestCandidate) {
                this.lastTrace = {
                    pieceType: piece.type,
                    difficultyFlags: { lexicographic: !!weights.lexicographic, preferEdges: !!weights.preferEdges },
                    weights,
                    best: bestCandidate,
                    top: sorted.slice(0, this.traceTopK),
                    totalCandidates: candidates.length,
                    decisionOrder,
                    decidedBy,
                };
            } else {
                this.lastTrace = null;
            }
        }

        return bestMove;
    }

    private compareCandidates(a: AIDecisionCandidate, b: AIDecisionCandidate, weights: AIWeights): number {
        if (!weights.lexicographic) {
            return b.score - a.score;
        }

        // Same order as isBetterLexicographic (lower is better for holes/blockades/wells/height/bumpiness/edgeDistance).
        if (a.gameOverAfterMove !== b.gameOverAfterMove) return a.gameOverAfterMove ? 1 : -1;
        if (a.holes !== b.holes) return a.holes - b.holes;
        if (a.holesCreated !== b.holesCreated) return a.holesCreated - b.holesCreated;
        if (a.blockades !== b.blockades) return a.blockades - b.blockades;
        if (a.wellSums !== b.wellSums) return a.wellSums - b.wellSums;
        if (a.linesCleared !== b.linesCleared) return b.linesCleared - a.linesCleared;
        if (a.aggregateHeight !== b.aggregateHeight) return a.aggregateHeight - b.aggregateHeight;
        if (a.bumpiness !== b.bumpiness) return a.bumpiness - b.bumpiness;
        if (weights.preferEdges && a.edgeDistance !== b.edgeDistance) return a.edgeDistance - b.edgeDistance;
        return b.score - a.score;
    }

    private getDecisionReason(
        best: AIDecisionCandidate,
        second: AIDecisionCandidate,
        weights: AIWeights
    ): { key: string; best: number | boolean; second: number | boolean } | undefined {
        if (!weights.lexicographic) {
            if (best.score !== second.score) return { key: 'score', best: best.score, second: second.score };
            return undefined;
        }

        if (best.gameOverAfterMove !== second.gameOverAfterMove) {
            return { key: 'topOut', best: best.gameOverAfterMove, second: second.gameOverAfterMove };
        }
        if (best.holes !== second.holes) return { key: 'holes', best: best.holes, second: second.holes };
        if (best.holesCreated !== second.holesCreated) return { key: 'holesCreated', best: best.holesCreated, second: second.holesCreated };
        if (best.blockades !== second.blockades) return { key: 'blockades', best: best.blockades, second: second.blockades };
        if (best.wellSums !== second.wellSums) return { key: 'wellSums', best: best.wellSums, second: second.wellSums };
        if (best.linesCleared !== second.linesCleared) return { key: 'linesCleared', best: best.linesCleared, second: second.linesCleared };
        if (best.aggregateHeight !== second.aggregateHeight) return { key: 'aggregateHeight', best: best.aggregateHeight, second: second.aggregateHeight };
        if (best.bumpiness !== second.bumpiness) return { key: 'bumpiness', best: best.bumpiness, second: second.bumpiness };
        if (weights.preferEdges && best.edgeDistance !== second.edgeDistance) return { key: 'edgeDistance', best: best.edgeDistance, second: second.edgeDistance };
        if (best.score !== second.score) return { key: 'score', best: best.score, second: second.score };
        return undefined;
    }

    private isBetterLexicographic(
        candidate: {
            gameOverAfterMove: boolean;
            holes: number;
            holesCreated: number;
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
            holesCreated: number;
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

        // 2.5) minimize newly created holes (prefer not to introduce new covered holes when outcome holes are equal)
        if (candidate.holesCreated !== best.holesCreated) return candidate.holesCreated < best.holesCreated;

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
        holesBeforeMap: boolean[][],
        blocks: { x: number, y: number }[],
        x: number,
        y: number,
        pieceType: PieceType,
        weights: AIWeights
    ): {
        score: number;
        linesCleared: number;
        aggregateHeight: number;
        holes: number;
        holesCreated: number;
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
        const holesAfterMap = this.computeHoleMap(simGrid);
        const holesCreated = this.countNewHoles(holesBeforeMap, holesAfterMap);
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

        return { score, linesCleared: lines, aggregateHeight, holes, holesCreated, blockades, wellSums, bumpiness, gameOverAfterMove };
    }

    private computeHoleMap(grid: Grid): boolean[][] {
        const map: boolean[][] = Array.from({ length: Grid.TOTAL_ROWS }, () => Array(Grid.WIDTH).fill(false));

        for (let x = 0; x < Grid.WIDTH; x++) {
            let blockFound = false;
            for (let y = 0; y < Grid.TOTAL_ROWS; y++) {
                if (grid.data[y][x] !== 0) {
                    blockFound = true;
                } else if (blockFound) {
                    map[y][x] = true;
                }
            }
        }

        return map;
    }

    private countNewHoles(before: boolean[][], after: boolean[][]): number {
        let created = 0;
        for (let y = 0; y < Grid.TOTAL_ROWS; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                if (after[y][x] && !before[y][x]) created++;
            }
        }
        return created;
    }
}
