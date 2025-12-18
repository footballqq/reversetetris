
export class UIManager {
    private overlays: Record<string, HTMLElement> = {};
    private app: HTMLElement;
    private aiLogPanel: HTMLElement;
    private aiLogVisible: boolean = false;
    private aiLogTextArea: HTMLTextAreaElement | null = null;

    constructor() {
        this.app = document.getElementById('app')!;
        this.createOverlays();
        this.aiLogPanel = this.createAiLogPanel();
        this.show('menu');
    }

    private createOverlays() {
        // Main Menu
        this.overlays.menu = this.createOverlay('menu-overlay', `
            <h1 class="title">REVERSE TETRIS</h1>
            <div class="menu-buttons">
                <button id="btn-start" class="btn primary">START GAME</button>
                <button id="btn-levels" class="btn">LEVELS</button>
                <button id="btn-howto" class="btn">HOW TO PLAY</button>
                <button id="btn-settings" class="btn">SETTINGS</button>
            </div>
            <p class="footer">Feed the AI until it bursts.</p>
        `);

        // How to Play
        this.overlays.howto = this.createOverlay('howto-overlay', `
            <h2>游戏说明</h2>
            <div class="howto-content">
                <p><strong>目标：</strong>让电脑AI的方块堆积到顶部，使其"顶飞"而输掉游戏。</p>
                <p><strong>玩法：</strong></p>
                <ul>
                    <li>每回合从上方3个候选方块中选择1个</li>
                    <li>点击方块或按数字键 1/2/3 选择</li>
                    <li>电脑AI会自动放置你选的方块</li>
                    <li>选择能让AI难以消行的方块</li>
                    <li>累计消除的行数达标即过关</li>
                </ul>
                <p><strong>技巧：</strong>选择长条(I)会帮AI消行，尽量选择S/Z/T等难放的形状！</p>
            </div>
            <button id="btn-back-howto" class="btn">BACK</button>
        `);

        // Settings
        this.overlays.settings = this.createOverlay('settings-overlay', `
            <h2>设置</h2>
            <div class="settings-content">
                <div class="setting-item">
                    <label>电脑难度</label>
                    <div class="difficulty-btns">
                        <button id="diff-easy" class="btn diff-btn">简单</button>
                        <button id="diff-normal" class="btn diff-btn active">普通</button>
                        <button id="diff-hard" class="btn diff-btn">困难</button>
                        <button id="diff-god" class="btn diff-btn">地狱</button>
                    </div>
                </div>
            </div>
            <button id="btn-back-settings" class="btn">BACK</button>
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

    private createAiLogPanel(): HTMLElement {
        const panel = document.createElement('div');
        panel.id = 'ai-log-panel';
        panel.className = 'ai-log-panel hidden';
        panel.innerHTML = `
            <div class="ai-log-header">
                <div class="ai-log-title">AI LOG</div>
                <div class="ai-log-actions">
                    <button id="ai-log-copy" class="ai-log-btn">COPY</button>
                    <button id="ai-log-close" class="ai-log-btn">CLOSE</button>
                </div>
            </div>
            <textarea id="ai-log-text" class="ai-log-text" readonly></textarea>
            <div class="ai-log-hint">Toggle: S</div>
        `;

        this.app.appendChild(panel);
        this.aiLogTextArea = panel.querySelector('#ai-log-text') as HTMLTextAreaElement | null;

        const copyBtn = panel.querySelector('#ai-log-copy') as HTMLButtonElement | null;
        copyBtn?.addEventListener('click', async () => {
            const text = this.aiLogTextArea?.value ?? '';
            // Per request: select-all first so user can see what's being copied (and can manually copy if clipboard fails).
            if (this.aiLogTextArea) {
                this.aiLogTextArea.focus();
                this.aiLogTextArea.select();
            }
            try {
                await navigator.clipboard.writeText(text);
                copyBtn.textContent = 'COPIED';
                setTimeout(() => (copyBtn.textContent = 'COPY'), 800);
            } catch {
                // Fallback: select text for manual copy
                if (this.aiLogTextArea) {
                    this.aiLogTextArea.focus();
                    this.aiLogTextArea.select();
                }
            }
        });

        const closeBtn = panel.querySelector('#ai-log-close') as HTMLButtonElement | null;
        closeBtn?.addEventListener('click', () => this.setAiLogVisible(false));

        return panel;
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

    public toggleAiLogPanel() {
        this.setAiLogVisible(!this.aiLogVisible);
    }

    public setAiLogVisible(visible: boolean) {
        this.aiLogVisible = visible;
        if (visible) this.aiLogPanel.classList.remove('hidden');
        else this.aiLogPanel.classList.add('hidden');
    }

    public isAiLogVisible(): boolean {
        return this.aiLogVisible;
    }

    public setAiLog(text: string) {
        if (this.aiLogTextArea) {
            this.aiLogTextArea.value = text;
            // Keep scroll at bottom for "move log" feel.
            this.aiLogTextArea.scrollTop = this.aiLogTextArea.scrollHeight;
        }
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
