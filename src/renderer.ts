import { COLS, ROWS } from './config';
import { SpecialType } from './types';
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

  // Circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);

  if (cell.frozen) {
    ctx.fillStyle = 'rgba(100,180,255,0.15)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,200,255,0.4)';
    ctx.fill();
  } else if (isSel) {
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 22;
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (isTgt && state.dragStart) {
    const valid = isValid(state.dragStart, cell);
    ctx.fillStyle = col;
    ctx.shadowColor = valid ? '#3bff6f' : '#ff3b4a';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = valid ? 'rgba(59,255,111,0.7)' : 'rgba(255,59,74,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    ctx.fillStyle = col;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 3;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Hint pulse
  if (isHint) {
    const al = (Math.sin(state.hintTimer * 0.005) + 1) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 + al * 0.5) + ')';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(255,255,255,' + al * 0.6 + ')';
    ctx.shadowBlur = 10 * al;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Special borders
  if (cell.sp === SpecialType.LOCKED && cell.locked) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (cell.sp === SpecialType.BOMB) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,59,74,' + (0.4 + Math.sin(Date.now() * 0.008) * 0.3) + ')';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  if (cell.sp === SpecialType.ICE) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100,200,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Frozen overlay
  if (cell.frozen) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100,180,255,0.15)';
    ctx.fill();
  }

  // Number text
  const fs = Math.round(CZ * 0.38);
  ctx.font = '700 ' + fs + 'px "Chakra Petch",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = cell.frozen ? 'rgba(255,255,255,0.3)' : '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 2;

  if (cell.sp === SpecialType.JOKER) {
    ctx.fillStyle = '#fff';
    ctx.font = '700 ' + Math.round(CZ * 0.45) + 'px sans-serif';
    ctx.fillText('★', cx, cy + 1);
  } else {
    ctx.fillText(String(cell.num), cx, cy + 1);
  }
  ctx.shadowBlur = 0;

  // Bomb timer badge
  if (cell.sp === SpecialType.BOMB) {
    const bx = x + CZ - 6;
    const by = y + 6;
    ctx.fillStyle = '#ff3b4a';
    ctx.beginPath();
    ctx.arc(bx, by, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 9px "Chakra Petch"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(cell.bombT), bx, by + 1);
  }

  // Lock icon
  if (cell.sp === SpecialType.LOCKED && cell.locked) {
    ctx.font = Math.round(CZ * 0.2) + 'px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('🔒', cx, cy - r + 6);
  }

  // Freeze indicator
  if (cell.frozen && cell.sp !== SpecialType.ICE) {
    ctx.font = Math.round(CZ * 0.18) + 'px sans-serif';
    ctx.fillStyle = 'rgba(100,200,255,0.8)';
    ctx.fillText('❄', cx, cy + r - 4);
  }
}

export function draw(): void {
  if (!ctx) return;
  const CZ = state.cellSize;
  ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CZ);
    ctx.lineTo(dom.canvas.width, r * CZ);
    ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CZ, 0);
    ctx.lineTo(c * CZ, dom.canvas.height);
    ctx.stroke();
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

  // Drag laser
  if (state.isDragging && state.dragStart) {
    const sx = state.dragStart.col * CZ + CZ / 2;
    const sy = state.dragStart.row * CZ + CZ / 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(state.pointer.x, state.pointer.y);
    const gr = ctx.createLinearGradient(sx, sy, state.pointer.x, state.pointer.y);
    gr.addColorStop(0, 'rgba(255,255,255,0.05)');
    gr.addColorStop(1, 'rgba(255,255,255,0.5)');
    ctx.strokeStyle = gr;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Crosshair
    const cr = 6;
    ctx.beginPath();
    ctx.arc(state.pointer.x, state.pointer.y, cr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(state.pointer.x - cr - 2, state.pointer.y);
    ctx.lineTo(state.pointer.x + cr + 2, state.pointer.y);
    ctx.moveTo(state.pointer.x, state.pointer.y - cr - 2);
    ctx.lineTo(state.pointer.x, state.pointer.y + cr + 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.stroke();

    // Highlight target validity
    if (state.dragEnd) {
      const valid = isValid(state.dragStart, state.dragEnd);
      const tx = state.dragEnd.col * CZ;
      const ty = state.dragEnd.row * CZ;
      ctx.fillStyle = valid ? 'rgba(59,255,111,0.08)' : 'rgba(255,59,74,0.08)';
      ctx.fillRect(tx, ty, CZ, CZ);
    }
  }

  drawParticles(ctx);
}
