
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

    // AI Animation
    private aiTimer: number = 0;
    private currentAiSpeed: number = 500; // ms

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
            aiDifficulty: AI_DIFFICULTY.NORMAL
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
        // Grid Width 10. Center is 4.
        // Piece shapes vary, but 4 is safe start.
        // y start at 0 (hidden)
        this.activePiecePosition = { x: 4, y: 0 };

        this.emit('pieceSelected', this.currentPiece);

        this.state = GameState.AI_PLAYING;
        this.aiTimer = 0;

        // Calculate AI Move immediately? Or wait?
        // Let's calculate now, execute later.
    }

    public update(deltaTime: number) {
        if (this.state === GameState.AI_PLAYING && this.currentPiece) {
            this.aiTimer += deltaTime;

            if (this.aiTimer >= this.currentAiSpeed) {
                this.executeAIMove();
                this.aiTimer = 0;
            }
        }
    }

    private executeAIMove() {
        if (!this.currentPiece) return;

        const move = this.ai.findBestMove(this.grid, this.currentPiece, this.data.aiDifficulty);

        if (move) {
            // Apply move
            // 1. Set Rotation
            this.currentPiece.setRotation(move.rotation);
            // 2. Set X and Drop Y
            // We need to find the drop Y again to be safe (locking)
            // AI returns x, validY is implicit in score calculation but we didn't store it in MoveResult?
            // Actually findBestMove does calculate validY but returns {x, rotation, score}.
            // We need to re-calculate Y or pass it.
            // Let's re-calculate logic: standard drop.

            const blocks = this.currentPiece.getBlocks();
            let finalY = -1;
            for (let dy = 0; dy < Grid.TOTAL_ROWS; dy++) {
                if (this.grid.isValidPosition(blocks, move.x, dy)) {
                    finalY = dy;
                } else {
                    break;
                }
            }

            if (finalY !== -1) {
                // Lock it
                const id = PIECE_TYPE_TO_ID[this.currentPiece.type];
                this.grid.lockPiece(blocks, move.x, finalY, id);
                this.data.piecesPlaced++;

                // Check Lines
                const cleared = this.grid.clearLines();
                if (cleared > 0) {
                    this.data.linesCleared += cleared;
                    this.emit('linesCleared', cleared);
                }

                this.emit('pieceLocked');

                // Check Win/Lose
                this.checkGameStatus();
            } else {
                // Should not happen if AI found a move
                console.error("AI returned valid move but placement failed");
                this.state = GameState.WIN; // Player wins if AI fails?
                this.emit('gameOver', 'win');
            }
        } else {
            // AI Couldn't move -> Top Out -> Player Wins!
            this.state = GameState.WIN;
            this.emit('gameOver', 'win');
            return;
        }

        if (this.state === GameState.AI_PLAYING) {
            // Continue to next turn
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
        this.renderer.drawUI(this.data.linesCleared * 100, this.data.level, this.data.linesCleared);

        if (this.state === GameState.SELECTING) {
            // Draw Piece Selector
            // We need to handle input for valid options.
            // Pass -1 for selection highlight if waiting for mouse, or handle via UI class.
            // Renderer expects (pieces, selectedIndex).
            // Since we handle input separately, let's just show them.
            this.renderer.drawPieceSelector(this.nextPieces, -1);
        } else if (this.state === GameState.AI_PLAYING && this.currentPiece) {
            // Draw current piece at spawn (or animating)
            // For now static at spawn or maybe we can interpolate x/y for effect?
            // T06 says "0.5s animation".
            // We can just draw it at activePiecePosition?
            // For M1, let's just draw it at spawn.

            // To be helpful, we can show the Ghost Piece where AI is GOING to put it?
            // "AI 计算最佳位置 (异步)" -> We know the target.
            // If we calculate move at start of state, we can show ghost.
            // For now, let's just show piece at top.
            this.renderer.drawPiece(this.currentPiece, this.activePiecePosition.x, this.activePiecePosition.y);
        }

        if (this.state === GameState.WIN) {
            // Draw Win Overlay
            this.renderer.drawText("YOU WIN!", 300, 300, 50, '#0f0');
        } else if (this.state === GameState.LOSE) {
            this.renderer.drawText("GAME OVER", 300, 300, 50, '#f00');
        }
    }
}
