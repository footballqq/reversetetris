
import './style.css';
import { Renderer } from '@/render/Renderer';
import { GameEngine } from '@/core/GameEngine';
import { InputManager } from '@/ui/InputManager';
import { AudioManager } from '@/audio/AudioManager';
import { UIManager } from '@/ui/UIManager';
import { LevelGenerator } from '@/levels/LevelGenerator';
import { SaveManager } from '@/core/SaveManager';
import { GameState } from '@/core/GameEngine';

const VIEWPORT_WARNING_DISMISS_KEY = 'reversetetris:dismissViewportWarning';

function setupViewportModeWarning() {
  const isTouchDevice = () =>
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    (typeof window !== 'undefined' && 'ontouchstart' in window);

  const safeLocalStorageGet = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const safeLocalStorageSet = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  };

  if (!isTouchDevice() || safeLocalStorageGet(VIEWPORT_WARNING_DISMISS_KEY) === '1') {
    return;
  }

  let banner: HTMLDivElement | null = null;
  let scheduled = false;

  const computeShouldWarn = () => {
    const visualWidth = window.visualViewport?.width ?? window.innerWidth;
    const layoutWidth = window.innerWidth;
    const screenWidth = window.screen?.width ?? visualWidth;

    // Mobile "Request desktop site" often makes layout viewport much wider than visual viewport.
    const viewportRatio = visualWidth > 0 ? layoutWidth / visualWidth : 1;

    // Heuristics: touch device + small screen, but huge layout viewport (or ratio large).
    const smallScreen = Math.min(visualWidth, screenWidth) <= 520;
    const hugeLayoutViewport = layoutWidth >= 900 || viewportRatio >= 1.25;

    return smallScreen && hugeLayoutViewport;
  };

  const ensureBanner = () => {
    if (banner) return banner;

    banner = document.createElement('div');
    banner.className = 'viewport-warning';
    banner.innerHTML = `
      <div class="viewport-warning__content" role="status" aria-live="polite">
        <div class="viewport-warning__text">
          检测到可能启用了「桌面版站点」或非 100% 缩放，布局可能异常。请关闭桌面版站点并把缩放调回 100%。
        </div>
        <div class="viewport-warning__actions">
          <button type="button" class="viewport-warning__btn" data-action="dismiss">关闭</button>
          <button type="button" class="viewport-warning__btn viewport-warning__btn--secondary" data-action="dontshow">不再提示</button>
        </div>
      </div>
    `;

    banner.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest<HTMLButtonElement>('button[data-action]');
      const action = btn?.dataset.action;
      if (!action) return;

      if (action === 'dontshow') {
        safeLocalStorageSet(VIEWPORT_WARNING_DISMISS_KEY, '1');
      }

      hide();
    });

    document.body.appendChild(banner);
    return banner;
  };

  const show = () => {
    const el = ensureBanner();
    el.style.display = 'block';
    document.documentElement.style.setProperty('--viewport-warning-offset', '56px');
  };

  const hide = () => {
    if (banner) banner.style.display = 'none';
    document.documentElement.style.removeProperty('--viewport-warning-offset');
  };

  const update = () => {
    scheduled = false;
    if (computeShouldWarn()) show();
    else hide();
  };

  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('resize', scheduleUpdate);
  window.visualViewport?.addEventListener('resize', scheduleUpdate);
  scheduleUpdate();
}

type GameResult = 'win' | 'lose';
type RunSummary = {
  result: GameResult;
  level: number;
  linesCleared: number;
  targetLines: number;
  piecesPlaced: number;
  difficulty: string;
};

function buildShareText(summary: RunSummary) {
  const url = `${location.origin}${location.pathname}`;
  const normalizedDifficulty =
    summary.difficulty.length > 0 ? summary.difficulty[0].toUpperCase() + summary.difficulty.slice(1) : summary.difficulty;

  const winLine = '直接把电脑**顶飞**！';
  const loseLine = '差点把电脑顶飞…但它苟住了！';

  const text = [
    `🎮🔥 **做了个反向 Tetris 小游戏！** `,
    `玩家负责**选方块**，电脑负责**摆放**，主打一个——折磨电脑 🤖💥`,
    ``,
    `🚀 **Reverse Tetris · 第 ${summary.level} 关**`,
    summary.result === 'win' ? winLine : loseLine,
    `🧱 用块数：**${summary.piecesPlaced}**`,
    `🧠 电脑只消了：**${summary.linesCleared} / ${summary.targetLines} 行**`,
    `⚙️ 难度：**${normalizedDifficulty}**`,
    ``,
    `😤➡️😌 出了口气，整个人都神清气爽了！`,
    ``,
    `👉 **你也来试试暴打它解压吧：**`,
    `🔗 ${url}  `,
    `🔗 复制到浏览器进行游戏`,
    ``,
    `⚠️ 温馨提醒：`,
    ``,
    `* 💀 **千万别手贱挑战「地狱电脑」**`,
    `* 📱 如果画面太小，记得在手机浏览器里**关闭「电脑模式」**`,
    ``,
    `来，看你能把电脑虐到第几关 😈🎉`,
  ].join('\n');

  return { title: 'Reverse Tetris', shareText: text, copyText: text, url };
}

async function shareRunSummary(summary: RunSummary) {
  const payload = buildShareText(summary);

  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      // Avoid passing `url` to prevent some share targets from appending it again.
      await (navigator as unknown as { share: (data: { title: string; text: string }) => Promise<void> }).share({
        title: payload.title,
        text: payload.shareText,
      });
      return;
    } catch {
      // User cancelled or share failed; fall back to copy.
    }
  }

  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard not available');
    await navigator.clipboard.writeText(payload.copyText);
    alert('分享文案已复制，可以粘贴到微信/朋友圈/群聊。');
  } catch {
    // Worst-case fallback.
    prompt('复制分享文案（长按全选复制）', payload.copyText);
  }
}

function isPauseEligibleState(state: GameState) {
  return state === GameState.SELECTING || state === GameState.AI_PLAYING || state === GameState.AI_ANIMATING;
}

// App setup is handled by UIManager for overlays, but we need the canvas container
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <canvas id="game-canvas" width="800" height="600"></canvas>
  <button id="menu-btn" aria-label="Menu">☰</button>
  <button id="audio-btn">🔇</button>
`;

setupViewportModeWarning();

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const engine = new GameEngine(renderer);
engine.appVersion = `v${__APP_VERSION__}+${__GIT_SHA__}`;
const inputManager = new InputManager(canvas, renderer);
const audio = new AudioManager();
const ui = new UIManager();

const menuBtn = document.getElementById('menu-btn')!;
const openPauseMenu = () => {
  if (!isPauseEligibleState(engine.state)) return;
  ui.show('pause');
  audio.playSelect();
};
menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  openPauseMenu();
});

// Audio Init on first interaction
const initAudio = () => {
  audio.init();
  // Start BGM on first interaction if not muted?
  // audio.startBgm(); 
  canvas.removeEventListener('mousedown', initAudio);
  canvas.removeEventListener('touchstart', initAudio);
  window.removeEventListener('keydown', initAudio);
};
canvas.addEventListener('mousedown', initAudio);
canvas.addEventListener('touchstart', initAudio);
window.addEventListener('keydown', initAudio);

// Audio Toggle Button
const audioBtn = document.getElementById('audio-btn')!;
audioBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // Avoid triggering game inputs if overlapping
  audio.init(); // Ensure init
  audio.toggleBgm();

  // Update Icon
  if (audio.isBgmPlaying()) {
    audioBtn.textContent = '🔊';
  } else {
    audioBtn.textContent = '🔇';
  }
});

// --- UI Event Bindings ---

// Difficulty State (EASY, NORMAL, HARD)
let currentDifficulty: 'EASY' | 'NORMAL' | 'HARD' | 'GOD' = 'NORMAL';

ui.on('btn-start', 'click', () => {
  ui.show('game');
  engine.setDifficulty(currentDifficulty);
  engine.start(); // Defaults to Level 1
  audio.playSelect();
});

ui.on('btn-levels', 'click', () => {
  const profile = SaveManager.loadProfile();
  ui.generateLevelGrid(20, profile.highestLevelCompleted, (id) => {
    ui.show('game');
    engine.setDifficulty(currentDifficulty);
    engine.loadLevel(LevelGenerator.generateLevel(id));
    audio.playSelect();
  });
  ui.show('levels');
  audio.playSelect();
});

ui.on('btn-stats', 'click', () => {
  const profile = SaveManager.loadProfile();
  ui.updateStatsContent(profile);
  ui.show('stats');
  audio.playSelect();
});

ui.on('btn-back-stats', 'click', () => {
  ui.show('menu');
  audio.playSelect();
});

ui.on('btn-howto', 'click', () => {
  ui.show('howto');
  audio.playSelect();
});

ui.on('btn-back-howto', 'click', () => {
  ui.show('menu');
  audio.playSelect();
});

ui.on('btn-settings', 'click', () => {
  ui.show('settings');
  audio.playSelect();
});

ui.on('btn-back-settings', 'click', () => {
  ui.show('menu');
  audio.playSelect();
});

// Difficulty buttons
const updateDifficultyUI = () => {
  document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`diff-${currentDifficulty.toLowerCase()}`);
  if (activeBtn) activeBtn.classList.add('active');
};

ui.on('diff-easy', 'click', () => {
  currentDifficulty = 'EASY';
  updateDifficultyUI();
  audio.playSelect();
});

ui.on('diff-normal', 'click', () => {
  currentDifficulty = 'NORMAL';
  updateDifficultyUI();
  audio.playSelect();
});

ui.on('diff-hard', 'click', () => {
  currentDifficulty = 'HARD';
  updateDifficultyUI();
  audio.playSelect();
});

ui.on('diff-god', 'click', () => {
  currentDifficulty = 'GOD';
  updateDifficultyUI();
  audio.playSelect();
});

ui.on('btn-back-levels', 'click', () => {
  ui.show('menu');
  audio.playSelect();
});

// Pause Menu
ui.on('btn-resume', 'click', () => {
  ui.show('game');
  audio.playSelect();
  // engine.resume(); // TODO: Implement resume if we actually pause the engine loop
});

ui.on('btn-restart-pause', 'click', () => {
  ui.show('game');
  engine.start(LevelGenerator.generateLevel(engine.data.level));
  audio.playSelect();
});

ui.on('btn-menu-pause', 'click', () => {
  ui.show('menu');
  audio.playSelect();
});

// Game Over Screens
ui.on('btn-next-level', 'click', () => {
  const current = engine.data.level;
  engine.loadLevel(LevelGenerator.generateLevel(current + 1));
  ui.show('game');
  audio.playSelect();
});

ui.on('btn-menu-win', 'click', () => {
  ui.show('menu');
  audio.playSelect();
});

ui.on('btn-share-win', 'click', async () => {
  audio.playSelect();
  if (lastRunSummary) {
    await shareRunSummary(lastRunSummary);
  }
});

ui.on('btn-retry', 'click', () => {
  engine.loadLevel(LevelGenerator.generateLevel(engine.data.level));
  ui.show('game');
  audio.playSelect();
});

ui.on('btn-share-lose', 'click', async () => {
  audio.playSelect();
  if (lastRunSummary) {
    await shareRunSummary(lastRunSummary);
  }
});

ui.on('btn-menu-lose', 'click', () => {
  ui.show('menu');
  audio.playSelect();
});


// --- Input Manager Bindings ---

inputManager.on('selectPiece', (index: number) => {
  // Only allow input if playing
  // We can check ui state or engine state.
  // Engine state is safer.
  audio.playSelect();
  engine.selectPiece(index);
});

inputManager.on('restart', () => {
  audio.playSelect();
  engine.start(LevelGenerator.generateLevel(engine.data.level));
});

inputManager.on('pause', () => {
  ui.show('pause');
  audio.playSelect();
});

inputManager.on('menu', () => {
  openPauseMenu();
});

inputManager.on('toggleDebug', () => {
  engine.toggleDebugHud();
});

inputManager.on('toggleVersion', () => {
  engine.toggleVersionHud();
});

inputManager.on('toggleAiLog', () => {
  ui.toggleAiLogPanel();
  engine.setDecisionLogVisible(ui.isAiLogVisible());
  if (ui.isAiLogVisible()) {
    ui.setAiLog(engine.getLastDecisionLog());
  }
});


// --- Game Engine Events ---

engine.on('pieceLocked', () => {
  audio.playDrop();
  // Effects
  // We need pixel data from grid coords
  // Grid x -> 50 + x*30
  // engine.activePiecePosition is updated next frame?
  // GameEngine logic: lockPiece happens, then we emit 'pieceLocked'.
  // The piece is ALREADY locked in grid.
  // 'pos' variable in main.ts logic is what?
  // engine.activePiecePosition is for CURRENT piece.
  // We need the position of the piece that JUST locked.
  // GameEngine should probably pass it in event data?
  // Or we recall 'spawnParticles' generally.

  // Let's just create some shake for drop.
  renderer.animator.triggerShake(100);
});

engine.on('linesCleared', (count: number) => {
  audio.playClear();
  ui.updateHUD(engine.data.level, engine.data.linesCleared, engine.data.targetLines);

  // Confetti / Particles
  // Near the grid center (not hard-coded screen coords)
  const cx = renderer.layout.gridX + renderer.layout.gridWidth / 2;
  const cy = renderer.layout.gridY + renderer.layout.gridHeight / 2;
  renderer.animator.spawnParticles(cx, cy, '#ffcc00', 20 * count);
  // Keep it compact; avoid a big "+N LINES" far away on wide screens.
  renderer.animator.spawnText(cx, cy, `+${count}`, '#fff');
  renderer.animator.triggerShake(300);
});

engine.on('levelLoaded', (config: any) => {
  ui.updateHUD(config.id, 0, config.targetLines);
});

let lastRunSummary: RunSummary | null = null;

engine.on('gameOver', (result: 'win' | 'lose') => {
  audio.playGameOver(result === 'win');

  lastRunSummary = {
    result,
    level: engine.data.level,
    linesCleared: engine.data.linesCleared,
    targetLines: engine.data.targetLines,
    piecesPlaced: engine.data.piecesPlaced,
    difficulty: engine.data.aiDifficultyLevel,
  };

  const statsText =
    result === 'win'
      ? `Blocks: ${lastRunSummary.piecesPlaced} • AI Lines: ${lastRunSummary.linesCleared}/${lastRunSummary.targetLines}`
      : `Blocks: ${lastRunSummary.piecesPlaced} • AI Lines: ${lastRunSummary.linesCleared}/${lastRunSummary.targetLines}`;

  const statsEl = document.getElementById(result === 'win' ? 'win-stats' : 'lose-stats');
  if (statsEl) statsEl.textContent = statsText;

  if (result === 'win') {
    ui.show('win');
  } else {
    ui.show('lose');
  }
});

engine.on('aiTrace', (text: string) => {
  if (ui.isAiLogVisible()) ui.setAiLog(text);
});


// --- Game Loop ---

let lastTime = 0;
function gameLoop(timestamp: number) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  // Only update engine if in game state (and not paused)
  // For now, engine.update handles its own internal state checks, 
  // but we might want to pause it explicitly.
  // if (!ui.isPaused) ...
  // Engine.update checks `this.state === GameState.AI_PLAYING`. 
  // If we open pause menu, we should probably set engine state to PAUSED?

  engine.update(dt);
  engine.render();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
