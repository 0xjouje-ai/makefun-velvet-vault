// Level: the museum floor as live objects. Built once from the config data,
// then asked two questions all game long: "can a circle stand here?" and
// "can this watcher see that point?".

import { LEVEL, TUNE } from './config.js';
import { hasLineOfSight, insideSmoke } from './vision.js';

export function buildLevel() {
  const sightBlockers = [...LEVEL.walls, ...LEVEL.cover];
  const moveBlockers = [...LEVEL.walls, ...LEVEL.cover, ...LEVEL.ropes];
  return {
    walls: LEVEL.walls,
    cover: LEVEL.cover,
    ropes: LEVEL.ropes,
    sightBlockers,
    moveBlockers,
    star: { ...LEVEL.star, taken: false },
    loot: LEVEL.loot.map((l) => ({ ...l, taken: false })),
    panel: { ...LEVEL.panel },
    exit: { ...LEVEL.exit },
    playerStart: { ...LEVEL.playerStart },
  };
}

// Push a circle (x, y, radius) out of every rectangle it overlaps.
// Returns the corrected position. Axis-separated so the thief slides
// along walls instead of sticking to them.
export function resolveCircleCollision(x, y, radius, blockers) {
  let nx = x;
  let ny = y;
  for (const r of blockers) {
    const closestX = Math.max(r.x, Math.min(nx, r.x + r.w));
    const closestY = Math.max(r.y, Math.min(ny, r.y + r.h));
    const dx = nx - closestX;
    const dy = ny - closestY;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        nx = closestX + (dx / d) * radius;
        ny = closestY + (dy / d) * radius;
      } else {
        // Dead centre inside the rectangle: shove out along the short axis.
        const pushLeft = nx - r.x;
        const pushRight = r.x + r.w - nx;
        const pushUp = ny - r.y;
        const pushDown = r.y + r.h - ny;
        const m = Math.min(pushLeft, pushRight, pushUp, pushDown);
        if (m === pushLeft) nx = r.x - radius;
        else if (m === pushRight) nx = r.x + r.w + radius;
        else if (m === pushUp) ny = r.y - radius;
        else ny = r.y + r.h + radius;
      }
    }
  }
  return { x: nx, y: ny };
}

// Try to move a circle by (dx, dy), sliding along blockers.
export function moveCircle(x, y, radius, dx, dy, blockers) {
  const afterX = resolveCircleCollision(x + dx, y, radius, blockers);
  const afterY = resolveCircleCollision(afterX.x, afterX.y + dy, radius, blockers);
  return afterY;
}

// Can watcher at (ox, oy) see point (tx, ty) through this level?
export function watcherSees(level, ox, oy, tx, ty, clouds) {
  if (insideSmoke(tx, ty, clouds)) return 0;
  if (insideSmoke(ox, oy, clouds)) return 0;
  return hasLineOfSight(ox, oy, tx, ty, level.sightBlockers) ? 1 : 0;
}

// Is the thief standing in the exit doorway?
export function insideExit(level, x, y) {
  const e = level.exit;
  return x > e.x && x < e.x + e.w && y > e.y - 6 && y < e.y + e.h;
}

// Is the thief close enough to use the security panel?
export function nearPanel(level, x, y) {
  const p = level.panel;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  return Math.hypot(x - cx, y - cy) < 64;
}

// Is the thief close enough to pick the star's case?
export function nearStar(level, x, y) {
  const s = level.star;
  return Math.hypot(x - s.x, y - s.y) < 58;
}

// How far along the pick is the thief (0..1), or null when not picking.
export function pickProgress(x, y, level) {
  if (level.star.taken) return null;
  return nearStar(level, x, y) ? 1 : null;
}

export { TUNE };
