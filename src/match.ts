import { COLS, ROWS, COMBO_WIN, STREAK_GOAL, STREAK_DUR, BASE_INT, NUM_COLORS } from './config';
import type { Cell } from './types';
import { state } from './state';
import { sfxMatch, sfxStreak, sfxLevelUp } from './audio';
import { emit } from './particles';
import { floatingText, shake, updateScore, updateLevel, showDesekta, updateCombo } from './ui';
import { gravity } from './grid';
import { showComboHype, awardComboReward, awardLevelReward, checkAndAutoShuffle } from './powerups';

export function cellColor(cell: Cell): string {
  return NUM_COLORS[cell.num];
}

export function manhattanDist(a: Cell, b: Cell): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

export function isValid(a: Cell | null, b: Cell | null): boolean {
  if (!a || !b || a === b) return false;
  // Sum to 10 = always valid
  if (a.num + b.num === 10) return true;
  // Same number = valid from any distance
  if (a.num === b.num) return true;
  return false;
}

export function findHint(): void {
  state.hintCells = [];
  let bestDist = 999;
  let bestPair: [Cell, Cell] | null = null;

  for (let r1 = 0; r1 < ROWS; r1++) {
    for (let c1 = 0; c1 < COLS; c1++) {
      const a = state.grid[r1][c1];
      if (!a) continue;
      for (let r2 = r1; r2 < ROWS; r2++) {
        const startC = r2 === r1 ? c1 + 1 : 0;
        for (let c2 = startC; c2 < COLS; c2++) {
          const b = state.grid[r2][c2];
          if (!b) continue;
          if (isValid(a, b)) {
            const d = manhattanDist(a, b);
            if (d < bestDist) {
              bestDist = d;
              bestPair = [a, b];
            }
          }
        }
      }
    }
  }

  if (bestPair) state.hintCells = bestPair;
}

function registerCombo(): number {
  state.combo++;
  state.comboTimer = COMBO_WIN;
  updateCombo();
  return state.combo >= 2 ? state.combo : 1;
}

function activateDesetkaMode(): void {
  state.desetkaMode = true;
  state.streakTimer = STREAK_DUR;
  sfxStreak();
  showDesekta(true);
}

export function processMatch(a: Cell, b: Cell): void {
  const dist = manhattanDist(a, b);
  const isSame = a.num === b.num && a.num + b.num !== 10;

  // Remove cells + particles
  const colA = cellColor(a);
  const colB = cellColor(b);
  emit(a.col * state.cellSize + state.cellSize / 2, a.row * state.cellSize + state.cellSize / 2, colA, isSame ? 8 : 16);
  emit(b.col * state.cellSize + state.cellSize / 2, b.row * state.cellSize + state.cellSize / 2, colB, isSame ? 8 : 16);
  state.grid[a.row][a.col] = null;
  state.grid[b.row][b.col] = null;

  // Score: same-number matches now also get distance bonus
  const distBonus = Math.floor(dist * 8);
  const base = (isSame ? 30 : 50) + distBonus;
  const comboMult = registerCombo();
  const desetkaMult = state.desetkaMode ? 2 : 1;
  const pts = Math.round(base * comboMult * desetkaMult);

  sfxMatch(a.num, b.num);
  if (dist >= 8) shake();

  const mx = (a.col + b.col) / 2 * state.cellSize + state.cellSize / 2;
  const my = (a.row + b.row) / 2 * state.cellSize;
  floatingText('+' + pts, mx, my, comboMult > 1);

  state.score += pts;
  updateScore();

  // Combo hype words + rewards
  if (state.combo >= 2) showComboHype(state.combo);
  awardComboReward(state.combo);

  // Streak - all matches count now
  state.streak++;
  if (state.streak >= STREAK_GOAL && !state.desetkaMode) activateDesetkaMode();

  // Level
  const newLevel = Math.floor(state.score / 600) + 1;
  if (newLevel > state.level) {
    state.level = newLevel;
    updateLevel();
    if (!state.lastStand) state.spawnInterval = BASE_INT * Math.pow(0.93, state.level - 1);
    sfxLevelUp();
    awardLevelReward(newLevel);
  }

  gravity();
  state.hintTimer = 0;
  state.hintCells = [];
  setTimeout(() => {
    findHint();
    // Auto-shuffle if stuck
    if (state.hintCells.length === 0) {
      setTimeout(() => checkAndAutoShuffle(), 500);
    }
  }, 200);
}
