
import { PieceType } from './PieceType';

// Relative coordinates [x, y]
// +x: Right, +y: Down
export const PIECE_SHAPES: Record<PieceType, number[][][]> = {
    // I: Cyan
    // . . . .
    // I I I I
    // . . . .
    // Pivot: Second I (index 1) or Third I. Let's pick appropriate integer pivot.
    // Standard SRS I rotates around (0.5, 0.5) effectively.
    // For integer simplified:
    // 0: Horizontal
    // [-1, 0], [0, 0], [1, 0], [2, 0]
    [PieceType.I]: [
        [[-1, 0], [0, 0], [1, 0], [2, 0]], // 0
        [[1, -1], [1, 0], [1, 1], [1, 2]], // 90
        [[-1, 1], [0, 1], [1, 1], [2, 1]], // 180
        [[0, -1], [0, 0], [0, 1], [0, 2]]  // 270
    ],

    // O: Yellow
    // O O
    // O O
    [PieceType.O]: [
        [[0, 0], [1, 0], [0, 1], [1, 1]], // All same
        [[0, 0], [1, 0], [0, 1], [1, 1]],
        [[0, 0], [1, 0], [0, 1], [1, 1]],
        [[0, 0], [1, 0], [0, 1], [1, 1]]
    ],

    // T: Purple
    // . T .
    // T T T
    // Pivot: Center T (0,0)
    [PieceType.T]: [
        [[0, -1], [-1, 0], [0, 0], [1, 0]], // Up
        [[0, -1], [0, 0], [1, 0], [0, 1]], // Right
        [[-1, 0], [0, 0], [1, 0], [0, 1]], // Down
        [[0, -1], [-1, 0], [0, 0], [0, 1]] // Left
    ],

    // S: Green
    // . S S
    // S S .
    [PieceType.S]: [
        [[0, -1], [1, -1], [-1, 0], [0, 0]], // 0
        [[0, -1], [0, 0], [1, 0], [1, 1]], // 90
        [[0, 0], [1, 0], [-1, 1], [0, 1]], // 180
        [[-1, -1], [-1, 0], [0, 0], [0, 1]] // 270
    ],

    // Z: Red
    // Z Z .
    // . Z Z
    [PieceType.Z]: [
        [[-1, -1], [0, -1], [0, 0], [1, 0]], // 0
        [[1, -1], [0, 0], [1, 0], [0, 1]], // 90
        [[-1, 0], [0, 0], [0, 1], [1, 1]], // 180
        [[0, -1], [-1, 0], [0, 0], [-1, 1]] // 270
    ],

    // J: Blue
    // J . .
    // J J J
    [PieceType.J]: [
        [[-1, -1], [-1, 0], [0, 0], [1, 0]], // 0
        [[0, -1], [1, -1], [0, 0], [0, 1]], // 90
        [[-1, 0], [0, 0], [1, 0], [1, 1]], // 180
        [[0, -1], [0, 0], [-1, 1], [0, 1]] // 270
    ],

    // L: Orange
    // . . L
    // L L L
    // L: Orange
    // . . L
    // L L L
    [PieceType.L]: [
        [[1, -1], [-1, 0], [0, 0], [1, 0]], // 0
        [[0, -1], [0, 0], [0, 1], [1, 1]], // 90
        [[-1, 0], [0, 0], [1, 0], [-1, 1]], // 180
        [[-1, -1], [0, -1], [0, 0], [0, 1]] // 270
    ],

    // --- Special Pieces (Gold) ---

    // Long I (6 blocks)
    // . . . . . .
    // X X X X X X
    // Pivot: index 2 or 3. Let's say index 2 (third block).
    // [-2,0], [-1,0], [0,0], [1,0], [2,0], [3,0]
    [PieceType.LONG_I]: [
        [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0]], // Horiz
        [[0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [0, 3]], // Vert
        [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0]], // Horiz
        [[0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [0, 3]]  // Vert
    ],

    // Cross (+)
    // . T .
    // T T T
    // . T .
    [PieceType.CROSS]: [
        [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]], // +
        [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]],
        [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]],
        [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]]
    ],

    // Hollow Square (3x3 ring)
    // X X X
    // X . X
    // X X X
    [PieceType.SQUARE_HOLLOW]: [
        [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]], // 0
        [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
        [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
        [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
    ],

    // --- Toxic Specials (Magenta) ---

    // Pentomino U (5 blocks)
    // X . X
    // X X X
    [PieceType.PENTO_U]: [
        [[-1, -1], [1, -1], [-1, 0], [0, 0], [1, 0]],
        [[0, -1], [0, 0], [0, 1], [1, -1], [1, 1]],
        [[-1, 0], [0, 0], [1, 0], [-1, 1], [1, 1]],
        [[-1, -1], [-1, 1], [0, -1], [0, 0], [0, 1]],
    ],

    // Pentomino W (5 blocks, staircase)
    // X . .
    // X X .
    // . X X
    [PieceType.PENTO_W]: [
        [[-1, -1], [-1, 0], [0, 0], [0, 1], [1, 1]],
        [[1, -1], [0, -1], [0, 0], [-1, 0], [-1, 1]],
        [[1, 1], [1, 0], [0, 0], [0, -1], [-1, -1]],
        [[-1, 1], [0, 1], [0, 0], [1, 0], [1, -1]],
    ],

    // Pentomino V (5 blocks)
    // X . .
    // X . .
    // X X X
    [PieceType.PENTO_V]: [
        [[0, -2], [0, -1], [0, 0], [1, 0], [2, 0]],
        [[2, -2], [1, -2], [0, -2], [0, -1], [0, 0]],
        [[2, 0], [2, -1], [2, -2], [1, -2], [0, -2]],
        [[0, 0], [1, 0], [2, 0], [2, -1], [2, -2]],
    ],

    // Pentomino Y (5 blocks)
    // . X
    // X X
    // . X
    // . X
    [PieceType.PENTO_Y]: [
        [[0, -1], [0, 0], [0, 1], [0, 2], [1, 0]],
        [[-1, 0], [0, 0], [1, 0], [2, 0], [0, -1]],
        [[0, -2], [0, -1], [0, 0], [0, 1], [-1, 0]],
        [[-2, 0], [-1, 0], [0, 0], [1, 0], [0, 1]],
    ],

    // Pentomino F (5 blocks, very awkward)
    // . X X
    // X X .
    // . X .
    [PieceType.PENTO_F]: [
        [[0, -1], [1, -1], [-1, 0], [0, 0], [0, 1]],
        [[1, 0], [1, 1], [0, -1], [0, 0], [-1, 0]],
        [[0, -1], [0, 0], [1, 0], [-1, 1], [0, 1]],
        [[1, 0], [0, 0], [0, 1], [-1, -1], [-1, 0]],
    ],

    // Snake 5 (5 blocks, thin zigzag with tail)
    // . X X
    // X X .
    // . . X
    [PieceType.SNAKE_5]: [
        [[0, -1], [1, -1], [-1, 0], [0, 0], [1, 1]],
        [[1, 0], [1, 1], [0, -1], [0, 0], [-1, -1]],
        [[-1, -1], [0, 0], [1, 0], [-1, 1], [0, 1]],
        [[1, -1], [0, -1], [0, 0], [-1, 0], [-1, 1]],
    ],

    // Snake 6 (6 blocks, bigger zigzag)
    // . X X
    // X X .
    // . X X
    [PieceType.SNAKE_6]: [
        [[0, -1], [1, -1], [-1, 0], [0, 0], [0, 1], [1, 1]],
        [[1, 0], [1, 1], [0, -1], [0, 0], [-1, 0], [-1, 1]],
        [[-1, -1], [0, -1], [0, 0], [1, 0], [-1, 1], [0, 1]],
        [[1, -1], [0, -1], [0, 0], [-1, 0], [1, 0], [0, 1]],
    ],

    // Doorframe 7 (7 blocks, Π-shape)
    // X X X
    // X . X
    // X . X
    [PieceType.DOORFRAME_7]: [
        [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
        [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 1]],
        [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
        [[-1, -1], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
    ],
};

export const PIECE_COLORS: Record<PieceType, string> = {
    [PieceType.I]: '#00f0f0',
    [PieceType.O]: '#f0f000',
    [PieceType.T]: '#a000f0',
    [PieceType.S]: '#00f000',
    [PieceType.Z]: '#f00000',
    [PieceType.J]: '#0000f0',
    [PieceType.L]: '#f0a000',
    // Special
    [PieceType.LONG_I]: '#FFD700', // Gold
    [PieceType.CROSS]: '#FFD700',
    // Hollow square is intentionally toxic (magenta), not "helpful gold".
    [PieceType.SQUARE_HOLLOW]: '#FF3BFF',
    // Toxic
    [PieceType.PENTO_U]: '#FF3BFF',
    [PieceType.PENTO_W]: '#FF3BFF',
    [PieceType.PENTO_F]: '#FF3BFF',
    [PieceType.PENTO_Y]: '#FF3BFF',
    [PieceType.PENTO_V]: '#FF3BFF',
    [PieceType.SNAKE_5]: '#FF3BFF',
    [PieceType.SNAKE_6]: '#FF3BFF',
    [PieceType.DOORFRAME_7]: '#FF3BFF',
};

// Map PieceType to safe integer IDs (start at 1)
export const PIECE_TYPE_TO_ID: Record<PieceType, number> = {
    [PieceType.I]: 1,
    [PieceType.O]: 2,
    [PieceType.T]: 3,
    [PieceType.S]: 4,
    [PieceType.Z]: 5,
    [PieceType.J]: 6,
    [PieceType.L]: 7,
    // Special
    [PieceType.LONG_I]: 8,
    [PieceType.CROSS]: 8, // All Gold map to 8? Or distinct? Distinct for logic?
    // Toxic (shared id for shared color lookup)
    [PieceType.SQUARE_HOLLOW]: 9,
    [PieceType.PENTO_U]: 9,
    [PieceType.PENTO_W]: 9,
    [PieceType.PENTO_F]: 9,
    [PieceType.PENTO_Y]: 9,
    [PieceType.PENTO_V]: 9,
    [PieceType.SNAKE_5]: 9,
    [PieceType.SNAKE_6]: 9,
    [PieceType.DOORFRAME_7]: 9,
};

export const ID_TO_COLOR: Record<number, string> = {
    1: '#00f0f0',
    2: '#f0f000',
    3: '#a000f0',
    4: '#00f000',
    5: '#f00000',
    6: '#0000f0',
    7: '#f0a000',
    8: '#FFD700', // Gold
    9: '#FF3BFF' // Toxic Magenta
};
