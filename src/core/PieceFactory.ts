
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

    private static readonly helpfulSpecialTypes: PieceType[] = [PieceType.LONG_I, PieceType.CROSS];
    private static readonly toxicTypes: PieceType[] = [
        PieceType.SQUARE_HOLLOW,
        PieceType.PENTO_U,
        PieceType.PENTO_W,
        PieceType.PENTO_F,
        PieceType.PENTO_Y,
        PieceType.PENTO_V,
        PieceType.SNAKE_5,
        PieceType.SNAKE_6,
        PieceType.DOORFRAME_7,
    ];

    // Toxic piece pacing (global default; can be overridden per call).
    private static toxicToken: number = 0;
    private static toxicCooldownRemaining: number = 0;

    // 7-bag randomizer
    public static createRandom(options?: { specialChance?: number }): Piece {
        const specialChance = options?.specialChance ?? 0;
        // Chance for helpful special piece (Gold)
        if (Math.random() < specialChance) {
            const randomSpecial = this.helpfulSpecialTypes[Math.floor(Math.random() * this.helpfulSpecialTypes.length)];
            return new Piece(randomSpecial);
        }

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
    public static createRandomSet(
        count: number,
        options?: {
            specialChance?: number;
            toxicRules?: {
                enabled?: boolean;
                everyTurns?: number;
                cooldownTurns?: number;
                maxPerSet?: number;
            };
        }
    ): Piece[] {
        const pieces: Piece[] = [];

        const specialChance = options?.specialChance ?? 0;
        const toxicEnabled = options?.toxicRules?.enabled ?? true;
        const toxicEveryTurns = Math.max(1, Math.floor(options?.toxicRules?.everyTurns ?? 8));
        const toxicCooldownTurns = Math.max(0, Math.floor(options?.toxicRules?.cooldownTurns ?? 6));
        const maxToxicPerSet = Math.max(0, Math.floor(options?.toxicRules?.maxPerSet ?? 1));

        // Advance pacing per "turn" (one candidate set).
        if (toxicEnabled) {
            this.toxicToken = Math.min(1, this.toxicToken + 1 / toxicEveryTurns);
            if (this.toxicCooldownRemaining > 0) this.toxicCooldownRemaining -= 1;
        }

        let toxicIndex = -1;
        if (
            toxicEnabled &&
            maxToxicPerSet > 0 &&
            count > 0 &&
            this.toxicCooldownRemaining === 0 &&
            this.toxicToken >= 1
        ) {
            toxicIndex = Math.floor(Math.random() * count);
            this.toxicToken -= 1;
            this.toxicCooldownRemaining = toxicCooldownTurns;
        }

        for (let i = 0; i < count; i++) {
            if (i === toxicIndex) {
                const t = this.toxicTypes[Math.floor(Math.random() * this.toxicTypes.length)];
                pieces.push(new Piece(t));
            } else {
                pieces.push(this.createRandom({ specialChance }));
            }
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
