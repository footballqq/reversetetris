
type InputCallback = (data?: any) => void;

export class InputManager {
    private canvas: HTMLCanvasElement;
    private listeners: Record<string, InputCallback[]> = {};

    // UI Layout Constants (Must match Renderer)
    // Ideally these come from a shared config or injected config
    // Layout constants are now local to detection logic or could be shared
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
        // Redesigned Top Layout (Renderer.ts)
        // GRID_OFFSET_X = 280
        // GRID_WIDTH = 240
        // SELECTION_Y = 20
        // SELECTION_HEIGHT = 80
        // 3 slots
        const GRID_OFFSET_X = 280;
        const GRID_WIDTH = 240;
        const SELECTION_Y = 20;
        const SELECTION_HEIGHT = 80;
        const slotWidth = GRID_WIDTH / 3;

        // Check if click is in selection bar
        if (y >= SELECTION_Y && y <= SELECTION_Y + SELECTION_HEIGHT &&
            x >= GRID_OFFSET_X && x <= GRID_OFFSET_X + GRID_WIDTH) {

            // Determine index
            const index = Math.floor((x - GRID_OFFSET_X) / slotWidth);
            if (index >= 0 && index < 3) {
                this.emit('selectPiece', index);
            }
        }
    }

    private handlePointerMove(x: number, y: number) {
        // Updated hover check
        const GRID_OFFSET_X = 280;
        const GRID_WIDTH = 240;
        const SELECTION_Y = 20;
        const SELECTION_HEIGHT = 80;
        const slotWidth = GRID_WIDTH / 3;

        if (y >= SELECTION_Y && y <= SELECTION_Y + SELECTION_HEIGHT &&
            x >= GRID_OFFSET_X && x <= GRID_OFFSET_X + GRID_WIDTH) {

            const index = Math.floor((x - GRID_OFFSET_X) / slotWidth);
            if (index >= 0 && index < 3) {
                this.emit('hoverPiece', index);
                return;
            }
        }
        this.emit('hoverPiece', -1);
    }
}
