// Vision math: line of sight past rectangles, and "is this point inside
// a vision cone". Guards, cameras and the smoke check all share these.

// Do the segments (ax,ay)-(bx,by) and (cx,cy)-(dx,dy) cross?
export function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

// Does the segment from (ax,ay) to (bx,by) hit rectangle r?
export function segmentHitsRect(ax, ay, bx, by, r) {
  if (ax >= r.x && ax <= r.x + r.w && ay >= r.y && ay <= r.y + r.h) return true;
  if (bx >= r.x && bx <= r.x + r.w && by >= r.y && by <= r.y + r.h) return true;
  const x2 = r.x + r.w;
  const y2 = r.y + r.h;
  return (
    segmentsCross(ax, ay, bx, by, r.x, r.y, x2, r.y) ||
    segmentsCross(ax, ay, bx, by, x2, r.y, x2, y2) ||
    segmentsCross(ax, ay, bx, by, x2, y2, r.x, y2) ||
    segmentsCross(ax, ay, bx, by, r.x, y2, r.x, r.y)
  );
}

// True when nothing solid stands between the two points.
// `solids` is the list of rectangles that block sight.
export function hasLineOfSight(ax, ay, bx, by, solids) {
  for (const r of solids) {
    if (segmentHitsRect(ax, ay, bx, by, r)) return false;
  }
  return true;
}

// Smallest absolute difference between two angles, in [0, PI].
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// 0 = not in the cone at all, 1 = squarely inside it, in-between = at the
// cone's edge, where a watcher only grows suspicious instead of certain.
export function coneScore(ox, oy, angle, range, halfAngle, tx, ty) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  const targetAngle = Math.atan2(dy, dx);
  const off = angleDifference(targetAngle, angle);
  if (off > halfAngle) return 0;
  if (off < halfAngle * 0.55) return 1;
  return 1 - (off - halfAngle * 0.55) / (halfAngle * 0.45);
}

// Is the point inside any smoke cloud?
export function insideSmoke(x, y, clouds) {
  for (const c of clouds) {
    if (Math.hypot(x - c.x, y - c.y) < c.radius) return true;
  }
  return false;
}
