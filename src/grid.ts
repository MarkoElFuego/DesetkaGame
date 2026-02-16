import { COLS, ROWS, BASE_INT } from './config';
import { SpecialType } from './types';
import type { Cell } from './types';
import { state } from './state';
import { sfxSpawn, sfxDanger } from './audio';
import { boardBounce, setLastStand } from './ui';
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
    bombT: 0,
    frozen: false,
    id: Math.random(),
  };
}

export function getSpecial(level: number): SpecialType {
  if (level < 3) return SpecialType.NONE;
  const r = Math.random();
  if (r < 0.06) return SpecialType.JOKER;
  if (r < 0.14) return SpecialType.LOCKED;
  return SpecialType.NONE;
}

/** Ensure new row always has at least one valid pair (sum=10) with existing grid */
export function makeSmartRow(row: number): Cell[] {
  const cells: Cell[] = [];
  for (let c = 0; c < COLS; c++) {
    cells.push(makeCell(row, c, getSpecial(state.level)));
  }

  // Check if any valid pair exists on the whole board (including new row)
  // If not, force a guaranteed pair into the new row
  const allCells: Cell[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (state.grid[r] && state.grid[r][c]) allCells.push(state.grid[r][c]!);
    }
  }

  // Check if new row has at least one match with existing cells
  let hasMatch = false;
  for (const newCell of cells) {
    if (newCell.sp === SpecialType.JOKER) { hasMatch = true; break; }
    for (const existing of allCells) {
      if (existing.sp === SpecialType.JOKER) { hasMatch = true; break; }
      if (newCell.num + existing.num === 10) { hasMatch = true; break; }
    }
    if (hasMatch) break;
  }

  // Also check within the new row itself
  if (!hasMatch) {
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        if (cells[i].num + cells[j].num === 10) { hasMatch = true; break; }
      }
      if (hasMatch) break;
    }
  }

  // If no match, force a complementary pair in the new row
  if (!hasMatch && cells.length >= 2) {
    const base = Math.floor(Math.random() * 4) + 1; // 1-4
    const idx1 = Math.floor(Math.random() * COLS);
    let idx2 = (idx1 + 1 + Math.floor(Math.random() * (COLS - 1))) % COLS;
    cells[idx1].num = base;
    cells[idx2].num = 10 - base;
  }

  return cells;
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

  // New bottom row - smart generation
  const newCells = makeSmartRow(ROWS - 1);
  state.grid[ROWS - 1] = [];
  for (let c = 0; c < COLS; c++) {
    state.grid[ROWS - 1][c] = newCells[c];
  }

  boardBounce();
  sfxSpawn();

  gravity();

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
