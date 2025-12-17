
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

    private readonly CELL_SIZE = 30;
    private readonly GRID_OFFSET_X = 50;
    private readonly GRID_OFFSET_Y = 50;
    private readonly VISIBLE_START_ROW = 2; // Rows 0-1 are hidden
    private readonly GRID_WIDTH_PX = 10 * this.CELL_SIZE;
    private readonly GRID_HEIGHT_PX = 20 * this.CELL_SIZE;

    // UI Layout
    private readonly UI_OFFSET_X = 400;
    private readonly UI_OFFSET_Y = 50;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.width = canvas.width;
        this.height = canvas.height;
        this.animator = new Animator();

        // Initial setup
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
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
        this.animator.draw(this.ctx); // Draw particles below UI but above BG? Or on top?
        // Let's draw particles on top of everything usually.
        // If we clear here, we wipe previous frame.
        // We should draw animations AFTER grid/pieces.
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

        // Draw Grid Background
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
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
                    this.drawCell(x, y, color);
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

        for (const block of blocks) {
            const x = gridX + block.x;
            const y = gridY + block.y;

            // Only draw if visible
            if (y >= this.VISIBLE_START_ROW) {
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
            const x = gridX + block.x;
            const y = gridY + block.y;

            if (y >= this.VISIBLE_START_ROW) {
                this.drawCell(x, y, color, true);
            }
        }
        this.ctx.globalAlpha = 1.0;
        this.ctx.restore();
    }

    private drawCell(x: number, y: number, color: string, isGhost = false) {
        const screenX = this.GRID_OFFSET_X + x * this.CELL_SIZE;
        const screenY = this.GRID_OFFSET_Y + (y - this.VISIBLE_START_ROW) * this.CELL_SIZE;

        this.ctx.fillStyle = color;
        this.ctx.fillRect(screenX + 1, screenY + 1, this.CELL_SIZE - 2, this.CELL_SIZE - 2);

        if (!isGhost) {
            // Simple 3D effect / Highlight
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.fillRect(screenX + 1, screenY + 1, this.CELL_SIZE - 2, 4);

            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(screenX + 1, screenY + this.CELL_SIZE - 4 - 1, this.CELL_SIZE - 2, 4);
        }
    }

    public drawPieceSelector(pieces: Piece[], selectedIndex: number) {
        // Draw "Next Pieces" area / Selection area
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText("Select Piece:", this.UI_OFFSET_X, this.UI_OFFSET_Y);
        this.ctx.font = '14px Arial';
        this.ctx.fillText("(Press 1, 2, 3)", this.UI_OFFSET_X, this.UI_OFFSET_Y + 25);

        pieces.forEach((piece, index) => {
            const isSelected = index === selectedIndex;
            const baseX = this.UI_OFFSET_X;
            const baseY = this.UI_OFFSET_Y + 60 + index * 100;

            // Draw Container
            this.ctx.strokeStyle = isSelected ? '#ffcc00' : '#444';
            this.ctx.lineWidth = isSelected ? 3 : 1;
            this.ctx.strokeRect(baseX, baseY, 100, 80);

            if (isSelected) {
                this.ctx.fillStyle = 'rgba(255, 204, 0, 0.1)';
                this.ctx.fillRect(baseX, baseY, 100, 80);
            }

            // Draw Number
            this.ctx.fillStyle = isSelected ? '#ffcc00' : '#888';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(`${index + 1}`, baseX + 5, baseY + 20);

            // Draw Mini Piece
            this.drawMiniPiece(piece, baseX + 50, baseY + 40);
        });
    }

    private drawMiniPiece(piece: Piece, centerX: number, centerY: number) {
        const blocks = piece.getBlocks(0); // Show default rotation
        const color = piece.getColor();
        const miniSize = 20;

        for (const block of blocks) {
            const x = centerX + block.x * miniSize;
            const y = centerY + block.y * miniSize;

            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, miniSize - 1, miniSize - 1);
        }
    }

    // Draw generic text for UI (Score etc)
    public drawUI(score: number, level: number, lines: number) {
        const x = this.UI_OFFSET_X;
        const y = 400;
        const lh = 30;

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';

        this.ctx.fillText(`Score: ${score}`, x, y);
        this.ctx.fillText(`Level: ${level}`, x, y + lh);
        this.ctx.fillText(`Lines: ${lines}`, x, y + lh * 2);
    }
    public drawText(text: string, x: number, y: number, size: number = 30, color: string = '#fff') {
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px Arial`;
        this.ctx.fillText(text, x, y);
    }
}
