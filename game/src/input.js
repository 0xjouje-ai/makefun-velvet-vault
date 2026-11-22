// Input: keyboard + mouse, read fresh every frame. The game asks this
// object questions ("is left held?", "was E just pressed?") instead of
// listening to events itself, so playtests can drive it synthetically.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed since the last frame
    this.mouseX = 0;
    this.mouseY = 0;
    this.mousePressed = false; // left click since last frame
    this.rightPressed = false; // right click since last frame
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pressed.clear();
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      this.mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mousePressed = true;
      if (e.button === 2) this.rightPressed = true;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Movement vector from WASD or arrows, normalised.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  get sneaking() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  get interacting() {
    return this.keys.has('KeyF');
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  // Call at the end of every frame: one-shot presses expire.
  endFrame() {
    this.pressed.clear();
    this.mousePressed = false;
    this.rightPressed = false;
  }

  // Test hooks: pretend a key is held, or was just pressed.
  testHold(code) {
    this.keys.add(code);
  }
  testRelease(code) {
    this.keys.delete(code);
  }
  testPress(code) {
    this.pressed.add(code);
    this.keys.add(code);
  }
}
