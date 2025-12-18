
import { Grid } from '@/core/Grid';
import { Piece } from '@/core/Piece';
import { ID_TO_COLOR } from '@/core/PieceData';
import { Animator } from './Animator';

export class Renderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private width: number = 800;
    private height: number = 600;
    public animator: Animator;
    // Layout State (Public for InputManager)
    public layout = {
        cellSize: 24,
        gridX: 0,
        gridY: 0,
        gridWidth: 0,
        gridHeight: 0,
        selectionY: 20,
        selectionHeight: 80,
        selectionX: 0,
        slotWidth: 0,
        isPortrait: false
    };

    private readonly VISIBLE_START_ROW = 2; // Rows 0-1 are hidden buffer

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.animator = new Animator();

        // Initial setup
        this.handleResize();

        // Listen to window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    private handleResize() {
        const dpr = window.devicePixelRatio || 1;

        // Use full window size
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Set physical size
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;

        // Reset transform and scale to match logical coordinate system (CSS pixels)
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        this.recalculateLayout();
    }

    private recalculateLayout() {
        const cols = Grid.WIDTH; // 10
        const rows = Grid.TOTAL_ROWS - this.VISIBLE_START_ROW; // 20

        const isPortrait = this.height > this.width;
        this.layout.isPortrait = isPortrait;

        // Selection area height
        this.layout.selectionHeight = 70;

        if (isPortrait) {
            // Portrait: Candidates at very top, Grid below
            this.layout.selectionY = 10;
            const gridStartY = this.layout.selectionY + this.layout.selectionHeight + 10; // 10 + 70 + 10 = 90

            // Available height for grid (leave 50px at bottom for HUD)
            const availableHeight = this.height - gridStartY - 60;
            const availableWidth = this.width - 20; // 10px margin each side

            // Calculate cell size
            const maxCellH = Math.floor(availableHeight / rows);
            const maxCellW = Math.floor(availableWidth / cols);

            let cell = Math.min(maxCellH, maxCellW);
            cell = Math.min(cell, 35);
            cell = Math.max(cell, 12);

            this.layout.cellSize = cell;
            this.layout.gridWidth = cols * cell;
            this.layout.gridHeight = rows * cell;
            this.layout.gridX = Math.floor((this.width - this.layout.gridWidth) / 2);
            this.layout.gridY = gridStartY;
        } else {
            // Landscape: More space
            this.layout.selectionY = 15;

            const safeWidth = this.width - 200; // Leave space for HUD on right
            const safeHeight = this.height - 130;

            const maxCellH = Math.floor(safeHeight / rows);
            const maxCellW = Math.floor(safeWidth / cols);

            let cell = Math.min(maxCellH, maxCellW);
            cell = Math.min(cell, 30);
            cell = Math.max(cell, 15);

            this.layout.cellSize = cell;
            this.layout.gridWidth = cols * cell;
            this.layout.gridHeight = rows * cell;
            this.layout.gridX = Math.floor((this.width - this.layout.gridWidth) / 2) - 60; // Shift left for HUD
            this.layout.gridY = 110;
        }

        // Selection Area Matches Grid Width
        this.layout.selectionX = this.layout.gridX;
        this.layout.slotWidth = this.layout.gridWidth / 3;
    }

    public clear() {
        this.ctx.fillStyle = '#1a1a1a'; // Dark background
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.animator.draw(this.ctx);
    }

    public update(dt: number) {
        this.animator.update(dt);
    }

    // Draw animations layer
    public drawAnimations() {
        this.animator.draw(this.ctx);
    }

    public drawGrid(grid: Grid) {
        const shake = this.animator.getShake();
        this.ctx.save();
        this.ctx.translate(shake.x, shake.y);

        // 1. Draw Grid Background
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(
            this.layout.gridX,
            this.layout.gridY,
            this.layout.gridWidth,
            this.layout.gridHeight
        );

        // 2. Draw Faint Grid Lines
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        // Vertical lines
        for (let i = 0; i <= Grid.WIDTH; i++) {
            const x = this.layout.gridX + i * this.layout.cellSize;
            this.ctx.moveTo(x, this.layout.gridY);
            this.ctx.lineTo(x, this.layout.gridY + this.layout.gridHeight);
        }
        // Horizontal lines
        for (let j = 0; j <= (Grid.TOTAL_ROWS - this.VISIBLE_START_ROW); j++) {
            const y = this.layout.gridY + j * this.layout.cellSize;
            this.ctx.moveTo(this.layout.gridX, y);
            this.ctx.lineTo(this.layout.gridX + this.layout.gridWidth, y);
        }
        this.ctx.stroke();

        // 3. Draw Outer Border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            this.layout.gridX - 2,
            this.layout.gridY - 2,
            this.layout.gridWidth + 4,
            this.layout.gridHeight + 4
        );

        // Draw Grid Cells
        const data = grid.data;
        for (let y = this.VISIBLE_START_ROW; y < Grid.TOTAL_ROWS; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                const cell = data[y][x];
                const color = ID_TO_COLOR[cell];

                if (cell !== 0 && color) {
                    this.drawCell(
                        this.layout.gridX + x * this.layout.cellSize,
                        this.layout.gridY + (y - this.VISIBLE_START_ROW) * this.layout.cellSize,
                        color
                    );
                }
            }
        }
        this.ctx.restore();
    }

    public drawPiece(piece: Piece, gridX: number, gridY: number, rotation?: number) {
        const shake = this.animator.getShake();
        this.ctx.save();
        this.ctx.translate(shake.x, shake.y);

        const blocks = piece.getBlocks(rotation);
        const color = piece.getColor();

        for (const block of blocks) {
            const x = this.layout.gridX + (gridX + block.x) * this.layout.cellSize;
            const y = this.layout.gridY + (gridY + block.y - this.VISIBLE_START_ROW) * this.layout.cellSize;

            if (gridY + block.y >= this.VISIBLE_START_ROW) {
                this.drawCell(x, y, color);
            }
        }
        this.ctx.restore();
    }

    public drawGhostPiece(piece: Piece, gridX: number, gridY: number, rotation?: number) {
        const shake = this.animator.getShake();
        this.ctx.save();
        this.ctx.translate(shake.x, shake.y);

        this.ctx.globalAlpha = 0.3;
        const blocks = piece.getBlocks(rotation);
        const color = piece.getColor();

        for (const block of blocks) {
            const x = this.layout.gridX + (gridX + block.x) * this.layout.cellSize;
            const y = this.layout.gridY + (gridY + block.y - this.VISIBLE_START_ROW) * this.layout.cellSize;

            if (gridY + block.y >= this.VISIBLE_START_ROW) {
                this.drawCell(x, y, color, true);
            }
        }
        this.ctx.globalAlpha = 1.0;
        this.ctx.restore();
    }

    private drawCell(x: number, y: number, color: string, isGhost = false) {
        const size = this.layout.cellSize - 2;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x + 1, y + 1, size, size);

        // Standard Bevel
        if (!isGhost) {
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.fillRect(x + 1, y + 1, size, size / 3);
        }

        // Gold Shine Effect
        if (!isGhost && color === '#FFD700') {
            const time = performance.now() / 500;
            const alpha = (Math.sin(time) + 1) / 2 * 0.4 + 0.1;

            this.ctx.save();
            this.ctx.strokeStyle = `rgba(255, 255, 200, ${alpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#FFD700';
            this.ctx.strokeRect(x + 2, y + 2, size - 2, size - 2);
            this.ctx.restore();
        }
    }

    public drawPieceSelector(pieces: Piece[], selectedIndex: number) {
        // Draw Container Box
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            this.layout.selectionX - 2,
            this.layout.selectionY - 2,
            this.layout.gridWidth + 4,
            this.layout.selectionHeight + 4
        );

        // Label
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText("CANDIDATES", this.layout.selectionX, this.layout.selectionY - 8);

        // Draw slots
        const slotWidth = this.layout.slotWidth;

        pieces.forEach((piece, index) => {
            const cx = this.layout.selectionX + index * slotWidth + slotWidth / 2;
            const cy = this.layout.selectionY + this.layout.selectionHeight / 2;

            // Highlight selected
            if (index === selectedIndex) {
                this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
                this.ctx.fillRect(
                    this.layout.selectionX + index * slotWidth,
                    this.layout.selectionY,
                    slotWidth,
                    this.layout.selectionHeight
                );
            }

            // Draw Piece centered
            const blocks = piece.getBlocks();
            const color = piece.getColor();

            for (const block of blocks) {
                // block.x * CELL_SIZE is offset from center
                // Center piece at cx, cy
                this.drawCell(
                    cx + block.x * this.layout.cellSize - this.layout.cellSize / 2,
                    cy + block.y * this.layout.cellSize - this.layout.cellSize / 2,
                    color
                );
            }

            // Key Hint
            this.ctx.fillStyle = '#888';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${index + 1}`, cx, this.layout.selectionY + this.layout.selectionHeight - 5);
        });
    }

    public drawUI(
        score: number,
        level: number,
        lines: number,
        targetLines: number,
        difficultyLevel?: string,
        debug?: {
            wellSums: number;
            holes: number;
            holesCreated: number;
            blockades: number;
            lastMove?: {
                holes: number;
                holesCreated: number;
                blockades: number;
                wellSums: number;
                linesCleared: number;
                score: number;
            };
        },
        version?: string
    ) {
        this.ctx.textAlign = 'left';
        this.ctx.font = '12px Arial';

        let startX, startY;

        if (this.layout.isPortrait) {
            // Portrait: Bottom
            startX = this.layout.gridX;
            startY = this.layout.gridY + this.layout.gridHeight + 20;

            // Horizontal layout below grid
            this.drawText("SCORE", startX, startY, 12, '#aaa');
            this.drawText(`${score}`, startX, startY + 20, 20, '#fff');

            this.drawText("LEVEL", startX + 100, startY, 12, '#aaa');
            this.drawText(`${level}`, startX + 100, startY + 20, 20, '#fff');

            // Goal/progress: player loses if AI reaches targetLines.
            this.drawText("AI LINES", startX + 200, startY, 12, '#aaa');
            this.drawText(`${lines}/${targetLines}`, startX + 200, startY + 20, 20, '#fff');

            if (difficultyLevel) {
                this.drawText("DIFF", startX + 300, startY, 12, '#aaa');
                this.drawText(`${difficultyLevel.toUpperCase()}`, startX + 300, startY + 20, 18, '#fff');
            }

            if (debug) {
                this.drawText("WELLS", startX + 420, startY, 12, '#aaa');
                this.drawText(`${debug.wellSums}`, startX + 420, startY + 20, 18, '#fff');

                this.drawText("HOLES", startX + 470, startY, 12, '#aaa');
                this.drawText(`${debug.holes}`, startX + 470, startY + 20, 18, '#fff');
            }

            if (version) {
                this.drawText("VER", startX + 520, startY, 12, '#666');
                this.drawText(version, startX + 520, startY + 20, 12, '#888');
            }
        } else {
            // Landscape: Right side
            startX = this.layout.gridX + this.layout.gridWidth + 20;
            startY = this.layout.gridY;
            const panelBottomY = this.layout.gridY + this.layout.gridHeight;

            this.drawText("SCORE", startX, startY + 20, 14, '#aaa');
            this.drawText(`${score}`, startX, startY + 50, 24, '#fff');

            this.drawText("LEVEL", startX, startY + 100, 14, '#aaa');
            this.drawText(`${level}`, startX, startY + 130, 24, '#fff');

            // Goal/progress: player loses if AI reaches targetLines.
            this.drawText("AI LINES", startX, startY + 180, 14, '#aaa');
            this.drawText(`${lines}/${targetLines}`, startX, startY + 210, 24, '#fff');

            if (difficultyLevel) {
                // Requested: show difficulty under LINES
                this.drawText("DIFFICULTY", startX, startY + 250, 14, '#aaa');
                this.drawText(`${difficultyLevel.toUpperCase()}`, startX, startY + 280, 22, '#fff');
            }

            if (debug) {
                const y0 = startY + 320;
                this.drawText(`HOLES ${debug.holes} (+${debug.holesCreated})`, startX, y0, 14, '#aaa');
                this.drawText(`BLOCK ${debug.blockades}   WELLS ${debug.wellSums}`, startX, y0 + 24, 14, '#aaa');

                if (debug.lastMove) {
                    this.drawText(
                        `PRED H${debug.lastMove.holes} (+${debug.lastMove.holesCreated}) B${debug.lastMove.blockades} W${debug.lastMove.wellSums} L${debug.lastMove.linesCleared}`,
                        startX,
                        y0 + 48,
                        12,
                        '#888'
                    );
                }
            }

            // Version/debug hints: always at bottom of the right panel so they never overlap with debug lines.
            if (version) {
                this.drawText(version, startX, panelBottomY - 18, 12, '#666');
            }
            this.drawText("D:DEBUG  V:VERSION  S:LOG", startX, panelBottomY - 2, 12, '#555');
        }
    }

    public drawText(text: string, x: number, y: number, size: number = 30, color: string = '#fff', textAlign: CanvasTextAlign = 'left') {
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px Arial`;
        this.ctx.textAlign = textAlign;
        this.ctx.fillText(text, x, y);
    }
}
