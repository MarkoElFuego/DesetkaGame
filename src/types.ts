export const enum SpecialType {
  NONE = 0,
  LOCKED = 1,
  BOMB = 2,
  JOKER = 3,
  ICE = 4,
}

export interface Cell {
  num: number;
  row: number;
  col: number;
  sp: SpecialType;
  locked: boolean;
  bombT: number;
  frozen: boolean;
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
