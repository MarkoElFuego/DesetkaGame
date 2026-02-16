import { COLS, ROWS, COMBO_WIN, STREAK_GOAL, STREAK_DUR, BASE_INT, NUM_COLORS } from './config';
import { SpecialType } from './types';
import type { Cell } from './types';
import { state } from './state';
import { sfxMatch, sfxClick, sfxJoker, sfxBomb, sfxStreak, sfxLevelUp } from './audio';
import { emit } from './particles';
import { floatingText, shake, updateScore, updateLevel, showDesekta, updateCombo } from './ui';
import { gravity, updateFreeze } from './grid';

export function cellColor(cell: Cell): string {
  return cell.sp === SpecialType.JOKER ? '#ffffff' : NUM_COLORS[cell.num];
}

export function manhattanDist(a: Cell, b: Cell): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

export function isValid(a: Cell | null, b: Cell | null): boolean {
  if (!a || !b || a === b) return false;
  if (a.frozen || b.frozen) return false;
  if (a.sp === SpecialType.JOKER || b.sp === SpecialType.JOKER) return true;
  if (a.num + b.num === 10) return true;
  if (a.num === b.num && manhattanDist(a, b) <= 2) return true;
  return false;
}

export function findHint(): void {
  state.hintCells = [];
  let bestDist = 999;
  let bestPair: [Cell, Cell] | null = null;

  for (let r1 = 0; r1 < ROWS; r1++) {
    for (let c1 = 0; c1 < COLS; c1++) {
      const a = state.grid[r1][c1];
      if (!a || a.frozen) continue;
      for (let r2 = r1; r2 < ROWS; r2++) {
        const startC = r2 === r1 ? c1 + 1 : 0;
        for (let c2 = startC; c2 < COLS; c2++) {
          const b = state.grid[r2][c2];
          if (!b || b.frozen) continue;
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
  const isSame = a.num === b.num
    && a.sp !== SpecialType.JOKER
    && b.sp !== SpecialType.JOKER
    && a.num + b.num !== 10;

  // Locked: first hit unlocks
  if (a.locked) {
    a.locked = false;
    a.sp = SpecialType.NONE;
    floatingText('🔓', a.col * state.cellSize + state.cellSize / 2, a.row * state.cellSize, false);
    sfxClick();
    state.hintTimer = 0;
    findHint();
    return;
  }
  if (b.locked) {
    b.locked = false;
    b.sp = SpecialType.NONE;
    floatingText('🔓', b.col * state.cellSize + state.cellSize / 2, b.row * state.cellSize, false);
    sfxClick();
    state.hintTimer = 0;
    findHint();
    return;
  }

  // Bomb defuse: clear entire row
  let bombBonus = 0;
  if (a.sp === SpecialType.BOMB) {
    for (let c = 0; c < COLS; c++) {
      const x = state.grid[a.row][c];
      if (x && x !== b) {
        emit(c * state.cellSize + state.cellSize / 2, a.row * state.cellSize + state.cellSize / 2, '#ff3b4a', 5);
        state.grid[a.row][c] = null;
        bombBonus += 20;
      }
    }
    sfxBomb();
  }
  if (b.sp === SpecialType.BOMB) {
    for (let c = 0; c < COLS; c++) {
      const x = state.grid[b.row][c];
      if (x && x !== a) {
        emit(c * state.cellSize + state.cellSize / 2, b.row * state.cellSize + state.cellSize / 2, '#ff3b4a', 5);
        state.grid[b.row][c] = null;
        bombBonus += 20;
      }
    }
    sfxBomb();
  }

  if (a.sp === SpecialType.JOKER || b.sp === SpecialType.JOKER) sfxJoker();

  // Remove cells + particles
  const colA = cellColor(a);
  const colB = cellColor(b);
  emit(a.col * state.cellSize + state.cellSize / 2, a.row * state.cellSize + state.cellSize / 2, colA, isSame ? 5 : 10);
  emit(b.col * state.cellSize + state.cellSize / 2, b.row * state.cellSize + state.cellSize / 2, colB, isSame ? 5 : 10);
  state.grid[a.row][a.col] = null;
  state.grid[b.row][b.col] = null;

  // Score
  const distBonus = isSame ? 0 : Math.floor(dist * 8);
  const base = (isSame ? 15 : 50) + distBonus + bombBonus;
  let comboMult = 1;
  const desetkaMult = state.desetkaMode ? 2 : 1;
  if (!isSame) comboMult = registerCombo();
  const pts = Math.round(base * comboMult * desetkaMult);

  sfxMatch(
    a.sp === SpecialType.JOKER ? 5 : a.num,
    b.sp === SpecialType.JOKER ? 5 : b.num,
  );
  if (dist >= 8) shake();

  const mx = (a.col + b.col) / 2 * state.cellSize + state.cellSize / 2;
  const my = (a.row + b.row) / 2 * state.cellSize;
  floatingText('+' + pts, mx, my, !isSame && comboMult > 1);

  state.score += pts;
  updateScore();

  // Streak
  if (!isSame) {
    state.streak++;
    if (state.streak >= STREAK_GOAL && !state.desetkaMode) activateDesetkaMode();
  }

  // Level
  const newLevel = Math.floor(state.score / 600) + 1;
  if (newLevel > state.level) {
    state.level = newLevel;
    updateLevel();
    if (!state.lastStand) state.spawnInterval = BASE_INT * Math.pow(0.93, state.level - 1);
    sfxLevelUp();
  }

  gravity();
  updateFreeze();
  state.hintTimer = 0;
  state.hintCells = [];
  setTimeout(() => findHint(), 200);
}
