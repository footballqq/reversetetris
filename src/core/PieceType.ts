
export enum PieceType {
    I = 'I',
    O = 'O',
    T = 'T',
    S = 'S',
    Z = 'Z',
    J = 'J',
    L = 'L',
    // Special (1% chance)
    LONG_I = 'LONG_I',
    CROSS = 'CROSS',
    SQUARE_HOLLOW = 'SQUARE_HOLLOW',

    // Toxic Specials (rare; governed by PieceFactory caps)
    PENTO_U = 'PENTO_U',
    PENTO_W = 'PENTO_W',
    PENTO_F = 'PENTO_F',
    PENTO_Y = 'PENTO_Y',
    PENTO_V = 'PENTO_V',
    SNAKE_5 = 'SNAKE_5',
    SNAKE_6 = 'SNAKE_6',
    DOORFRAME_7 = 'DOORFRAME_7',
}
