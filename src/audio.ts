import { NUM_TONES } from './config';
import { state } from './state';

export function initAudio(): void {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
}

function tone(freq: number, dur: number, type?: OscillatorType, vol?: number): void {
  if (!state.soundOn || !state.audioCtx) return;
  try {
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);
    gain.gain.setValueAtTime(vol || 0.12, state.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(state.audioCtx.destination);
    osc.start();
    osc.stop(state.audioCtx.currentTime + dur);
  } catch (_) { /* ignore audio errors */ }
}

export function sfxMatch(n1: number, n2: number): void {
  const m = Math.pow(2, Math.min(state.combo, 3) * 0.25);
  tone(NUM_TONES[n1] * m, 0.18, 'sine', 0.10);
  setTimeout(() => tone(NUM_TONES[n2] * m, 0.15, 'triangle', 0.08), 40);
}

export function sfxClick(): void { tone(900, 0.04, 'sine', 0.05); }
export function sfxBad(): void { tone(150, 0.15, 'sawtooth', 0.06); }
export function sfxSpawn(): void { tone(180, 0.06, 'triangle', 0.03); }
export function sfxDanger(): void { tone(140, 0.25, 'sawtooth', 0.05); }

export function sfxLevelUp(): void {
  tone(523, 0.1, 'sine', 0.1);
  setTimeout(() => tone(659, 0.1, 'sine', 0.1), 80);
  setTimeout(() => tone(784, 0.15, 'sine', 0.12), 160);
}

export function sfxStreak(): void {
  tone(784, 0.12, 'triangle', 0.12);
  setTimeout(() => tone(988, 0.12, 'triangle', 0.12), 80);
  setTimeout(() => tone(1175, 0.2, 'triangle', 0.15), 160);
}

export function sfxOver(): void {
  tone(300, 0.25, 'sawtooth', 0.08);
  setTimeout(() => tone(200, 0.3, 'sawtooth', 0.06), 180);
  setTimeout(() => tone(120, 0.5, 'sawtooth', 0.05), 360);
}

export function toggleSound(): void {
  state.soundOn = !state.soundOn;
  const btn = document.getElementById('btn-sound')!;
  btn.classList.toggle('on', state.soundOn);
  btn.style.textDecoration = state.soundOn ? 'none' : 'line-through';
}
