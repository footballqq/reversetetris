
import './style.css';
import { Renderer } from '@/render/Renderer';
import { GameEngine } from '@/core/GameEngine';
import { InputManager } from '@/ui/InputManager';
import { AudioManager } from '@/audio/AudioManager';
import { UIManager } from '@/ui/UIManager';
import { LevelGenerator } from '@/levels/LevelGenerator';
import { SaveManager } from '@/core/SaveManager';

// App setup is handled by UIManager for overlays, but we need the canvas container
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <canvas id="game-canvas" width="800" height="600"></canvas>
  <button id="audio-btn">🔇</button>
`;

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const engine = new GameEngine(renderer);
engine.appVersion = `v${__APP_VERSION__}+${__GIT_SHA__}`;
const inputManager = new InputManager(canvas, renderer);
const audio = new AudioManager();
const ui = new UIManager();

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

ui.on('btn-retry', 'click', () => {
  engine.loadLevel(LevelGenerator.generateLevel(engine.data.level));
  ui.show('game');
  audio.playSelect();
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
  if (engine.state === 0) return; // Already in menu (enum 0 is MENU)
  ui.show('pause'); // Esc triggers pause menu usually, not direct main menu
  audio.playSelect();
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

engine.on('gameOver', (result: 'win' | 'lose') => {
  audio.playGameOver(result === 'win');
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
