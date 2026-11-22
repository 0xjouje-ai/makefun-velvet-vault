// The thief: Wren, a cat burglar in a dark coat. Moves with WASD or the
// arrow keys, sneaks with Shift, and carries two tools bought with nerve:
// coins to throw as a distraction, and smoke pellets to vanish behind.
// Holding F by the star's case picks the lock; holding F by the security
// panel hacks the cameras.

import { TUNE } from './config.js';
import { moveCircle, nearPanel, nearStar } from './level.js';

export class Thief {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.radius = TUNE.playerRadius;
    this.facing = -Math.PI / 2; // facing the room
    this.sneaking = false;
    this.moving = false;
    this.coins = TUNE.coinCount;
    this.smokes = TUNE.smokeCount;
    this.pickTimer = 0; // seconds held on the star's case
    this.hackTimer = 0; // seconds held on the security panel
    this.stepTimer = 0;
    this.footstepDue = false;
  }

  reset(start) {
    this.x = start.x;
    this.y = start.y;
    this.facing = -Math.PI / 2;
    this.coins = TUNE.coinCount;
    this.smokes = TUNE.smokeCount;
    this.pickTimer = 0;
    this.hackTimer = 0;
  }

  update(dt, input, world) {
    const vec = input.moveVector();
    this.sneaking = input.sneaking;
    this.moving = vec.x !== 0 || vec.y !== 0;
    const speed = this.sneaking ? TUNE.playerSneak : TUNE.playerWalk;
    if (this.moving) {
      const moved = moveCircle(
        this.x, this.y, this.radius,
        vec.x * speed * dt, vec.y * speed * dt,
        world.level.moveBlockers,
      );
      this.x = moved.x;
      this.y = moved.y;
      this.facing = Math.atan2(vec.y, vec.x);
      this.stepTimer += dt * (this.sneaking ? 1.1 : 1.8);
      if (this.stepTimer > 0.42) {
        this.stepTimer = 0;
        this.footstepDue = true;
      }
    }

    // Tools: E or right-click tosses a coin toward the mouse; Q pops smoke.
    if ((input.wasPressed('KeyE') || input.rightPressed) && this.coins > 0) {
      this.coins--;
      world.tossCoin(input.mouseX, input.mouseY);
    }
    if (input.wasPressed('KeyQ') && this.smokes > 0) {
      this.smokes--;
      world.popSmoke(this.x, this.y);
    }

    // Holding F: pick the star's case, or hack the panel — whichever is near.
    if (input.interacting) {
      if (!world.level.star.taken && nearStar(world.level, this.x, this.y)) {
        this.pickTimer += dt;
        if (this.pickTimer >= TUNE.starPickSeconds) {
          world.takeStar();
          this.pickTimer = 0;
        }
      } else if (nearPanel(world.level, this.x, this.y) && !world.camerasOff()) {
        this.hackTimer += dt;
        if (this.hackTimer >= TUNE.panelHackSeconds) {
          world.hackCameras();
          this.hackTimer = 0;
        }
      } else {
        this.pickTimer = 0;
        this.hackTimer = 0;
      }
    } else {
      this.pickTimer = 0;
      this.hackTimer = 0;
    }
  }

  // 0..1 progress ring shown over the thief while picking or hacking.
  actionProgress() {
    if (this.pickTimer > 0) return this.pickTimer / TUNE.starPickSeconds;
    if (this.hackTimer > 0) return this.hackTimer / TUNE.panelHackSeconds;
    return 0;
  }
}
