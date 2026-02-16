import type { Cell, Grid, Particle, Pointer } from './types';

export const state = {
  grid: [] as Grid,
  score: 0,
  level: 1,
  best: parseInt(localStorage.getItem('d3b') || '0'),
  running: false,
  paused: false,
  spawnInterval: 0,
  spawnTimer: 0,
  lastTimestamp: 0,
  raf: 0,

  // Combo
  combo: 0,
  comboTimer: 0,
  streak: 0,
  streakTimer: 0,
  desetkaMode: false,

  // Drag
  isDragging: false,
  dragStart: null as Cell | null,
  dragEnd: null as Cell | null,
  pointer: { x: 0, y: 0 } as Pointer,

  // Particles
  particles: [] as Particle[],

  // Last stand
  lastStand: false,

  // Hint
  hintCells: [] as Cell[],
  hintTimer: 0,

  // Audio
  soundOn: true,
  audioCtx: null as AudioContext | null,

  // Cell size (calculated on resize)
  cellSize: 0,
};
