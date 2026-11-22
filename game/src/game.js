// Game: the state machine that ties the thief, the guards, the cameras,
// the alarm and the win/lose screens together. One update per frame,
// one draw per frame, and a small public surface the playtest reads.

import { LEVEL, TUNE, WORLD_W, WORLD_H } from './config.js';
import { buildLevel, moveCircle, resolveCircleCollision, insideExit, nearPanel, nearStar } from './level.js';
import { coneScore } from './vision.js';
import { Guard } from './guards.js';
import { Camera } from './cameras.js';
import { Thief } from './player.js';
import { Renderer } from './render.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';

export const PHASES = {
  TITLE: 'title',
  PLAYING: 'playing',
  CAUGHT: 'caught',
  ESCAPED: 'escaped',
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input(canvas);
    this.renderer = new Renderer(canvas);
    this.sounds = new SoundBank();
    this.reset();
  }

  reset() {
    this.level = buildLevel();
    this.thief = new Thief(this.level.playerStart);
    this.guards = LEVEL.guards.map((g) => new Guard(g));
    this.cameras = LEVEL.cameras.map((c) => new Camera(c));
    this.phase = PHASES.TITLE;
    this.alarm = 0;
    this.lockdownTimer = 0;
    this.lootValue = 0;
    this.timesSpotted = 0;
    this.elapsed = 0;
    this.now = 0;
    this.smokeClouds = [];
    this.coins = [];
    this.caughtBy = '';
    this.startedAt = null;
  }

  start() {
    if (this.phase !== PHASES.TITLE) return;
    this.phase = PHASES.PLAYING;
    this.startedAt = this.now;
    this.sounds.ensure();
  }

  // --- World services the guards, cameras and thief call into ---

  // How well does a watcher see the thief? 0 = not at all, 1 = dead on.
  // Sneaking halves the range a watcher can spot you at.
  visionScore(watcher, thief) {
    const range = watcher instanceof Camera
      ? TUNE.cameraRange
      : TUNE.guardVisionRange * (thief.sneaking ? 0.55 : 1);
    const half = watcher instanceof Camera ? TUNE.cameraHalfAngle : TUNE.guardVisionHalfAngle;
    let score = coneScore(watcher.x, watcher.y, watcher.angle, range, half, thief.x, thief.y);
    if (score === 0) return 0;
    if (!this.hasSight(watcher.x, watcher.y, thief.x, thief.y)) return 0;
    return score;
  }

  hasSight(ax, ay, bx, by) {
    // Sight is blocked by walls/cover, and by smoke at either end.
    for (const c of this.smokeClouds) {
      if (Math.hypot(bx - c.x, by - c.y) < c.radius) return false;
      if (Math.hypot(ax - c.x, ay - c.y) < c.radius) return false;
    }
    // Inline the segment test through the sight blockers.
    const solids = this.level.sightBlockers;
    for (const r of solids) {
      if (segmentHits(ax, ay, bx, by, r)) return false;
    }
    return true;
  }

  moveGuard(guard, nx, ny) {
    return resolveCircleCollision(nx, ny, 15, this.level.moveBlockers);
  }

  onSpotted(watcher) {
    this.timesSpotted++;
    this.sounds.spotted();
  }

  tossCoin(mx, my) {
    // The coin flies toward the mouse and lands where it stops: clamped
    // to a short throw so it stays a close-quarters distraction.
    const dx = mx - this.thief.x;
    const dy = my - this.thief.y;
    const dist = Math.hypot(dx, dy) || 1;
    const throwDist = Math.min(dist, 190);
    const lx = this.thief.x + (dx / dist) * throwDist;
    const ly = this.thief.y + (dy / dist) * throwDist;
    const landed = moveCircle(lx, ly, 4, 0, 0, this.level.moveBlockers);
    const coin = { x: landed.x, y: landed.y, flying: true, flyT: 0, tx: landed.x, ty: landed.y, sx: this.thief.x, sy: this.thief.y, landedAt: null };
    this.coins.push(coin);
    this.sounds.coinToss();
    // Guards hear it when it lands.
    coin.onLand = () => {
      coin.landedAt = this.now;
      this.sounds.coinLand();
      for (const g of this.guards) g.hearNoise(coin.x, coin.y);
    };
  }

  popSmoke(x, y) {
    this.smokeClouds.push({ x, y, radius: TUNE.smokeRadius, ttl: TUNE.smokeSeconds });
    this.sounds.smokePop();
  }

  takeStar() {
    if (this.level.star.taken) return;
    this.level.star.taken = true;
    this.lootValue += this.level.star.value;
    this.sounds.glassCrack();
    this.sounds.pickup();
  }

  hackCameras() {
    for (const c of this.cameras) c.disableFor(TUNE.cameraOffSeconds, this.now);
    this.alarm = Math.max(0, this.alarm - 25);
    this.sounds.hackDone();
  }

  camerasOff() {
    return this.cameras.every((c) => c.disabled);
  }

  // --- Frame ---

  update(dt) {
    this.now += dt;
    if (this.phase === PHASES.TITLE) {
      if (this.input.wasPressed('Enter') || this.input.mousePressed) this.start();
      this.input.endFrame();
      return;
    }
    if (this.phase === PHASES.CAUGHT || this.phase === PHASES.ESCAPED) {
      if (this.input.wasPressed('KeyR') || this.input.mousePressed) {
        this.reset();
        this.start();
      }
      this.input.endFrame();
      return;
    }

    this.elapsed += dt;
    if (this.input.wasPressed('KeyM')) this.sounds.toggleMute();

    // Thief.
    this.thief.update(dt, this.input, this);
    if (this.thief.footstepDue) {
      this.thief.footstepDue = false;
      this.sounds.step();
    }

    // Thrown coins: fly, land, fade after a while.
    for (const coin of this.coins) {
      if (coin.flying) {
        coin.flyT += dt * 3.2;
        const t = Math.min(1, coin.flyT);
        coin.x = coin.sx + (coin.tx - coin.sx) * t;
        coin.y = coin.sy + (coin.ty - coin.sy) * t;
        if (t >= 1) {
          coin.flying = false;
          if (coin.onLand) coin.onLand();
        }
      }
    }
    // Coins rest where they landed and fade from the floor after a while.
    this.coins = this.coins.filter((c) => c.flying || c.landedAt === null || this.now - c.landedAt < 25);

    // Smoke clouds thin out.
    for (const c of this.smokeClouds) c.ttl -= dt;
    this.smokeClouds = this.smokeClouds.filter((c) => c.ttl > 0);

    // Guards and cameras.
    for (const g of this.guards) g.update(dt, this);
    for (const c of this.cameras) c.update(dt, this.now, this);

    // Side loot: walk over it to pocket it.
    for (const l of this.level.loot) {
      if (!l.taken && Math.hypot(this.thief.x - l.x, this.thief.y - l.y) < 30) {
        l.taken = true;
        this.lootValue += l.value;
        this.sounds.pickup();
      }
    }

    // The alarm: climbs while anyone has eyes on the thief, drains otherwise.
    const guardSeeing = this.guards.some((g) => g.seesThief);
    const cameraSeeing = this.cameras.some((c) => c.seesThief);
    if (this.lockdownTimer > 0) {
      this.lockdownTimer -= dt;
      this.alarm = TUNE.alarmLockdownAt;
      if (this.lockdownTimer <= 0) this.alarm = 60;
    } else if (guardSeeing) {
      this.alarm = Math.min(100, this.alarm + TUNE.alarmGuardRate * dt);
    } else if (cameraSeeing) {
      this.alarm = Math.min(100, this.alarm + TUNE.alarmCameraRate * dt);
    } else {
      this.alarm = Math.max(0, this.alarm - TUNE.alarmDecay * dt);
    }
    if (this.alarm >= TUNE.alarmLockdownAt && this.lockdownTimer <= 0) {
      this.lockdownTimer = TUNE.lockdownSeconds;
      this.sounds.lockdown();
      // Every guard converges on the thief's last known spot.
      for (const g of this.guards) {
        g.state = 'chase';
        g.stateTime = 0;
        g.lastSeen = { x: this.thief.x, y: this.thief.y };
      }
    }
    this.sounds.setAlarmLevel(this.alarm / 100);

    // Caught: a guard gets hands on the thief.
    for (const g of this.guards) {
      if (g.distanceTo(this.thief.x, this.thief.y) < TUNE.guardCatchDistance) {
        this.phase = PHASES.CAUGHT;
        this.caughtBy = g.name;
        this.sounds.caught();
        break;
      }
    }

    // Escaped: star in hand, through the service door.
    if (this.phase === PHASES.PLAYING && this.level.star.taken && insideExit(this.level, this.thief.x, this.thief.y)) {
      this.phase = PHASES.ESCAPED;
      this.sounds.escaped();
    }

    this.input.endFrame();
  }

  draw(dt) {
    this.renderer.draw(this, dt);
  }

  // --- HUD text ---

  objectiveText() {
    if (!this.level.star.taken) return 'Steal the Meridian Star from its case (hold F)';
    return 'Star secured — slip out the green service door!';
  }

  contextHint() {
    if (!this.level.star.taken && nearStar(this.level, this.thief.x, this.thief.y)) {
      return 'Hold F to pick the case';
    }
    if (nearPanel(this.level, this.thief.x, this.thief.y) && !this.camerasOff()) {
      return 'Hold F to hack the cameras';
    }
    return null;
  }

  clockText() {
    const s = Math.floor(this.elapsed);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  rankText() {
    if (this.timesSpotted === 0) return 'GHOST — never seen';
    if (this.timesSpotted <= 2) return 'SHADOW — barely noticed';
    if (this.timesSpotted <= 5) return 'PRO — a little noise';
    return 'LOUD — the whole museum woke up';
  }
}

// Segment-vs-rectangle test, kept here so game.js needs no extra import
// for the one place it checks sight itself.
function segmentHits(ax, ay, bx, by, r) {
  if (ax >= r.x && ax <= r.x + r.w && ay >= r.y && ay <= r.y + r.h) return true;
  if (bx >= r.x && bx <= r.x + r.w && by >= r.y && by <= r.y + r.h) return true;
  const x2 = r.x + r.w;
  const y2 = r.y + r.h;
  return (
    cross(ax, ay, bx, by, r.x, r.y, x2, r.y) ||
    cross(ax, ay, bx, by, x2, r.y, x2, y2) ||
    cross(ax, ay, bx, by, x2, y2, r.x, y2) ||
    cross(ax, ay, bx, by, r.x, y2, r.x, r.y)
  );
}

function cross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

export { WORLD_W, WORLD_H };
