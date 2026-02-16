import { state } from './state';

const $ = (id: string) => document.getElementById(id)!;

export const dom = {
  get score() { return $('sv-sc'); },
  get combo() { return $('sv-cm'); },
  get level() { return $('sv-lv'); },
  get best() { return $('sv-bt'); },
  get timerFill() { return $('tf'); },
  get dangerZone() { return $('dz'); },
  get scoreBanner() { return $('sb'); },
  get gameBoard() { return $('gb'); },
  get canvas() { return $('gc') as HTMLCanvasElement; },
  get ovStart() { return $('ov-st'); },
  get ovGameOver() { return $('ov-go'); },
  get ovPause() { return $('ov-pa'); },
  get finalScore() { return $('f-sc'); },
  get finalBest() { return $('f-bt'); },
};

export function bump(el: HTMLElement): void {
  el.classList.add('bmp');
  setTimeout(() => el.classList.remove('bmp'), 120);
}

export function shake(): void {
  dom.gameBoard.classList.add('shk');
  setTimeout(() => dom.gameBoard.classList.remove('shk'), 120);
}

export function floatingText(text: string, cx: number, cy: number, big: boolean): void {
  const el = document.createElement('div');
  el.className = 'ft' + (big ? ' big' : '');
  el.innerText = text;
  const rect = dom.canvas.getBoundingClientRect();
  el.style.left = (rect.left + cx - 20) + 'px';
  el.style.top = (rect.top + cy - 10) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

export function updateScore(): void {
  dom.score.innerText = String(state.score);
  bump(dom.score);
}

export function updateCombo(): void {
  dom.combo.innerText = state.combo >= 2 ? '×' + state.combo : '—';
  if (state.combo >= 2) bump(dom.combo);
}

export function updateLevel(): void {
  dom.level.innerText = String(state.level);
  bump(dom.level);
}

export function updateBest(): void {
  dom.best.innerText = String(state.best);
}

export function showDesekta(show: boolean): void {
  dom.scoreBanner.classList.toggle('show', show);
  dom.gameBoard.style.boxShadow = show
    ? '0 0 40px rgba(240,192,64,0.3),0 16px 50px rgba(0,0,0,0.6)'
    : '';
}

export function setLastStand(active: boolean): void {
  dom.gameBoard.classList.toggle('ls', active);
}

export function showOverlay(name: 'start' | 'gameover' | 'pause', visible: boolean): void {
  const map = { start: dom.ovStart, gameover: dom.ovGameOver, pause: dom.ovPause };
  map[name].style.display = visible ? 'flex' : 'none';
}

export function showGameOver(isRecord: boolean): void {
  dom.finalScore.innerText = String(state.score);
  dom.finalBest.innerText = isRecord ? '🏆 NOVI REKORD!' : 'Best: ' + state.best;
  dom.finalBest.className = 'fs' + (isRecord ? ' rc' : '');
  showOverlay('gameover', true);
}

export function clearFloatingText(): void {
  document.querySelectorAll('.ft').forEach(e => e.remove());
}

export function boardBounce(): void {
  dom.gameBoard.style.transform = 'translateY(-4px)';
  setTimeout(() => { dom.gameBoard.style.transform = 'none'; }, 100);
}

export function updateTimerBar(pct: number, ts: number): void {
  dom.timerFill.style.width = pct + '%';
  if (pct > 80) {
    dom.timerFill.style.background = 'var(--red)';
    dom.timerFill.style.boxShadow = '0 0 10px var(--red)';
    dom.dangerZone.style.opacity = String((Math.sin(ts / 200) + 1) * 0.3);
  } else {
    dom.timerFill.style.background = 'linear-gradient(90deg,var(--cyan),#2e86de)';
    dom.timerFill.style.boxShadow = '0 0 6px var(--cyan)';
    dom.dangerZone.style.opacity = '0';
  }
}
