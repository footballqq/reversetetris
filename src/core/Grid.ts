
export class Grid {
    public static readonly WIDTH = 10;
    public static readonly HEIGHT = 20; // Visible height
    // Total height can be higher if we want hidden rows, but for simplicity let's start with standard 20
    // or maybe 22 if we want to simulate spawn area. 
    // Let's stick to standard 10x20 for the core logic, but maybe allow checks outside bounds relative to "board".
    // Actually, standard Tetris usually has 20 visible rows.
    // Let's use 20 rows for storage for now, unless we need more.
    // Detailed requirement says "HIDDEN_ROWS = 2". So let's make total rows 22.
    public static readonly TOTAL_ROWS = 22;
    public static readonly VISIBLE_ROWS = 20;

    private _grid: number[][];
    private _ceilingRows: number = 0; // Number of blocked rows starting from the top of the visible area

    // Rows 0-1 are hidden buffer for spawn; visible area starts at row 2.
    public static readonly VISIBLE_START_ROW = 2;

    constructor(presetGrid?: number[][]) {
        if (presetGrid) {
            this._grid = presetGrid.map(row => [...row]);
        } else {
            this._grid = Array.from({ length: Grid.TOTAL_ROWS }, () => Array(Grid.WIDTH).fill(0));
        }
    }

    // Get raw grid data
    public get data(): number[][] {
        return this._grid;
    }

    public get ceilingRows(): number {
        return this._ceilingRows;
    }

    public getSpawnY(): number {
        return Grid.VISIBLE_START_ROW + this._ceilingRows;
    }

    public lowerCeiling(rows: number = 1) {
        const next = Math.min(Grid.VISIBLE_ROWS, Math.max(0, this._ceilingRows + rows));
        this._ceilingRows = next;
    }

    private isCeilingRow(y: number): boolean {
        // Ceiling blocks the top N visible rows: [VISIBLE_START_ROW, VISIBLE_START_ROW + N - 1]
        return y >= Grid.VISIBLE_START_ROW && y < Grid.VISIBLE_START_ROW + this._ceilingRows;
    }

    // Check if cell is empty
    // y is index from top (0) to bottom (TOTAL_ROWS - 1)
    public isCellEmpty(x: number, y: number): boolean {
        if (x < 0 || x >= Grid.WIDTH || y >= Grid.TOTAL_ROWS) return false; // Out of bounds is not "empty" (it's a wall or floor)
        if (y < 0) return true; // Above board is empty
        if (this.isCeilingRow(y)) return false;
        return this._grid[y][x] === 0;
    }

    // Check if a piece can be placed at (x, y) with specific rotation
    // pieceBlocks: relative coordinates of blocks [[x,y], [x,y]...]
    public isValidPosition(pieceBlocks: { x: number, y: number }[], offsetX: number, offsetY: number): boolean {
        for (const block of pieceBlocks) {
            const targetX = offsetX + block.x;
            const targetY = offsetY + block.y;

            // Check bounds
            if (targetX < 0 || targetX >= Grid.WIDTH || targetY >= Grid.TOTAL_ROWS) {
                return false;
            }
            if (targetY >= 0 && this.isCeilingRow(targetY)) {
                return false;
            }

            // Check collision with existing blocks
            // We allow placing above the grid (y < 0) as long as it handles valid spawn
            // But typically we check grid collision.
            if (targetY >= 0 && this._grid[targetY][targetX] !== 0) {
                return false;
            }
        }
        return true;
    }

    // Lock piece into grid
    public lockPiece(pieceBlocks: { x: number, y: number }[], offsetX: number, offsetY: number, typeId: number): void {
        for (const block of pieceBlocks) {
            const targetX = offsetX + block.x;
            const targetY = offsetY + block.y;

            if (targetX >= 0 && targetX < Grid.WIDTH && targetY >= 0 && targetY < Grid.TOTAL_ROWS) {
                if (this.isCeilingRow(targetY)) continue;
                this._grid[targetY][targetX] = typeId;
            }
        }
    }

    // Clear full lines
    // Returns number of lines cleared
    public clearLines(): number {
        let linesCleared = 0;

        // Iterate from bottom to top
        for (let y = Grid.TOTAL_ROWS - 1; y >= 0; y--) {
            if (this.isRowFull(y)) {
                this.removeRow(y);
                linesCleared++;
                y++; // Re-check the same row index because rows shifted down
            }
        }

        return linesCleared;
    }

    private isRowFull(y: number): boolean {
        return this._grid[y].every(cell => cell !== 0);
    }

    private removeRow(yToRemove: number): void {
        // Remove row
        this._grid.splice(yToRemove, 1);
        // Add new empty row at top
        this._grid.unshift(Array(Grid.WIDTH).fill(0));
    }

    public isGameOver(): boolean {
        // gemini: 2025-12-18 Adjusted Top-Out check to respect the descending ceiling.
        // A game over occurs if any locked block is AT or ABOVE the current ceiling boundary.
        // The spawn point is also shifted down with the ceiling.
        const topBoundary = this.getSpawnY();
        for (let y = 0; y < topBoundary; y++) {
            if (this._grid[y].some(cell => cell !== 0)) return true;
        }
        return false;
    }

    // AI Helper: Get column height (distance from bottom to highest block) -> Actually distance from top
    // Actually usually "Height" means number of filled cells from bottom.
    public getHeight(): number {
        // Find highest non-empty y
        for (let y = 0; y < Grid.TOTAL_ROWS; y++) {
            if (this._grid[y].some(cell => cell !== 0)) {
                return Grid.TOTAL_ROWS - y;
            }
        }
        return 0;
    }

    // AI Helper: Count holes (empty cells with at least one filled cell above them)
    public countHoles(): number {
        let holes = 0;
        for (let x = 0; x < Grid.WIDTH; x++) {
            let blockFound = false;
            for (let y = 0; y < Grid.TOTAL_ROWS; y++) {
                if (this._grid[y][x] !== 0) {
                    blockFound = true;
                } else if (blockFound && this._grid[y][x] === 0) {
                    holes++;
                }
            }
        }
        return holes;
    }

    // AI Helper: Blockades are blocks that sit above at least one empty cell beneath them in the same column.
    // They make holes harder to fix because pieces must fill around/under them.
    public countBlockades(): number {
        let blockades = 0;
        for (let x = 0; x < Grid.WIDTH; x++) {
            let emptyBelow = false;
            for (let y = Grid.TOTAL_ROWS - 1; y >= 0; y--) {
                if (this._grid[y][x] === 0) {
                    emptyBelow = true;
                } else if (emptyBelow) {
                    blockades++;
                }
            }
        }
        return blockades;
    }

    // AI Helper: "Well" sums (cells that are empty but have filled neighbors on both sides, or a wall on one side).
    // This captures valleys/shafts that are open to the top but enclosed laterally (what you described as "两面都是实体，中间空").
    // Standard well-sum uses triangular numbers (depth 1 contributes 1, depth 2 contributes 1+2, ...).
    public getWellSums(): number {
        let sum = 0;

        for (let x = 0; x < Grid.WIDTH; x++) {
            let currentWellDepth = 0;

            for (let y = 0; y < Grid.TOTAL_ROWS; y++) {
                if (this._grid[y][x] !== 0) {
                    currentWellDepth = 0;
                    continue;
                }

                const leftFilled = x === 0 ? true : this._grid[y][x - 1] !== 0;
                const rightFilled = x === Grid.WIDTH - 1 ? true : this._grid[y][x + 1] !== 0;

                if (leftFilled && rightFilled) {
                    currentWellDepth += 1;
                    sum += currentWellDepth;
                } else {
                    currentWellDepth = 0;
                }
            }
        }

        return sum;
    }

    // AI Helper: Aggregate Height (sum of all column heights)
    public getAggregateHeight(): number {
        let total = 0;
        for (let x = 0; x < Grid.WIDTH; x++) {
            for (let y = 0; y < Grid.TOTAL_ROWS; y++) {
                if (this._grid[y][x] !== 0) {
                    total += (Grid.TOTAL_ROWS - y);
                    break;
                }
            }
        }
        return total;
    }

    // AI Helper: Bumpiness (sum of absolute differences between adjacent column heights)
    public getBumpiness(): number {
        let bumpiness = 0;
        let prevHeight = this.getColumnHeight(0);

        for (let x = 1; x < Grid.WIDTH; x++) {
            const height = this.getColumnHeight(x);
            bumpiness += Math.abs(prevHeight - height);
            prevHeight = height;
        }

        return bumpiness;
    }

    public getColumnHeight(x: number): number {
        for (let y = 0; y < Grid.TOTAL_ROWS; y++) {
            if (this._grid[y][x] !== 0) {
                return Grid.TOTAL_ROWS - y;
            }
        }
        return 0;
    }

    public clone(): Grid {
        const newGrid = new Grid();
        newGrid._grid = this._grid.map(row => [...row]);
        newGrid._ceilingRows = this._ceilingRows;
        return newGrid;
    }
}
