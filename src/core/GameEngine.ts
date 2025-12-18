
import { Grid } from './Grid';
import { Piece } from './Piece';
import { PieceFactory } from './PieceFactory';
import { AIController, AIWeights, AI_DIFFICULTY } from '@/ai/AIController';
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

    // AI Animation
    private aiTimer: number = 0;
    private currentAiSpeed: number = 500; // ms
    private moveQueue: { type: 'rotate' | 'move' | 'drop', value: number }[] = [];
    private animationTimer: number = 0;
    // private readonly ANIMATION_STEP_DELAY = 100; // Adjust based on speed?

    // Events
    private listeners: Record<string, EventCallback[]> = {};

    constructor(renderer: Renderer) {
        this.renderer = renderer;
        this.grid = new Grid();
        this.ai = new AIController();
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

    public setDifficulty(difficulty: 'EASY' | 'NORMAL' | 'HARD') {
        this.data.aiDifficulty = AI_DIFFICULTY[difficulty];
        this.data.aiDifficultyLevel = difficulty.toLowerCase();
        // Also adjust AI speed based on difficulty
        switch (difficulty) {
            case 'EASY':
                this.currentAiSpeed = 800; // Slower
                break;
            case 'NORMAL':
                this.currentAiSpeed = 500;
                break;
            case 'HARD':
                this.currentAiSpeed = 300; // Faster
                break;
        }
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
        this.data.aiDifficulty = config.aiWeights;
        this.data.aiDifficultyLevel = config.aiDifficultyLevel;
        // Apply AI speed
        this.currentAiSpeed = config.aiSpeed;

        // Reset Grid
        this.grid = new Grid(config.initialGrid);

        this.data.linesCleared = 0;
        this.data.piecesPlaced = 0;

        this.state = GameState.SELECTING;
        this.startTurn();
        this.emit('levelLoaded', config);
    }

    private startTurn() {
        this.nextPieces = PieceFactory.createRandomSet(3);
        this.state = GameState.SELECTING;
        this.emit('stateChange', this.state);
        this.emit('nextPieces', this.nextPieces);
    }

    public selectPiece(index: number) {
        if (this.state !== GameState.SELECTING) return;
        if (index < 0 || index >= this.nextPieces.length) return;

        this.currentPiece = this.nextPieces[index];
        // Spawn position: Top middle
        this.activePiecePosition = { x: 4, y: 0 };

        this.emit('pieceSelected', this.currentPiece);

        this.state = GameState.AI_PLAYING;
        this.aiTimer = 0;
        // Calculate move immediately
        this.prepareAIMove();
    }

    private prepareAIMove() {
        if (!this.currentPiece) return;
        const move = this.ai.findBestMove(this.grid, this.currentPiece, this.data.aiDifficulty);

        if (move) {
            this.generateMoveQueue(move);
            this.state = GameState.AI_ANIMATING;
            this.animationTimer = 0;
        } else {
            // AI Failed - Top Out
            this.state = GameState.WIN;
            this.emit('gameOver', 'win');
        }
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
        let finalY = -1;
        for (let dy = 0; dy < Grid.TOTAL_ROWS; dy++) {
            if (this.grid.isValidPosition(blocks, this.activePiecePosition.x, dy)) {
                finalY = dy;
            } else {
                break;
            }
        }

        if (finalY !== -1) {
            this.activePiecePosition.y = finalY; // Visual snap
            const id = PIECE_TYPE_TO_ID[this.currentPiece.type];
            this.grid.lockPiece(blocks, this.activePiecePosition.x, finalY, id);
            this.data.piecesPlaced++;

            const cleared = this.grid.clearLines();
            if (cleared > 0) {
                this.data.linesCleared += cleared;
                this.emit('linesCleared', cleared);
            }

            this.emit('pieceLocked');
            this.checkGameStatus();
        } else {
            // Determine why
            this.state = GameState.WIN;
            this.emit('gameOver', 'win');
        }

        if (this.state === GameState.AI_ANIMATING) {
            // End of turn
            this.startTurn();
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
            this.data.aiDifficultyLevel,
            this.debugHudEnabled
                ? { wellSums: this.grid.getWellSums(), holes: this.grid.countHoles(), blockades: this.grid.countBlockades() }
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

        if (this.state === GameState.WIN) {
            // Draw Win Overlay
            this.renderer.drawText("YOU WIN!", 300, 300, 50, '#0f0');
        } else if (this.state === GameState.LOSE) {
            this.renderer.drawText("GAME OVER", 300, 300, 50, '#f00');
        }
    }

    public toggleDebugHud() {
        this.debugHudEnabled = !this.debugHudEnabled;
    }

    public toggleVersionHud() {
        this.versionHudEnabled = !this.versionHudEnabled;
    }
}
