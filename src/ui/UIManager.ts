
export class UIManager {
    private overlays: Record<string, HTMLElement> = {};
    private app: HTMLElement;

    constructor() {
        this.app = document.getElementById('app')!;
        this.createOverlays();
        this.show('menu');
    }

    private createOverlays() {
        // Main Menu
        this.overlays.menu = this.createOverlay('menu-overlay', `
            <h1 class="title">REVERSE TETRIS</h1>
            <div class="menu-buttons">
                <button id="btn-start" class="btn primary">START GAME</button>
                <button id="btn-levels" class="btn">LEVELS</button>
                <button id="btn-settings" class="btn">SETTINGS</button>
            </div>
            <p class="footer">Feed the AI until it bursts.</p>
        `);

        // Level Select (Simple Placeholder)
        this.overlays.levels = this.createOverlay('levels-overlay', `
            <h2>SELECT LEVEL</h2>
            <div class="level-grid" id="level-grid">
                <!-- Generated via JS -->
            </div>
            <button id="btn-back-levels" class="btn back">BACK</button>
        `);

        // Pause Menu
        this.overlays.pause = this.createOverlay('pause-overlay', `
            <h2>PAUSED</h2>
            <button id="btn-resume" class="btn primary">RESUME</button>
            <button id="btn-restart-pause" class="btn">RESTART</button>
            <button id="btn-menu-pause" class="btn">MAIN MENU</button>
        `);

        // Game Over - Win
        this.overlays.win = this.createOverlay('win-overlay', `
            <h1 class="win">VICTORY!</h1>
            <p>The AI Topped Out.</p>
            <button id="btn-next-level" class="btn primary">NEXT LEVEL</button>
            <button id="btn-menu-win" class="btn">MAIN MENU</button>
        `);

        // Game Over - Lose
        this.overlays.lose = this.createOverlay('lose-overlay', `
            <h1 class="lose">DEFEAT</h1>
            <p>The AI Survived your attacks.</p>
            <button id="btn-retry" class="btn primary">RETRY</button>
            <button id="btn-menu-lose" class="btn">MAIN MENU</button>
        `);

        // HUD (Always visible during game, but we toggle visibility)
        // HUD is actually overlays on top of canvas.
        // We'll manage HUD visibility separately or just use 'game' state?
        // Let's create a HUD cleaner in HTML
        const hud = document.createElement('div');
        hud.id = 'hud-overlay';
        hud.className = 'overlay hidden';
        hud.style.pointerEvents = 'none'; // Let clicks pass to canvas
        hud.innerHTML = `
            <div class="hud-top">
                <div class="hud-score">Level: <span id="hud-level">1</span></div>
                <div class="hud-target">Target: <span id="hud-target">0</span>/10 Lines</div>
            </div>
        `;
        this.app.appendChild(hud);
        this.overlays.hud = hud;
    }

    private createOverlay(id: string, content: string): HTMLElement {
        const div = document.createElement('div');
        div.id = id;
        div.className = 'overlay hidden';
        div.innerHTML = content;
        this.app.appendChild(div);
        return div;
    }

    public show(name: string) {
        Object.values(this.overlays).forEach(el => el.classList.add('hidden'));
        if (this.overlays[name]) {
            this.overlays[name].classList.remove('hidden');
        }

        // Special case: HUD shows during game
        if (name === 'game') {
            this.overlays.hud.classList.remove('hidden');
        }
    }

    public hideAll() {
        Object.values(this.overlays).forEach(el => el.classList.add('hidden'));
    }

    // Bindings
    public on(id: string, type: string, callback: () => void) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(type, callback);
        }
    }

    public updateHUD(level: number, cleared: number, target: number) {
        const levelEl = document.getElementById('hud-level');
        const targetEl = document.getElementById('hud-target');
        if (levelEl) levelEl.textContent = level.toString();
        if (targetEl) targetEl.textContent = cleared.toString() + "/" + target.toString();
    }

    public generateLevelGrid(maxLevels: number, onSelect: (id: number) => void) {
        const grid = document.getElementById('level-grid');
        if (!grid) return;
        grid.innerHTML = '';
        for (let i = 1; i <= maxLevels; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.textContent = i.toString();
            btn.onclick = () => onSelect(i);
            grid.appendChild(btn);
        }
    }
}
