
import { Grid } from '@/core/Grid';
import { Piece } from '@/core/Piece';
import { ID_TO_COLOR } from '@/core/PieceData';
import { Animator } from './Animator';

export class Renderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;
    public animator: Animator;

    private readonly CELL_SIZE = 24;
    private readonly GRID_OFFSET_X = 280; // (800 - 240) / 2
    private readonly GRID_OFFSET_Y = 110;

    // Selection Area
    private readonly SELECTION_Y = 20;
    private readonly SELECTION_HEIGHT = 80;

    // Derived
    private get GRID_WIDTH_PX() { return Grid.WIDTH * this.CELL_SIZE; }
    private get GRID_HEIGHT_PX() { return (Grid.TOTAL_ROWS - this.VISIBLE_START_ROW) * this.CELL_SIZE; }
    private readonly VISIBLE_START_ROW = 2; // Rows 0-1 are hidden buffer

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.width = canvas.width;
        this.height = canvas.height;
        this.animator = new Animator();

        // Initial setup
        this.handleResize();
    }

    private handleResize() {
        const dpr = window.devicePixelRatio || 1;
        // Logical size
        const logicalWidth = 800;
        const logicalHeight = 600;

        // Set physical size
        this.canvas.width = logicalWidth * dpr;
        this.canvas.height = logicalHeight * dpr;

        // Scale context to match logical coordinate system
        this.ctx.scale(dpr, dpr);

        // Update internal dimensions to logical size
        this.width = logicalWidth;
        this.height = logicalHeight;

        // Note: CSS max-width/max-height handles visual fitting (Letterboxing/Scaling)
        // verify css style width/height match logical if not set by flex? 
        // Actually CSS 'max-width: 100%' works best if we don't force style.width, 
        // or set style.width to 100%?
        // With object-fit: contain, we typically want the element to fill the container 
        // but keep aspect ratio.
        // If we set canvas width/height attributes, browser uses them as aspect ratio.
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

        // 1. Draw Grid Background (Darker area)
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(
            this.GRID_OFFSET_X,
            this.GRID_OFFSET_Y,
            this.GRID_WIDTH_PX,
            this.GRID_HEIGHT_PX
        );

        // 2. Draw Faint Grid Lines (Dark Grid)
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        // Vertical lines
        for (let i = 0; i <= Grid.WIDTH; i++) {
            const x = this.GRID_OFFSET_X + i * this.CELL_SIZE;
            this.ctx.moveTo(x, this.GRID_OFFSET_Y);
            this.ctx.lineTo(x, this.GRID_OFFSET_Y + this.GRID_HEIGHT_PX);
        }
        // Horizontal lines
        for (let j = 0; j <= (Grid.TOTAL_ROWS - this.VISIBLE_START_ROW); j++) {
            const y = this.GRID_OFFSET_Y + j * this.CELL_SIZE;
            this.ctx.moveTo(this.GRID_OFFSET_X, y);
            this.ctx.lineTo(this.GRID_OFFSET_X + this.GRID_WIDTH_PX, y);
        }
        this.ctx.stroke();

        // 3. Draw Outer Border (Bright)
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            this.GRID_OFFSET_X - 2,
            this.GRID_OFFSET_Y - 2,
            this.GRID_WIDTH_PX + 4,
            this.GRID_HEIGHT_PX + 4
        );

        // Draw Grid Cells
        const data = grid.data;
        for (let y = this.VISIBLE_START_ROW; y < Grid.TOTAL_ROWS; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                const cell = data[y][x];
                const color = ID_TO_COLOR[cell];

                if (cell !== 0 && color) {
                    this.drawCell(
                        this.GRID_OFFSET_X + x * this.CELL_SIZE,
                        this.GRID_OFFSET_Y + (y - this.VISIBLE_START_ROW) * this.CELL_SIZE,
                        color
                    );
                } else {
                    // Draw faint grid lines
                    this.ctx.strokeStyle = '#2a2a2a';
                    this.ctx.strokeRect(
                        this.GRID_OFFSET_X + x * this.CELL_SIZE,
                        this.GRID_OFFSET_Y + (y - this.VISIBLE_START_ROW) * this.CELL_SIZE,
                        this.CELL_SIZE,
                        this.CELL_SIZE
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

        // Calculate Pixel Position relative to Grid
        // gridY is logical Y (0-21). Visible starts at 2.
        // Screen Y = GRID_OFFSET_Y + (gridY - 2) * CELL_SIZE

        for (const block of blocks) {
            const x = this.GRID_OFFSET_X + (gridX + block.x) * this.CELL_SIZE;
            const y = this.GRID_OFFSET_Y + (gridY + block.y - this.VISIBLE_START_ROW) * this.CELL_SIZE;

            // Only draw if within visible grid area (approx)
            // Allow drawing slightly above for drop animation?
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
            const x = this.GRID_OFFSET_X + (gridX + block.x) * this.CELL_SIZE;
            const y = this.GRID_OFFSET_Y + (gridY + block.y - this.VISIBLE_START_ROW) * this.CELL_SIZE;

            if (gridY + block.y >= this.VISIBLE_START_ROW) {
                this.drawCell(x, y, color, true);
            }
        }
        this.ctx.globalAlpha = 1.0;
        this.ctx.restore();
    }

    private drawCell(x: number, y: number, color: string, isGhost = false) {
        this.ctx.fillStyle = color;
        // Inner padding for block look
        const size = this.CELL_SIZE - 2;
        this.ctx.fillRect(x + 1, y + 1, size, size);

        // Bevel/Shine effect
        if (!isGhost) {
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.fillRect(x + 1, y + 1, size, size / 3);
        }
    }

    public drawPieceSelector(pieces: Piece[], selectedIndex: number) {
        // Draw Container Box (White Border) same width as Grid
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            this.GRID_OFFSET_X - 2,
            this.SELECTION_Y - 2,
            this.GRID_WIDTH_PX + 4,
            this.SELECTION_HEIGHT + 4
        );

        // Label "NEXT"
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText("CANDIDATES", this.GRID_OFFSET_X, this.SELECTION_Y - 8);

        // Draw 3 Pieces distributed
        const slotWidth = this.GRID_WIDTH_PX / 3;

        pieces.forEach((piece, index) => {
            const cx = this.GRID_OFFSET_X + index * slotWidth + slotWidth / 2;
            const cy = this.SELECTION_Y + this.SELECTION_HEIGHT / 2;

            // Highlight selected
            if (index === selectedIndex) {
                this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
                this.ctx.fillRect(
                    this.GRID_OFFSET_X + index * slotWidth,
                    this.SELECTION_Y,
                    slotWidth,
                    this.SELECTION_HEIGHT
                );
            }

            // Draw Piece centered
            const blocks = piece.getBlocks();
            const color = piece.getColor();

            for (const block of blocks) {
                // block.x * CELL_SIZE is offset from center
                // Center piece at cx, cy
                this.drawCell(
                    cx + block.x * this.CELL_SIZE - this.CELL_SIZE / 2,
                    cy + block.y * this.CELL_SIZE - this.CELL_SIZE / 2,
                    color
                );
            }

            // Key Hint
            this.ctx.fillStyle = '#888';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${index + 1}`, cx, this.SELECTION_Y + this.SELECTION_HEIGHT - 5);
        });
    }

    public drawUI(score: number, level: number, lines: number) {
        // Draw HUD on RIGHT side of Grid
        const startX = this.GRID_OFFSET_X + this.GRID_WIDTH_PX + 20;
        const startY = this.GRID_OFFSET_Y;

        this.ctx.textAlign = 'left';

        // SCORE
        this.drawText("SCORE", startX, startY + 20, 14, '#aaa');
        this.drawText(`${score}`, startX, startY + 50, 24, '#fff');

        // LEVEL
        this.drawText("LEVEL", startX, startY + 100, 14, '#aaa');
        this.drawText(`${level}`, startX, startY + 130, 24, '#fff');

        // LINES
        this.drawText("LINES", startX, startY + 180, 14, '#aaa');
        this.drawText(`${lines}`, startX, startY + 210, 24, '#fff');
    }
    public drawText(text: string, x: number, y: number, size: number = 30, color: string = '#fff', textAlign: CanvasTextAlign = 'left') {
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px Arial`;
        this.ctx.textAlign = textAlign;
        this.ctx.fillText(text, x, y);
    }
}
