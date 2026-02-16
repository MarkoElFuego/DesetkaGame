import { COLS, ROWS } from './config';
import { state } from './state';
import { emit } from './particles';
import { gravity } from './grid';
import { findHint } from './match';
import { cellColor } from './match';
import { sfxLevelUp, sfxStreak } from './audio';
import { shake, floatingText } from './ui';

// ── Update power-up UI ──
export function updatePowerUpUI(): void {
  const shuffleBtn = document.getElementById('btn-shuffle') as HTMLButtonElement;
  const infernoBtn = document.getElementById('btn-inferno') as HTMLButtonElement;
  const freezeBtn = document.getElementById('btn-freeze') as HTMLButtonElement;

  shuffleBtn.disabled = state.shuffleCount <= 0;
  infernoBtn.disabled = state.infernoCount <= 0;
  freezeBtn.disabled = state.freezeCount <= 0;

  document.getElementById('pc-shuffle')!.innerText = String(state.shuffleCount);
  document.getElementById('pc-inferno')!.innerText = String(state.infernoCount);
  document.getElementById('pc-freeze')!.innerText = String(state.freezeCount);
}

// ── SHUFFLE: Randomize all numbers on the board ──
export function useShuffle(): void {
  if (state.shuffleCount <= 0 || !state.running || state.paused) return;
  state.shuffleCount--;

  sfxStreak();

  // Collect all cells and shuffle their numbers
  const cells: { r: number; c: number }[] = [];
  const nums: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (state.grid[r][c]) {
        cells.push({ r, c });
        nums.push(state.grid[r][c]!.num);
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }

  // Reassign + particles
  for (let i = 0; i < cells.length; i++) {
    const { r, c } = cells[i];
    const cell = state.grid[r][c]!;
    emit(c * state.cellSize + state.cellSize / 2, r * state.cellSize + state.cellSize / 2, cellColor(cell), 4);
    cell.num = nums[i];
  }

  state.hintTimer = 0;
  state.hintCells = [];
  findHint();
  updatePowerUpUI();
}

// ── INFERNO: Clear the bottom row ──
export function useInferno(): void {
  if (state.infernoCount <= 0 || !state.running || state.paused) return;
  state.infernoCount--;

  sfxLevelUp();
  shake();

  // Find the bottom-most occupied row
  let targetRow = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    for (let c = 0; c < COLS; c++) {
      if (state.grid[r][c]) {
        targetRow = r;
        break;
      }
    }
    if (targetRow >= 0) break;
  }

  if (targetRow >= 0) {
    let pts = 0;
    for (let c = 0; c < COLS; c++) {
      const cell = state.grid[targetRow][c];
      if (cell) {
        emit(c * state.cellSize + state.cellSize / 2, targetRow * state.cellSize + state.cellSize / 2, cellColor(cell), 8);
        state.grid[targetRow][c] = null;
        pts += 10;
      }
    }

    // Flash effect
    const flash = document.createElement('div');
    flash.className = 'flash';
    flash.style.background = 'rgba(255, 100, 50, 0.3)';
    document.getElementById('gb')!.appendChild(flash);
    setTimeout(() => flash.remove(), 300);

    floatingText('🔥 INFERNO +' + pts, COLS / 2 * state.cellSize, targetRow * state.cellSize, true);
    state.score += pts;

    gravity();
    state.hintTimer = 0;
    state.hintCells = [];
    findHint();
  }

  updatePowerUpUI();
}

// ── FREEZE: Pause spawn timer for 15 seconds ──
export function useFreeze(): void {
  if (state.freezeCount <= 0 || !state.running || state.paused || state.freezeActive) return;
  state.freezeCount--;
  state.freezeActive = true;
  state.freezeTimer = 15000;

  sfxStreak();

  // Flash effect
  const flash = document.createElement('div');
  flash.className = 'flash';
  flash.style.background = 'rgba(64, 224, 208, 0.3)';
  document.getElementById('gb')!.appendChild(flash);
  setTimeout(() => flash.remove(), 300);

  updatePowerUpUI();
}

// ── Auto-shuffle when no valid moves exist ──
export function checkAndAutoShuffle(): boolean {
  // Check if any valid move exists
  for (let r1 = 0; r1 < ROWS; r1++) {
    for (let c1 = 0; c1 < COLS; c1++) {
      const a = state.grid[r1][c1];
      if (!a) continue;
      for (let r2 = r1; r2 < ROWS; r2++) {
        const startC = r2 === r1 ? c1 + 1 : 0;
        for (let c2 = startC; c2 < COLS; c2++) {
          const b = state.grid[r2][c2];
          if (!b) continue;
          if (a.num + b.num === 10 || a.num === b.num) return false; // valid move exists
        }
      }
    }
  }

  // No valid moves! Auto-shuffle
  const cells: { r: number; c: number }[] = [];
  const nums: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (state.grid[r][c]) {
        cells.push({ r, c });
        nums.push(state.grid[r][c]!.num);
      }
    }
  }

  if (cells.length < 2) return false;

  // Ensure at least one valid pair after shuffle
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }

  // Force a valid pair
  if (nums.length >= 2) {
    const base = Math.floor(Math.random() * 4) + 1;
    nums[0] = base;
    nums[1] = 10 - base;
  }

  for (let i = 0; i < cells.length; i++) {
    const { r, c } = cells[i];
    const cell = state.grid[r][c]!;
    emit(c * state.cellSize + state.cellSize / 2, r * state.cellSize + state.cellSize / 2, '#40e0d0', 3);
    cell.num = nums[i];
  }

  // Show hype text
  showHype('SHUFFLE!', '#40e0d0');
  sfxStreak();

  state.hintTimer = 0;
  state.hintCells = [];
  setTimeout(() => findHint(), 300);
  return true;
}

// ── Give power-up on combo milestones ──
export function awardComboReward(combo: number): void {
  if (combo === 3) {
    state.shuffleCount++;
    showHype('🔀 +SHUFFLE', '#40e0d0');
  } else if (combo === 5) {
    state.infernoCount++;
    showHype('🔥 +INFERNO', '#ff6b35');
  } else if (combo === 8) {
    state.freezeCount++;
    showHype('⏳ +FREEZE', '#64b5f6');
  } else if (combo === 10) {
    state.shuffleCount++;
    state.infernoCount++;
    showHype('💥 JACKPOT!', '#f0c040');
  }
  updatePowerUpUI();
}

// ── Level-up reward ──
export function awardLevelReward(level: number): void {
  if (level % 2 === 0) {
    state.shuffleCount++;
  }
  if (level % 3 === 0) {
    state.infernoCount++;
  }
  if (level % 5 === 0) {
    state.freezeCount++;
  }
  updatePowerUpUI();
}

// ── Hype Words ──
const COMBO_HYPES = [
  { min: 2, text: 'NICE!', color: '#3bff6f' },
  { min: 3, text: 'BRAVO!', color: '#40e0d0' },
  { min: 4, text: 'SUPER!', color: '#4a8af0' },
  { min: 5, text: 'ODLIČNO!', color: '#a855e0' },
  { min: 7, text: 'BRUTAL!', color: '#ff3b4a' },
  { min: 10, text: 'LEGENDА!', color: '#f0c040' },
  { min: 15, text: 'BOGOVSKI!', color: '#fff' },
];

export function showComboHype(combo: number): void {
  const now = Date.now();
  if (now - state.lastComboHype < 800) return; // don't spam

  let hype = null;
  for (let i = COMBO_HYPES.length - 1; i >= 0; i--) {
    if (combo >= COMBO_HYPES[i].min) {
      hype = COMBO_HYPES[i];
      break;
    }
  }

  if (hype) {
    state.lastComboHype = now;
    showHype(hype.text, hype.color);

    // Screen flash on big combos
    if (combo >= 5) {
      const flash = document.createElement('div');
      flash.className = 'flash';
      flash.style.background = hype.color.replace(')', ',0.15)').replace('#', 'rgba(');
      // Convert hex to rgba for flash
      const hex = hype.color;
      if (hex.startsWith('#')) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        flash.style.background = `rgba(${r},${g},${b},0.2)`;
      }
      document.getElementById('gb')!.appendChild(flash);
      setTimeout(() => flash.remove(), 300);
    }

    // Extra explosion particles on big combos
    if (combo >= 4) {
      const cx = (COLS / 2) * state.cellSize;
      const cy = (ROWS / 2) * state.cellSize;
      emit(cx, cy, hype.color, combo * 3);
    }
  }
}

function showHype(text: string, color: string): void {
  const el = document.getElementById('hype')!;
  el.innerText = text;
  el.style.color = color;
  el.style.textShadow = `0 0 30px ${color}, 0 0 60px ${color}`;
  el.className = '';
  // Force reflow
  void el.offsetWidth;
  el.className = 'hype-show';
}
