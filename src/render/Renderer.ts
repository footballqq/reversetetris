
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

    private readonly CELL_SIZE = 25;
    private readonly GRID_OFFSET_X = 275; // Centered: (800 - 250) / 2
    private readonly GRID_OFFSET_Y = 20;  // Near top

    // Derived
    private get GRID_WIDTH_PX() { return Grid.WIDTH * this.CELL_SIZE; }
    private get GRID_HEIGHT_PX() { return (Grid.TOTAL_ROWS - this.VISIBLE_START_ROW) * this.CELL_SIZE; }
    private readonly VISIBLE_START_ROW = 2; // Rows 0-1 are hidden buffer

    // UI Layout
    // Candidate area at BOTTOM
    private readonly PIECE_BOX_Y = 530;
    private readonly PIECE_BOX_SIZE = 120; // Width allocated per piece
    private readonly PIECE_START_X = 220; // Center the 3 pieces group: 800/2 - (3*120)/2 = 400 - 180 = 220
    private readonly PIECE_GAP = 10;

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
        // Draw bottom area background
        // Optional: draw background for piece area
        // this.ctx.fillStyle = '#222';
        // this.ctx.fillRect(0, this.PIECE_BOX_Y - 20, 800, 150);

        pieces.forEach((piece, index) => {
            const isSelected = index === selectedIndex;

            const offsetX = this.PIECE_START_X + index * (this.PIECE_BOX_SIZE + this.PIECE_GAP);
            const offsetY = this.PIECE_BOX_Y;

            // Highlight selected
            if (isSelected) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                this.ctx.fillRect(offsetX, offsetY, this.PIECE_BOX_SIZE, 80); // Height approx
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(offsetX, offsetY, this.PIECE_BOX_SIZE, 80);
            } else {
                // Dim non-selected?
                // this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
                // this.ctx.fillRect(offsetX, offsetY, 120, 80);
            }

            // Draw box border
            this.ctx.strokeStyle = '#444';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(offsetX, offsetY, this.PIECE_BOX_SIZE, 80);

            // Draw Piece centered in box
            // Piece usually 3-4 blocks.
            // Center is roughly +1.5 blocks?
            // Let's hardcode center offset (40, 10) relative to box
            const pieceX = offsetX + 20;
            const pieceY = offsetY + 10;

            const blocks = piece.getBlocks();
            const color = piece.getColor();

            for (const block of blocks) {
                this.drawCell(pieceX + block.x * this.CELL_SIZE, pieceY + block.y * this.CELL_SIZE, color);
            }

            // Draw Key Hint
            this.ctx.fillStyle = '#888';
            this.ctx.font = '12px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`[${index + 1}]`, offsetX + this.PIECE_BOX_SIZE / 2, offsetY + 95);
        });
    }

    public drawUI(score: number, level: number, lines: number) {
        // Draw HUD on sides (Top area)
        this.ctx.textAlign = 'left';

        // Left side
        this.drawText(`LEVEL`, 50, 40, 14, '#aaa', 'left');
        this.drawText(`${level}`, 100, 40, 20, '#fff', 'left');

        this.drawText(`LINES`, 200, 40, 14, '#aaa', 'left'); // Moved right for horizontal layout
        this.drawText(`${lines}`, 250, 40, 20, '#fff', 'left');

        // Right side - Score
        this.drawText(`SCORE`, 600, 40, 14, '#aaa', 'right');
        this.drawText(`${score}`, 750, 40, 20, '#fff', 'right');
    }
    public drawText(text: string, x: number, y: number, size: number = 30, color: string = '#fff', textAlign: CanvasTextAlign = 'left') {
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px Arial`;
        this.ctx.textAlign = textAlign;
        this.ctx.fillText(text, x, y);
    }
}
