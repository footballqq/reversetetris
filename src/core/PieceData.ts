
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
    [PieceType.L]: [
        [[1, -1], [-1, 0], [0, 0], [1, 0]], // 0
        [[0, -1], [0, 0], [0, 1], [1, 1]], // 90
        [[-1, 0], [0, 0], [1, 0], [-1, 1]], // 180
        [[-1, -1], [0, -1], [0, 0], [0, 1]] // 270
    ]
};

export const PIECE_COLORS: Record<PieceType, string> = {
    [PieceType.I]: '#00f0f0',
    [PieceType.O]: '#f0f000',
    [PieceType.T]: '#a000f0',
    [PieceType.S]: '#00f000',
    [PieceType.Z]: '#f00000',
    [PieceType.J]: '#0000f0',
    [PieceType.L]: '#f0a000'
};

// Map PieceType to safe integer IDs (start at 1)
export const PIECE_TYPE_TO_ID: Record<PieceType, number> = {
    [PieceType.I]: 1,
    [PieceType.O]: 2,
    [PieceType.T]: 3,
    [PieceType.S]: 4,
    [PieceType.Z]: 5,
    [PieceType.J]: 6,
    [PieceType.L]: 7
};

export const ID_TO_COLOR: Record<number, string> = {
    1: '#00f0f0',
    2: '#f0f000',
    3: '#a000f0',
    4: '#00f000',
    5: '#f00000',
    6: '#0000f0',
    7: '#f0a000'
};
