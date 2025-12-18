
import { Renderer } from '@/render/Renderer';

type InputCallback = (data?: any) => void;

export class InputManager {
    private canvas: HTMLCanvasElement;
    private renderer: Renderer;
    private listeners: Record<string, InputCallback[]> = {};

    constructor(canvas: HTMLCanvasElement, renderer: Renderer) {
        this.canvas = canvas;
        this.renderer = renderer;
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
                case 'd':
                case 'D':
                    this.emit('toggleDebug');
                    break;
                case 'v':
                case 'V':
                    this.emit('toggleVersion');
                    break;
            }
        });
    }

    private getScaledCoordinates(clientX: number, clientY: number): { x: number, y: number } {
        const rect = this.canvas.getBoundingClientRect();
        // Canvas logical size matches CSS size (window size)
        // So just offset
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
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
        const layout = this.renderer.layout;

        // Debug log
        console.log('Click:', { x, y });
        console.log('Layout:', {
            selectionX: layout.selectionX,
            selectionY: layout.selectionY,
            selectionHeight: layout.selectionHeight,
            gridWidth: layout.gridWidth,
            slotWidth: layout.slotWidth
        });

        // Check Selection Area
        if (y >= layout.selectionY && y <= layout.selectionY + layout.selectionHeight &&
            x >= layout.selectionX && x <= layout.selectionX + layout.gridWidth) {

            // Determine index
            const index = Math.floor((x - layout.selectionX) / layout.slotWidth);
            console.log('Hit selection! Index:', index);
            if (index >= 0 && index < 3) {
                this.emit('selectPiece', index);
            }
        }
    }

    private handlePointerMove(x: number, y: number) {
        const layout = this.renderer.layout;

        if (y >= layout.selectionY && y <= layout.selectionY + layout.selectionHeight &&
            x >= layout.selectionX && x <= layout.selectionX + layout.gridWidth) {

            const index = Math.floor((x - layout.selectionX) / layout.slotWidth);
            if (index >= 0 && index < 3) {
                this.emit('hoverPiece', index);
                return;
            }
        }
        this.emit('hoverPiece', -1);
    }
}
