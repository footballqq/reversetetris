
import { Piece } from './Piece';
import { PieceType } from './PieceType';

export class PieceFactory {
    private static types = [
        PieceType.I,
        PieceType.O,
        PieceType.T,
        PieceType.S,
        PieceType.Z,
        PieceType.J,
        PieceType.L
    ];

    private static bag: PieceType[] = [];

    // 7-bag randomizer
    public static createRandom(): Piece {
        if (this.bag.length === 0) {
            this.refillBag();
        }
        const type = this.bag.pop()!;
        return new Piece(type);
    }

    // Create a set of random pieces (e.g. for user selection)
    // This might not strictly follow bag if we want pure random valid options,
    // or we can consume from bag.
    // For "User selection", usually we just want n random pieces.
    // We can use the bag to ensure variety over time.
    public static createRandomSet(count: number): Piece[] {
        const pieces: Piece[] = [];
        for (let i = 0; i < count; i++) {
            pieces.push(this.createRandom());
        }
        return pieces;
    }

    private static refillBag(): void {
        this.bag = [...this.types];
        // Fisher-Yates shuffle
        for (let i = this.bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
    }
}
