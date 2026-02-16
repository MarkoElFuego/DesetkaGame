import { COLS, ROWS } from './config';
import { state } from './state';
import { initAudio, sfxClick, sfxBad } from './audio';
import { isValid, processMatch } from './match';
import { dom } from './ui';
import { draw } from './renderer';
import type { GridPos } from './types';

function getPointer(e: MouseEvent | TouchEvent): GridPos {
  const rect = dom.canvas.getBoundingClientRect();
  const cx = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
  const cy = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;
  return {
    x: cx - rect.left,
    y: cy - rect.top,
    row: Math.floor((cy - rect.top) / state.cellSize),
    col: Math.floor((cx - rect.left) / state.cellSize),
  };
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function onStart(e: MouseEvent | TouchEvent): void {
  if (!state.running || state.paused) return;
  if (e.type === 'touchstart') e.preventDefault();
  initAudio();
  state.hintTimer = 0;
  const p = getPointer(e);
  if (inBounds(p.row, p.col)) {
    const cell = state.grid[p.row][p.col];
    if (cell && !cell.frozen) {
      state.isDragging = true;
      state.dragStart = cell;
      state.dragEnd = null;
      state.pointer = { x: p.x, y: p.y };
      sfxClick();
    }
  }
}

function onMove(e: MouseEvent | TouchEvent): void {
  if (!state.running || state.paused) return;
  if (e.type === 'touchmove') e.preventDefault();
  const p = getPointer(e);
  state.pointer = { x: p.x, y: p.y };
  if (state.isDragging && state.dragStart && inBounds(p.row, p.col)) {
    const target = state.grid[p.row][p.col];
    state.dragEnd = (target && target !== state.dragStart && !target.frozen) ? target : null;
  }
}

function onEnd(e: MouseEvent | TouchEvent): void {
  if (!state.isDragging || !state.running || state.paused) return;
  state.isDragging = false;
  const p = getPointer(e);
  if (inBounds(p.row, p.col)) {
    const target = state.grid[p.row][p.col];
    if (target && target !== state.dragStart && !target.frozen) {
      if (isValid(state.dragStart, target)) {
        processMatch(state.dragStart!, target);
      } else {
        sfxBad();
        state.streak = 0;
      }
    }
  }
  state.dragStart = null;
  state.dragEnd = null;
  draw();
}

export function attachInput(): void {
  const cv = dom.canvas;
  cv.addEventListener('mousedown', onStart);
  cv.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
  cv.addEventListener('touchstart', onStart, { passive: false });
  cv.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd, { passive: false });
}
