export interface Cell {
  num: number;
  row: number;
  col: number;
  id: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  dec: number;
  sz: number;
  col: string;
}

export interface Pointer {
  x: number;
  y: number;
}

export interface GridPos {
  x: number;
  y: number;
  row: number;
  col: number;
}

export type Grid = (Cell | null)[][];
