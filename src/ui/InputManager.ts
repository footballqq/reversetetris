
type InputCallback = (data?: any) => void;

export class InputManager {
    private canvas: HTMLCanvasElement;
    private listeners: Record<string, InputCallback[]> = {};

    // UI Layout Constants (Must match Renderer)
    // Ideally these come from a shared config or injected config
    private readonly UI_OFFSET_X = 400;
    private readonly UI_OFFSET_Y = 50;
    private readonly PIECE_BOX_WIDTH = 100;
    private readonly PIECE_BOX_HEIGHT = 80;
    private readonly PIECE_BOX_GAP = 20;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.setupKeyboardListeners();
        this.setupMouseListeners();
        this.setupTouchListeners();
    }

    public on(event: string, callback: InputCallback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    private emit(event: string, data?: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    private setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            switch (e.key) {
                case '1':
                    this.emit('selectPiece', 0);
                    break;
                case '2':
                    this.emit('selectPiece', 1);
                    break;
                case '3':
                    this.emit('selectPiece', 2);
                    break;
                case '4':
                    // Premium feature, but let's emit it
                    this.emit('selectPiece', 3);
                    break;
                case 'p':
                case 'P':
                    this.emit('pause');
                    break;
                case 'r':
                case 'R':
                    this.emit('restart');
                    break;
                case 'Escape':
                    this.emit('menu');
                    break;
            }
        });
    }

    private getScaledCoordinates(clientX: number, clientY: number): { x: number, y: number } {
        const rect = this.canvas.getBoundingClientRect();
        // Map to logical resolution 800x600 regardless of internal DPI scaling
        const scaleX = 800 / rect.width;
        const scaleY = 600 / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    private setupMouseListeners() {
        this.canvas.addEventListener('mousedown', (e) => {
            const pos = this.getScaledCoordinates(e.clientX, e.clientY);
            this.handlePointerDown(pos.x, pos.y);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const pos = this.getScaledCoordinates(e.clientX, e.clientY);
            this.handlePointerMove(pos.x, pos.y);
        });
    }

    private setupTouchListeners() {
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling
            const touch = e.touches[0];
            const pos = this.getScaledCoordinates(touch.clientX, touch.clientY);
            this.handlePointerDown(pos.x, pos.y);
        }, { passive: false });
    }

    private handlePointerDown(x: number, y: number) {
        // Check Piece Selection Areas
        // 3 pieces usually
        for (let i = 0; i < 3; i++) {
            const bx = this.UI_OFFSET_X;
            const by = this.UI_OFFSET_Y + 60 + i * (this.PIECE_BOX_HEIGHT + this.PIECE_BOX_GAP);

            if (x >= bx && x <= bx + this.PIECE_BOX_WIDTH &&
                y >= by && y <= by + this.PIECE_BOX_HEIGHT) {
                this.emit('selectPiece', i);
                return;
            }
        }

        // Mobile tap anywhere else to maybe pause?
        // Or if game over restart?
        // For now just pieces.
    }

    private handlePointerMove(x: number, y: number) {
        // Hover effects?
        // Emit 'hover' if inside a box?
        let hoveredIndex = -1;
        for (let i = 0; i < 3; i++) {
            const bx = this.UI_OFFSET_X;
            const by = this.UI_OFFSET_Y + 60 + i * (this.PIECE_BOX_HEIGHT + this.PIECE_BOX_GAP);

            if (x >= bx && x <= bx + this.PIECE_BOX_WIDTH &&
                y >= by && y <= by + this.PIECE_BOX_HEIGHT) {
                hoveredIndex = i;
                break;
            }
        }

        if (hoveredIndex !== -1) {
            this.emit('hoverPiece', hoveredIndex);
        } else {
            this.emit('hoverPiece', -1);
        }
    }
}
