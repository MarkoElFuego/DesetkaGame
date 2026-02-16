import { COLS, ROWS, BASE_INT } from './config';
import { state } from './state';
import { initAudio, sfxOver } from './audio';
import { makeCell, setGameOverCallback } from './grid';
import { spawnRow } from './grid';
import { findHint } from './match';
import { draw } from './renderer';
import { tickParticles } from './particles';
import {
  dom, updateBest,
  showOverlay, showGameOver, showDesekta, setLastStand, clearFloatingText,
  updateTimerBar,
} from './ui';

// Register the callback to break circular dependency
setGameOverCallback(() => endGame());

export function startGame(): void {
  initAudio();

  // Init grid
  state.grid = [];
  for (let r = 0; r < ROWS; r++) {
    state.grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      state.grid[r][c] = r >= ROWS - 3 ? makeCell(r, c) : null;
    }
  }

  state.score = 0;
  state.level = 1;
  state.spawnInterval = BASE_INT;
  state.spawnTimer = 0;
  state.running = true;
  state.paused = false;
  state.combo = 0;
  state.comboTimer = 0;
  state.streak = 0;
  state.desetkaMode = false;
  state.streakTimer = 0;
  state.particles = [];
  state.lastStand = false;
  state.isDragging = false;
  state.dragStart = null;
  state.dragEnd = null;
  state.hintCells = [];
  state.hintTimer = 0;

  dom.score.innerText = '0';
  dom.level.innerText = '1';
  dom.combo.innerText = '—';
  showOverlay('start', false);
  showOverlay('gameover', false);
  showOverlay('pause', false);
  setLastStand(false);
  showDesekta(false);
  clearFloatingText();

  resize();
  findHint();

  state.lastTimestamp = performance.now();
  if (state.raf) cancelAnimationFrame(state.raf);
  loop(performance.now());
}

export function endGame(): void {
  state.running = false;
  sfxOver();
  const isRecord = state.score > state.best;
  if (isRecord) {
    state.best = state.score;
    localStorage.setItem('d3b', state.best.toString());
    updateBest();
  }
  showGameOver(isRecord);
}

export function togglePause(): void {
  if (!state.running) return;
  state.paused = !state.paused;
  showOverlay('pause', state.paused);
  if (!state.paused) {
    state.lastTimestamp = performance.now();
    loop(performance.now());
  }
}

function tickCombo(dt: number): void {
  if (state.combo > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) {
      state.combo = 0;
      state.streak = 0;
      dom.combo.innerText = '—';
    }
  }
}

function tickDesetkaMode(dt: number): void {
  if (!state.desetkaMode) return;
  state.streakTimer -= dt;
  if (state.streakTimer <= 0) {
    state.desetkaMode = false;
    state.streak = 0;
    showDesekta(false);
  }
}

function loop(ts: number): void {
  if (!state.running || state.paused) return;
  const dt = ts - state.lastTimestamp;
  state.lastTimestamp = ts;

  tickCombo(dt);
  tickDesetkaMode(dt);
  tickParticles();

  // Hint timer
  if (state.hintCells.length > 0) state.hintTimer += dt;

  // Spawn timer
  state.spawnTimer += dt;
  const pct = Math.min(state.spawnTimer / state.spawnInterval * 100, 100);
  updateTimerBar(pct, ts);

  if (state.spawnTimer >= state.spawnInterval) {
    spawnRow();
    state.spawnTimer = 0;
  }

  draw();
  state.raf = requestAnimationFrame(loop);
}

export function resize(): void {
  const barHeight = document.getElementById('top-bar')!.offsetHeight;
  const h = window.innerHeight - barHeight - 36;
  const w = window.innerWidth - 14;
  state.cellSize = Math.min(Math.floor(h / ROWS), Math.floor(w / COLS), 58);

  dom.canvas.width = state.cellSize * COLS;
  dom.canvas.height = state.cellSize * ROWS;
  dom.gameBoard.style.width = dom.canvas.width + 'px';
  dom.gameBoard.style.height = dom.canvas.height + 'px';

  draw();
}
