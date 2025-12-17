
import { PieceType } from './PieceType';
import { PIECE_SHAPES, PIECE_COLORS } from './PieceData';

export class Piece {
    public readonly type: PieceType;
    private _rotation: number; // 0, 1, 2, 3

    constructor(type: PieceType) {
        this.type = type;
        this._rotation = 0;
    }

    public get rotation(): number {
        return this._rotation;
    }

    public rotateClockwise(): void {
        this._rotation = (this._rotation + 1) % 4;
    }

    public rotateCounterClockwise(): void {
        this._rotation = (this._rotation + 3) % 4;
    }

    public setRotation(rotation: number): void {
        this._rotation = rotation % 4;
    }

    // Get blocks relative coordinates for current or specified rotation
    public getBlocks(rotation?: number): { x: number, y: number }[] {
        const r = rotation !== undefined ? rotation % 4 : this._rotation;
        const shapes = PIECE_SHAPES[this.type];
        const shape = shapes[r];

        return shape.map(([x, y]) => ({ x, y }));
    }

    public getColor(): string {
        return PIECE_COLORS[this.type];
    }

    public clone(): Piece {
        const p = new Piece(this.type);
        p.setRotation(this._rotation);
        return p;
    }
}
