import './styles/main.css';
import { state } from './state';
import { toggleSound } from './audio';
import { startGame, togglePause, resize } from './game';
import { attachInput } from './input';
import { initRenderer } from './renderer';
import { updateBest } from './ui';

// Display stored best score
updateBest();

// Init renderer
initRenderer();

// Attach input handlers
attachInput();

// Button events
document.getElementById('btn-pause')!.addEventListener('click', togglePause);
document.getElementById('btn-sound')!.addEventListener('click', toggleSound);
document.getElementById('btn-start')!.addEventListener('click', startGame);
document.getElementById('btn-restart')!.addEventListener('click', startGame);
document.getElementById('btn-resume')!.addEventListener('click', togglePause);

// Keyboard
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  if (e.code === 'Space' && !state.running) {
    e.preventDefault();
    startGame();
  }
});

// Resize
window.addEventListener('resize', resize);
setTimeout(resize, 80);
