
import './style.css';
import { Renderer } from '@/render/Renderer';
import { GameEngine } from '@/core/GameEngine';
import { InputManager } from '@/ui/InputManager';
import { AudioManager } from '@/audio/AudioManager';
import { UIManager } from '@/ui/UIManager';
import { LevelGenerator } from '@/levels/LevelGenerator';

// App setup is handled by UIManager for overlays, but we need the canvas container
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div style="position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
    <canvas id="game-canvas" width="800" height="600" style="background: #000; border: 2px solid #333;"></canvas>
  </div>
`;

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const engine = new GameEngine(renderer);
const inputManager = new InputManager(canvas);
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

ui.on('btn-start', 'click', () => {
  ui.show('game');
  engine.start(); // Defaults to Level 1
  audio.playSelect();
});

ui.on('btn-levels', 'click', () => {
  ui.generateLevelGrid(20, (id) => {
    ui.show('game');
    engine.loadLevel(LevelGenerator.generateLevel(id));
    audio.playSelect();
  });
  ui.show('levels');
  audio.playSelect();
});

ui.on('btn-settings', 'click', () => {
  alert("Settings not implemented yet.");
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
  // Center of screen
  renderer.animator.spawnParticles(400, 300, '#ffcc00', 20 * count);
  renderer.animator.spawnText(400, 300, `+${count} LINES`, '#fff');
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
