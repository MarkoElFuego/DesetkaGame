import { state } from './state';

export function emit(cx: number, cy: number, col: string, n: number = 10): void {
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 / n) * i + Math.random() * 0.4;
    const speed = 1.5 + Math.random() * 3.5;
    state.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      dec: 0.015 + Math.random() * 0.02,
      sz: 1.5 + Math.random() * 2.5,
      col,
    });
  }
}

export function tickParticles(): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life -= p.dec;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D): void {
  for (const p of state.particles) {
    ctx.globalAlpha = p.life * 0.8;
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.sz * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
