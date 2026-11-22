// Cameras: wall-mounted sentries that sweep their cone back and forth.
// A camera that sees the thief feeds the alarm fast. Hacking the security
// panel switches them off for a while; their little red light goes dark.

import { TUNE } from './config.js';

export class Camera {
  constructor(def) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep;
    this.phase = def.phase;
    this.angle = def.baseAngle;
    this.time = def.phase * 2;
    this.disabledUntil = 0;
    this.seesThief = false;
    this.spottedFlash = 0;
  }

  get disabled() {
    return this.disabledUntil > 0;
  }

  disableFor(seconds, now) {
    this.disabledUntil = now + seconds;
  }

  update(dt, now, world) {
    if (this.disabledUntil > 0) {
      this.disabledUntil -= dt;
      this.seesThief = false;
      return;
    }
    this.time += dt;
    // Pendulum sweep: the cone swings around its base angle.
    this.angle = this.baseAngle + Math.sin(this.time * TUNE.cameraSweep) * this.sweep;
    if (this.spottedFlash > 0) this.spottedFlash -= dt;

    const score = world.visionScore(this, world.thief);
    const wasSeeing = this.seesThief;
    this.seesThief = score >= 1;
    if (this.seesThief && !wasSeeing) {
      this.spottedFlash = 0.6;
      world.onSpotted(this);
    }
  }

  cone() {
    return {
      x: this.x,
      y: this.y,
      angle: this.angle,
      range: TUNE.cameraRange,
      halfAngle: TUNE.cameraHalfAngle,
      hot: this.seesThief,
      warm: false,
    };
  }
}
