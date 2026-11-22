// Guards: the patrolmen of the Meridian Museum. Each one walks a loop of
// waypoints, sweeps his vision cone, and reacts in four states:
//   patrol     — walking the loop, cone sweeping gently
//   suspicious — saw something at the cone's edge; walks over to look
//   chase      — eyes on the thief; closes in, alarm climbing
//   investigate — heard a coin, or lost the thief; searches, then returns

import { TUNE } from './config.js';
import { angleDifference, coneScore } from './vision.js';

export const GUARD_STATES = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  CHASE: 'chase',
  INVESTIGATE: 'investigate',
};

export class Guard {
  constructor(def) {
    this.name = def.name;
    this.color = def.color;
    this.waypoints = def.waypoints;
    this.x = def.waypoints[0].x;
    this.y = def.waypoints[0].y;
    this.wpIndex = 1;
    this.angle = Math.PI / 2; // facing south to start
    this.state = GUARD_STATES.PATROL;
    this.suspicion = 0;
    this.stateTime = 0;
    this.lastSeen = null;
    this.searchPoint = null;
    this.seesThief = false;
    this.partialSight = false;
    this.speed = TUNE.guardPatrolSpeed;
    this.waitTime = 0;
    this.spottedFlash = 0;
  }

  // Where the guard's cone points right now.
  coneAngle() {
    return this.angle;
  }

  // Step the guard one frame. `world` carries the level, the thief, the
  // smoke clouds and the callbacks for sound and alarm.
  update(dt, world) {
    this.stateTime += dt;
    if (this.spottedFlash > 0) this.spottedFlash -= dt;
    const thief = world.thief;

    // --- Vision: how well can this guard see the thief right now? ---
    const score = world.visionScore(this, thief);
    this.seesThief = score >= 1;
    this.partialSight = score > 0 && score < 1;

    if (this.seesThief) {
      this.suspicion = 1;
      if (this.state !== GUARD_STATES.CHASE) {
        this.state = GUARD_STATES.CHASE;
        this.stateTime = 0;
        this.spottedFlash = 0.6;
        world.onSpotted(this);
      }
      this.lastSeen = { x: thief.x, y: thief.y };
    } else if (this.partialSight) {
      this.suspicion = Math.min(1, this.suspicion + dt * 1.1);
      if (this.suspicion >= 1 && this.state === GUARD_STATES.PATROL) {
        this.state = GUARD_STATES.SUSPICIOUS;
        this.stateTime = 0;
        this.searchPoint = { x: thief.x, y: thief.y };
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - dt * 0.5);
    }

    // --- Movement by state ---
    if (this.state === GUARD_STATES.PATROL) {
      this.speed = TUNE.guardPatrolSpeed;
      const target = this.waypoints[this.wpIndex];
      if (this.moveToward(target.x, target.y, dt, world)) {
        this.waitTime = 1.4;
        this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      }
      // Gentle cone sweep while walking.
      this.angle += Math.sin(this.stateTime * 0.7) * 0.0012;
    } else if (this.state === GUARD_STATES.SUSPICIOUS) {
      this.speed = TUNE.guardPatrolSpeed * 1.25;
      if (this.searchPoint && this.moveToward(this.searchPoint.x, this.searchPoint.y, dt, world)) {
        this.state = GUARD_STATES.INVESTIGATE;
        this.stateTime = 0;
      }
    } else if (this.state === GUARD_STATES.CHASE) {
      this.speed = TUNE.guardChaseSpeed;
      const target = this.lastSeen || { x: thief.x, y: thief.y };
      const reached = this.moveToward(target.x, target.y, dt, world);
      if (!this.seesThief && this.stateTime > 2.5) {
        // Lost the trail: search where the thief was last seen.
        this.state = GUARD_STATES.INVESTIGATE;
        this.stateTime = 0;
        this.searchPoint = this.lastSeen;
      }
      if (reached && this.seesThief) {
        // Standing on the thief's heels but the thief slipped a corner.
        this.state = GUARD_STATES.INVESTIGATE;
        this.stateTime = 0;
        this.searchPoint = { x: thief.x, y: thief.y };
      }
    } else if (this.state === GUARD_STATES.INVESTIGATE) {
      this.speed = TUNE.guardPatrolSpeed * 1.15;
      if (this.searchPoint) {
        const arrived = this.moveToward(this.searchPoint.x, this.searchPoint.y, dt, world);
        if (arrived) {
          // Look around for a moment, then give up and go back to patrol.
          this.angle += dt * 2.2;
          if (this.stateTime > 3.2) {
            this.state = GUARD_STATES.PATROL;
            this.stateTime = 0;
            this.searchPoint = null;
          }
        }
      } else {
        this.state = GUARD_STATES.PATROL;
        this.stateTime = 0;
      }
    }

    // Pause at each waypoint and look around.
    if (this.waitTime > 0) {
      this.waitTime -= dt;
      this.angle += dt * 0.9;
    }
  }

  // Walk toward (tx, ty). Returns true when arrived. Turns the guard's
  // facing toward the direction of travel.
  moveToward(tx, ty, dt, world) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) return true;
    const step = Math.min(dist, this.speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    const moved = world.moveGuard(this, nx, ny);
    this.x = moved.x;
    this.y = moved.y;
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += diff * Math.min(1, dt * 6);
    return false;
  }

  // Called by the world when a coin lands within earshot.
  hearNoise(x, y) {
    if (this.state === GUARD_STATES.CHASE) return;
    const d = Math.hypot(x - this.x, y - this.y);
    if (d < TUNE.guardHearing) {
      this.state = GUARD_STATES.INVESTIGATE;
      this.stateTime = 0;
      this.searchPoint = { x, y };
    }
  }

  distanceTo(x, y) {
    return Math.hypot(x - this.x, y - this.y);
  }
}

// The cone a guard projects, for the renderer and the alarm logic.
export function guardCone(guard) {
  return {
    x: guard.x,
    y: guard.y,
    angle: guard.angle,
    range: TUNE.guardVisionRange,
    halfAngle: TUNE.guardVisionHalfAngle,
    hot: guard.seesThief,
    warm: guard.partialSight || guard.suspicion > 0.4,
  };
}

export { angleDifference, coneScore };
