
import { Grid } from './Grid';
import { Piece } from './Piece';
import { PieceFactory } from './PieceFactory';
import { AIController, AIWeights, AI_DIFFICULTY, AIDecisionTrace, MoveResult } from '@/ai/AIController';
import { Renderer } from '@/render/Renderer';
import { PIECE_TYPE_TO_ID } from './PieceData';
import { LevelGenerator } from '@/levels/LevelGenerator';
import { LevelConfig } from '@/levels/LevelConfig';

export enum GameState {
    MENU,
    SELECTING,
    AI_PLAYING,
    AI_ANIMATING,
    PAUSED,
    WIN,
    LOSE
}

// using definition from @/levels/LevelConfig now

export interface GameData {
    level: number;
    linesCleared: number;
    piecesPlaced: number;
    targetLines: number;
    aiDifficulty: AIWeights;
    aiDifficultyLevel: string;
}

type EventCallback = (data?: any) => void;

export class GameEngine {
    public state: GameState = GameState.MENU;
    public grid: Grid;
    private renderer: Renderer;
    private ai: AIController;
    public data: GameData;

    // Play state
    public currentPiece: Piece | null = null;
    public nextPieces: Piece[] = [];
    public activePiecePosition: { x: number, y: number } = { x: 0, y: 0 };
    public ghostPiecePosition: { x: number, y: number } = { x: 0, y: 0 }; // For display
    public debugHudEnabled: boolean = false;
    public versionHudEnabled: boolean = true;
    public appVersion: string = '';
    private difficultyOverride: { level: string; weights: AIWeights; speedMs: number } | null = null;
    private decisionLogVisible: boolean = false;
    private lastDecisionLogText: string = '';

    // AI Animation
    private aiTimer: number = 0;
    private currentAiSpeed: number = 500; // ms
    private moveQueue: { type: 'rotate' | 'move' | 'drop', value: number }[] = [];
    private animationTimer: number = 0;
    // private readonly ANIMATION_STEP_DELAY = 100; // Adjust based on speed?
    private lastAiMove: MoveResult | null = null;

    // Events
    private listeners: Record<string, EventCallback[]> = {};

    constructor(renderer: Renderer) {
        this.renderer = renderer;
        this.grid = new Grid();
        this.ai = new AIController();
        // Always collect traces so you can open the log panel later and still copy the last decision.
        this.ai.setTraceEnabled(true, 12);
        this.data = {
            level: 1,
            linesCleared: 0,
            piecesPlaced: 0,
            targetLines: 10,
            aiDifficulty: AI_DIFFICULTY.NORMAL,
            aiDifficultyLevel: 'normal',
        };
    }

    public on(event: string, callback: EventCallback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    private emit(event: string, data?: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    public setDifficulty(difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'GOD') {
        this.data.aiDifficulty = AI_DIFFICULTY[difficulty];
        this.data.aiDifficultyLevel = difficulty.toLowerCase();

        // Also adjust AI speed based on difficulty
        let speedMs = 500;
        switch (difficulty) {
            case 'EASY':
                this.currentAiSpeed = 800; // Slower
                speedMs = 800;
                break;
            case 'NORMAL':
                this.currentAiSpeed = 500;
                speedMs = 500;
                break;
            case 'HARD':
                this.currentAiSpeed = 300; // Faster
                speedMs = 300;
                break;
            case 'GOD':
                this.currentAiSpeed = 200;
                speedMs = 200;
                break;
        }

        this.difficultyOverride = {
            level: this.data.aiDifficultyLevel,
            weights: this.data.aiDifficulty,
            speedMs,
        };
    }

    public start(levelConfig?: LevelConfig) {
        if (levelConfig) {
            this.loadLevel(levelConfig);
        } else {
            // Default Level 1
            this.loadLevel(LevelGenerator.generateLevel(1));
        }
    }

    public loadLevel(config: LevelConfig) {
        this.data.level = config.id;
        this.data.targetLines = config.targetLines;

        // Apply AI difficulty (level defaults), but allow UI-selected difficulty override.
        if (this.difficultyOverride) {
            this.data.aiDifficulty = this.difficultyOverride.weights;
            this.data.aiDifficultyLevel = this.difficultyOverride.level;
            this.currentAiSpeed = this.difficultyOverride.speedMs;
        } else {
            this.data.aiDifficulty = config.aiWeights;
            this.data.aiDifficultyLevel = config.aiDifficultyLevel;
            // Apply AI speed
            this.currentAiSpeed = config.aiSpeed;
        }

        // Reset Grid
        this.grid = new Grid(config.initialGrid);

        this.data.linesCleared = 0;
        this.data.piecesPlaced = 0;

        this.state = GameState.SELECTING;
        this.startTurn();
        this.emit('levelLoaded', config);
    }

    private startTurn() {
        this.nextPieces = PieceFactory.createRandomSet(3, { specialChance: this.getSpecialChanceForDifficulty() });
        this.state = GameState.SELECTING;
        this.emit('stateChange', this.state);
        this.emit('nextPieces', this.nextPieces);
    }

    private getSpecialChanceForDifficulty(): number {
        // Requested: EASY 10%, then each difficulty reduces by 2%.
        // easy=10%, normal=8%, hard=6%, god=4%
        switch (this.data.aiDifficultyLevel) {
            case 'easy':
                return 0.10;
            case 'normal':
                return 0.08;
            case 'hard':
                return 0.06;
            case 'god':
                return 0.04;
            default:
                return 0.01;
        }
    }

    private getCeilingDropInterval(): number {
        // gemini: 2025-12-18 Make it more aggressive.
        // easy=5, normal=8, hard=12, god=15
        switch (this.data.aiDifficultyLevel) {
            case 'easy':
                return 5;
            case 'normal':
                return 8;
            case 'hard':
                return 12;
            case 'god':
                return 15;
            default:
                return 10;
        }
    }

    public selectPiece(index: number) {
        if (this.state !== GameState.SELECTING) return;
        if (index < 0 || index >= this.nextPieces.length) return;

        this.currentPiece = this.nextPieces[index];
        // Spawn position: Top middle, just below the current ceiling
        this.activePiecePosition = { x: 4, y: this.grid.getSpawnY() };

        this.emit('pieceSelected', this.currentPiece);

        this.state = GameState.AI_PLAYING;
        this.aiTimer = 0;
        // Calculate move immediately
        this.prepareAIMove();
    }

    private prepareAIMove() {
        if (!this.currentPiece) return;
        const move = this.ai.findBestMove(this.grid, this.currentPiece, this.data.aiDifficulty);

        // gemini: 2025-12-18 Even if move is technically a "top out", we proceed to animation.
        // The win/loss will be determined after the piece is locked.
        if (move) {
            this.lastAiMove = move;
            this.updateDecisionLog();
            this.generateMoveQueue(move);
            this.state = GameState.AI_ANIMATING;
            this.animationTimer = 0;
        }
    }

    private updateDecisionLog() {
        const trace = this.ai.getLastTrace();
        this.lastDecisionLogText = this.formatDecisionLog(trace);
        if (this.decisionLogVisible) {
            this.emit('aiTrace', this.lastDecisionLogText);
        }
    }

    private formatDecisionLog(trace: AIDecisionTrace | null): string {
        const now = new Date().toISOString();
        const header = [
            `ReverseTetris AI Trace`,
            `time=${now}`,
            `version=${this.appVersion || 'unknown'}`,
            `difficulty=${this.data.aiDifficultyLevel}`,
            `turn=${this.data.piecesPlaced + 1}`,
        ].join('\n');

        const gridJson = JSON.stringify(this.grid.data);

        if (!trace) {
            const currentPiece = this.currentPiece ? this.currentPiece.type : '(none)';
            const next = this.nextPieces?.map(p => p.type).join(',') ?? '';
            return `${header}\ncurrentPiece=${currentPiece}\nnextPieces=[${next}]\n\n(no trace available)\n\ngrid=${gridJson}\n`;
        }

        const flags = `lexicographic=${trace.difficultyFlags.lexicographic} preferEdges=${trace.difficultyFlags.preferEdges}`;
        const weights = JSON.stringify(trace.weights);
        const decidedBy = trace.decidedBy ? `decidedBy=${trace.decidedBy.key} best=${trace.decidedBy.best} second=${trace.decidedBy.second}` : `decidedBy=(tie)`;
        const order = `order=${trace.decisionOrder.join(' > ')}`;

        const fmt = (c: any) =>
            `x=${c.x} r=${c.rotation} y=${c.y} ` +
            `H=${c.holes}(+${c.holesCreated}) B=${c.blockades} W=${c.wellSums} ` +
            `L=${c.linesCleared} MH=${c.maxHeight} AH=${c.aggregateHeight} BU=${c.bumpiness} E=${c.edgeDistance} ` +
            `S=${Math.round(c.score * 100) / 100}` +
            (c.gameOverAfterMove ? ' TOP_OUT' : '');

        const best = `best: ${trace.pieceType} ${fmt(trace.best)}`;
        const top = trace.top.map((c, i) => `${i + 1}. ${trace.pieceType} ${fmt(c)}`).join('\n');

        return `${header}\n${flags}\n${order}\n${decidedBy}\nweights=${weights}\n\n${best}\n\ntop(${trace.top.length}/${trace.totalCandidates}):\n${top}\n\ngrid=${gridJson}\n`;
    }

    private generateMoveQueue(target: { x: number, rotation: number }) {
        this.moveQueue = [];
        // 1. Rotate
        // Target rotation (0-3). Current 0.
        // Naive: just rotate right N times.
        let rotations = target.rotation; // Assuming start is 0
        for (let i = 0; i < rotations; i++) {
            this.moveQueue.push({ type: 'rotate', value: 1 });
        }

        // 2. Move X
        const startX = 4;
        const diff = target.x - startX;
        if (diff !== 0) {
            const dir = diff > 0 ? 1 : -1;
            for (let i = 0; i < Math.abs(diff); i++) {
                this.moveQueue.push({ type: 'move', value: dir });
            }
        }

        // 3. Drop
        this.moveQueue.push({ type: 'drop', value: 0 });
    }

    public update(deltaTime: number) {
        // AI Thinking (Simulated delay if needed, but we used SELECTING->ANIMATING immediately for responsiveness, 
        // effectively 0 think time but animation takes time)
        // If we want a pause before animation starts:
        if (this.state === GameState.AI_PLAYING) {
            this.aiTimer += deltaTime;
            // Wait briefly before starting animation?
            if (this.aiTimer > 200) {
                this.prepareAIMove();
            }
        }

        if (this.state === GameState.AI_ANIMATING && this.currentPiece) {
            this.animationTimer += deltaTime;
            // Calculate step delay based on speed
            // If total speed 1000ms, and queue length 10. Step = 100ms.
            // Minimum 30ms for smoothness.
            const queueLen = this.moveQueue.length || 1;
            const stepDelay = Math.max(30, Math.min(200, this.currentAiSpeed / queueLen));

            if (this.animationTimer >= stepDelay) {
                this.animationTimer = 0;
                this.processAnimationStep();
            }
        }
    }

    private processAnimationStep() {
        if (this.moveQueue.length === 0) return;

        const action = this.moveQueue.shift();
        if (!action) return;

        if (action.type === 'rotate') {
            this.currentPiece?.rotateClockwise();
            // We assume valid because AI chose it, but in reality 
            // rotating at spawn might need wall kick logic if implemented.
            // visual only? No, actual state.
        } else if (action.type === 'move') {
            this.activePiecePosition.x += action.value;
        } else if (action.type === 'drop') {
            this.executeDropAndLock();
        }
    }

    private executeDropAndLock() {
        if (!this.currentPiece) return;

        const blocks = this.currentPiece.getBlocks();
        const spawnY = this.grid.getSpawnY();
        let finalY = spawnY;

        // gemini: 2025-12-18 Unified: Search from spawnY down.
        // This ensures the piece only lands below the ceiling, and prevents the 'spawn kill' bug.
        for (let dy = spawnY; dy < Grid.TOTAL_ROWS; dy++) {
            if (this.grid.isValidPosition(blocks, this.activePiecePosition.x, dy)) {
                finalY = dy;
            } else {
                break;
            }
        }

        this.activePiecePosition.y = finalY; // Visual snap
        const id = PIECE_TYPE_TO_ID[this.currentPiece.type];

        // Lock it!
        this.grid.lockPiece(blocks, this.activePiecePosition.x, finalY, id);
        this.data.piecesPlaced++;

        // gemini: 2025-12-18 Check immediately: did this piece touch the ceiling?
        // If so, player wins (AI topped out). Check BEFORE clearing lines.
        if (this.grid.isPieceTouchingCeiling(blocks, this.activePiecePosition.x, finalY)) {
            this.state = GameState.WIN;
            this.emit('pieceLocked');
            this.emit('gameOver', 'win');
            return;
        }

        const cleared = this.grid.clearLines();
        if (cleared > 0) {
            this.data.linesCleared += cleared;
            this.emit('linesCleared', cleared);
        }

        // Ceiling rule: lower ceiling every N placed pieces (difficulty dependent).
        const interval = this.getCeilingDropInterval();
        if (interval > 0 && this.data.piecesPlaced > 0 && this.data.piecesPlaced % interval === 0) {
            this.grid.lowerCeiling(1);
        }

        this.emit('pieceLocked');

        // gemini: 2025-12-18 Also check standard game status (AI reaching target lines).
        this.checkGameStatus();

        if (this.state !== GameState.WIN && this.state !== GameState.LOSE) {
            if (this.state === GameState.AI_ANIMATING) {
                this.startTurn();
            }
        }
    }

    private checkGameStatus() {
        // Condition 1: AI cleared target lines -> AI Wins (Player Loses)
        if (this.data.linesCleared >= this.data.targetLines) {
            this.state = GameState.LOSE;
            this.emit('gameOver', 'lose');
            return;
        }

        // Condition 2: Top Out -> Player Wins
        // lockPiece doesn't auto-check, we call isGameOver
        if (this.grid.isGameOver()) {
            this.state = GameState.WIN;
            this.emit('gameOver', 'win');
            return;
        }
    }

    public render() {
        this.renderer.clear();
        this.renderer.drawGrid(this.grid);
        this.renderer.drawUI(
            this.data.linesCleared * 100,
            this.data.level,
            this.data.linesCleared,
            this.data.targetLines,
            this.data.piecesPlaced,
            this.data.aiDifficultyLevel,
            this.debugHudEnabled
                ? {
                    wellSums: this.grid.getWellSums(),
                    holes: this.grid.countHoles(),
                    blockades: this.grid.countBlockades(),
                    holesCreated: this.lastAiMove?.holesCreated ?? 0,
                    lastMove: this.lastAiMove
                        ? {
                            holes: this.lastAiMove.holes,
                            holesCreated: this.lastAiMove.holesCreated,
                            blockades: this.lastAiMove.blockades,
                            wellSums: this.lastAiMove.wellSums,
                            linesCleared: this.lastAiMove.linesCleared,
                            score: this.lastAiMove.score,
                        }
                        : undefined,
                }
                : undefined,
            this.versionHudEnabled ? this.appVersion : undefined
        );

        if (this.state === GameState.SELECTING) {
            // Draw Piece Selector
            // We need to handle input for valid options.
            // Pass -1 for selection highlight if waiting for mouse, or handle via UI class.
            // Renderer expects (pieces, selectedIndex).
            // Since we handle input separately, let's just show them.
            this.renderer.drawPieceSelector(this.nextPieces, -1);
        } else if ((this.state === GameState.AI_PLAYING || this.state === GameState.AI_ANIMATING) && this.currentPiece) {
            // Draw current piece
            this.renderer.drawPiece(this.currentPiece, this.activePiecePosition.x, this.activePiecePosition.y);

            // Draw Ghost Piece
            // Need to calculate drop position for ghost
            const blocks = this.currentPiece.getBlocks();
            let finalY = -1;
            for (let dy = 0; dy < Grid.TOTAL_ROWS; dy++) {
                if (this.grid.isValidPosition(blocks, this.activePiecePosition.x, dy)) {
                    finalY = dy;
                } else {
                    break;
                }
            }
            if (finalY !== -1) {
                this.renderer.drawGhostPiece(this.currentPiece, this.activePiecePosition.x, finalY);
            }
        }


        // gemini: 2025-12-18 Removed canvas-based game over screen.
        // UIManager handles the win/lose overlays with proper HTML UI.
        // Canvas just keeps showing the final grid state.
    }

    public toggleDebugHud() {
        this.debugHudEnabled = !this.debugHudEnabled;
    }

    public toggleVersionHud() {
        this.versionHudEnabled = !this.versionHudEnabled;
    }

    public setDecisionLogVisible(visible: boolean) {
        this.decisionLogVisible = visible;
        if (visible) this.emit('aiTrace', this.lastDecisionLogText);
    }

    public getLastDecisionLog(): string {
        return this.lastDecisionLogText;
    }
}
