// Bootstrap: create the game on the page's canvas, run its loop, and
// expose a small test handle so a playtest can read the live state.

import { Game } from './game.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

// A staged screenshot state, when the page is opened with ?shot=<name>.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  applyShot(game, shot);
}

// The loop: fixed-ish step, clamped so a backgrounded tab never jumps.
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (!game.frozen) game.update(dt);
  game.draw(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Test handle: the playtest reads state and drives input through this.
window.__heist = {
  game,
  start: () => game.start(),
  reset: () => game.reset(),
};
