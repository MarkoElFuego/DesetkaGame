import { COLS, ROWS } from './config';
import type { Cell } from './types';
import { state } from './state';
import { drawParticles } from './particles';
import { cellColor, isValid } from './match';
import { dom } from './ui';

let ctx: CanvasRenderingContext2D;

export function initRenderer(): void {
  ctx = dom.canvas.getContext('2d')!;
}

function drawCell(cell: Cell, x: number, y: number): void {
  const CZ = state.cellSize;
  const cx = x + CZ / 2;
  const cy = y + CZ / 2;
  const r = CZ * 0.4;
  const isSel = cell === state.dragStart;
  const isTgt = cell === state.dragEnd;
  const isHint = state.hintTimer > 4000 && state.hintCells.indexOf(cell) >= 0;
  const col = cellColor(cell);

  // Subtle glow behind circle
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fillStyle = col.replace(')', ',0.08)').replace('rgb', 'rgba');
  ctx.fill();

  // Circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);

  if (isSel) {
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 28;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Pulsing ring on selected
    const pulse = (Math.sin(Date.now() * 0.008) + 1) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3 + pulse * 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 + pulse * 0.4) + ')';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (isTgt && state.dragStart) {
    const valid = isValid(state.dragStart, cell);
    ctx.fillStyle = col;
    ctx.shadowColor = valid ? '#3bff6f' : '#ff3b4a';
    ctx.shadowBlur = 24;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Thick validity ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = valid ? 'rgba(59,255,111,0.8)' : 'rgba(255,59,74,0.6)';
    ctx.lineWidth = 3.5;
    ctx.stroke();
  } else {
    // Normal cell with subtle gradient
    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
    grad.addColorStop(0, lightenColor(col, 20));
    grad.addColorStop(1, col);
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Hint pulse
  if (isHint) {
    const al = (Math.sin(state.hintTimer * 0.005) + 1) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 + al * 0.5) + ')';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255,255,255,' + al * 0.8 + ')';
    ctx.shadowBlur = 15 * al;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Number text
  const fs = Math.round(CZ * 0.38);
  ctx.font = '700 ' + fs + 'px "Chakra Petch",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text shadow for depth
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText(String(cell.num), cx + 1, cy + 2);

  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 2;
  ctx.fillText(String(cell.num), cx, cy + 1);
  ctx.shadowBlur = 0;
}

/** Lighten a hex color by amount */
function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function draw(): void {
  if (!ctx) return;
  const CZ = state.cellSize;
  ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);

  // Subtle grid dots instead of lines
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let r = 1; r < ROWS; r++) {
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.arc(c * CZ, r * CZ, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Danger highlight
  for (let c = 0; c < COLS; c++) {
    if (state.grid[1] && state.grid[1][c]) {
      ctx.fillStyle = 'rgba(255,59,74,0.04)';
      ctx.fillRect(c * CZ, 0, CZ, CZ * 2);
    }
  }

  // Desetka mode glow
  if (state.desetkaMode) {
    ctx.fillStyle = 'rgba(240,192,64,' + (0.02 + Math.sin(Date.now() * 0.003) * 0.02) + ')';
    ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);
  }

  // Cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = state.grid[r][c];
      if (cell) drawCell(cell, c * CZ, r * CZ);
    }
  }

  // ── DRAG LINE (THICK & GLOWING) ──
  if (state.isDragging && state.dragStart) {
    const sx = state.dragStart.col * CZ + CZ / 2;
    const sy = state.dragStart.row * CZ + CZ / 2;
    const px = state.pointer.x;
    const py = state.pointer.y;

    // Determine color based on target validity
    let lineColor = 'rgba(255,255,255,0.6)';
    let glowColor = 'rgba(255,255,255,0.15)';
    if (state.dragEnd) {
      const valid = isValid(state.dragStart, state.dragEnd);
      lineColor = valid ? 'rgba(59,255,111,0.9)' : 'rgba(255,59,74,0.8)';
      glowColor = valid ? 'rgba(59,255,111,0.2)' : 'rgba(255,59,74,0.15)';
    }

    // Outer glow
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(px, py);
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Main thick line
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(px, py);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Bright core
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(px, py);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Endpoint dot
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Highlight target cell
    if (state.dragEnd) {
      const valid = isValid(state.dragStart, state.dragEnd);
      const tx = state.dragEnd.col * CZ;
      const ty = state.dragEnd.row * CZ;
      ctx.fillStyle = valid ? 'rgba(59,255,111,0.12)' : 'rgba(255,59,74,0.1)';
      ctx.fillRect(tx, ty, CZ, CZ);
    }
  }

  drawParticles(ctx);
}
