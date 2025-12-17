
import { describe, it, expect } from 'vitest';
import { Piece } from './Piece';
import { PieceFactory } from './PieceFactory';
import { PieceType } from './PieceType';

describe('Piece', () => {
    it('should rotate', () => {
        const p = new Piece(PieceType.T);
        expect(p.rotation).toBe(0);
        p.rotateClockwise();
        expect(p.rotation).toBe(1);
        p.rotateClockwise();
        expect(p.rotation).toBe(2);
        p.rotateClockwise();
        expect(p.rotation).toBe(3);
        p.rotateClockwise();
        expect(p.rotation).toBe(0);
    });

    it('should get correct blocks for rotation', () => {
        const p = new Piece(PieceType.T);
        // T shape 0: [[0, -1], [-1, 0], [0, 0], [1, 0]]
        const blocks0 = p.getBlocks(0);
        expect(blocks0).toHaveLength(4);
        expect(blocks0).toContainEqual({ x: 0, y: -1 });
        expect(blocks0).toContainEqual({ x: -1, y: 0 });

        // Rotate to 1 (Right)
        // T shape 1: [[0, -1], [0, 0], [1, 0], [0, 1]]
        const blocks1 = p.getBlocks(1);
        expect(blocks1).toContainEqual({ x: 0, y: -1 });
        expect(blocks1).toContainEqual({ x: 0, y: 1 });
    });

    it('should clone correctly', () => {
        const p = new Piece(PieceType.I);
        p.rotateClockwise();
        const clone = p.clone();
        expect(clone.type).toBe(PieceType.I);
        expect(clone.rotation).toBe(1);

        clone.rotateClockwise();
        expect(clone.rotation).toBe(2);
        expect(p.rotation).toBe(1); // Original should not change
    });
});

describe('PieceFactory', () => {
    it('should create all 7 types in 7 calls', () => {
        const types = new Set<PieceType>();
        for (let i = 0; i < 7; i++) {
            types.add(PieceFactory.createRandom().type);
        }
        expect(types.size).toBe(7);
    });

    it('should create random set', () => {
        const set = PieceFactory.createRandomSet(3);
        expect(set).toHaveLength(3);
        expect(set[0]).toBeInstanceOf(Piece);
    });
});
