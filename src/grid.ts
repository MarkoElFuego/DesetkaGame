import { COLS, ROWS, BASE_INT } from './config';
import { SpecialType } from './types';
import type { Cell } from './types';
import { state } from './state';
import { sfxBomb, sfxSpawn, sfxDanger } from './audio';
import { emit } from './particles';
import { shake, boardBounce, setLastStand } from './ui';
import { findHint } from './match';

let _onGameOver: (() => void) | null = null;

export function setGameOverCallback(cb: () => void): void {
  _onGameOver = cb;
}

export function makeCell(row: number, col: number, sp: SpecialType = SpecialType.NONE): Cell {
  const num = Math.floor(Math.random() * 9) + 1;
  return {
    num,
    row,
    col,
    sp,
    locked: sp === SpecialType.LOCKED,
    bombT: sp === SpecialType.BOMB ? 3 : 0,
    frozen: false,
    id: Math.random(),
  };
}

export function getSpecial(level: number): SpecialType {
  if (level < 3) return SpecialType.NONE;
  const r = Math.random();
  if (level >= 7 && r < 0.04) return SpecialType.ICE;
  if (level >= 5 && r < 0.09) return SpecialType.BOMB;
  if (r < 0.06) return SpecialType.JOKER;
  if (r < 0.14) return SpecialType.LOCKED;
  return SpecialType.NONE;
}

export function gravity(): boolean {
  let moved = false;
  for (let c = 0; c < COLS; c++) {
    const stack: Cell[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (state.grid[r][c]) stack.push(state.grid[r][c]!);
    }
    for (let r = 0; r < ROWS; r++) state.grid[r][c] = null;
    let targetRow = ROWS - 1;
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].row !== targetRow) moved = true;
      stack[i].row = targetRow;
      stack[i].col = c;
      state.grid[targetRow][c] = stack[i];
      targetRow--;
    }
  }
  return moved;
}

export function updateFreeze(): void {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (state.grid[r][c]) state.grid[r][c]!.frozen = false;
    }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = state.grid[r][c];
      if (!cell || cell.sp !== SpecialType.ICE) continue;
      const neighbors: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of neighbors) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          const neighbor = state.grid[nr][nc];
          if (neighbor && neighbor.sp !== SpecialType.ICE) {
            neighbor.frozen = true;
          }
        }
      }
    }
  }
}

export function tickBombs(): boolean {
  let exploded = false;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = state.grid[r][c];
      if (!cell || cell.sp !== SpecialType.BOMB) continue;
      cell.bombT--;
      if (cell.bombT <= 0) {
        sfxBomb();
        shake();
        emit(c * state.cellSize + state.cellSize / 2, r * state.cellSize + state.cellSize / 2, '#ff3b4a', 20);
        state.grid[r][c] = null;
        exploded = true;
      }
    }
  }
  return exploded;
}

export function spawnRow(): void {
  // Check game over
  for (let c = 0; c < COLS; c++) {
    if (state.grid[0][c]) {
      _onGameOver?.();
      return;
    }
  }

  // Shift all rows up
  for (let r = 0; r < ROWS - 1; r++) {
    state.grid[r] = state.grid[r + 1];
    for (let c = 0; c < COLS; c++) {
      if (state.grid[r][c]) state.grid[r][c]!.row = r;
    }
  }

  // New bottom row
  state.grid[ROWS - 1] = [];
  for (let c = 0; c < COLS; c++) {
    state.grid[ROWS - 1][c] = makeCell(ROWS - 1, c, getSpecial(state.level));
  }

  boardBounce();
  sfxSpawn();

  const exp = tickBombs();
  if (exp) {
    setTimeout(() => spawnRow(), 300);
    return;
  }

  gravity();
  updateFreeze();

  // Last stand check
  let topOccupied = false;
  for (let c = 0; c < COLS; c++) {
    if (state.grid[2] && state.grid[2][c]) {
      topOccupied = true;
      break;
    }
  }

  if (topOccupied && !state.lastStand) {
    state.lastStand = true;
    state.spawnInterval = state.spawnInterval * 1.5;
    setLastStand(true);
    sfxDanger();
  } else if (!topOccupied && state.lastStand) {
    state.lastStand = false;
    state.spawnInterval = BASE_INT * Math.pow(0.93, state.level - 1);
    setLastStand(false);
  }

  let dangerCount = 0;
  for (let c = 0; c < COLS; c++) {
    if (state.grid[1] && state.grid[1][c]) dangerCount++;
  }
  if (dangerCount > 2) sfxDanger();

  state.hintTimer = 0;
  state.hintCells = [];
  findHint();
}
