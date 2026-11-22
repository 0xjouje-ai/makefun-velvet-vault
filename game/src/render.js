// Render: everything the player sees, drawn on one canvas.
// The museum is drawn in flat, readable shapes: warm wood floor, dark
// walls, gold loot, pale cones for watchers, red when they have you.
// Safe cover reads as solid furniture; danger reads as light.

import { WORLD_W, WORLD_H, TUNE } from './config.js';

const FLOOR_A = '#2a2118';
const FLOOR_B = '#241c14';
const WALL_COLOR = '#171310';
const WALL_TOP = '#3a2f26';
const CASE_COLOR = '#4a3b2c';
const CASE_GLASS = 'rgba(180, 210, 230, 0.16)';
const ROPE_COLOR = '#a33b4d';
const GOLD = '#ffd166';
const CONE_CALM = 'rgba(255, 226, 130, 0.20)';
const CONE_WARM = 'rgba(255, 190, 80, 0.30)';
const CONE_HOT = 'rgba(255, 70, 60, 0.34)';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.time = 0;
  }

  draw(game, dt) {
    this.time += dt;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WORLD_W, WORLD_H);
    if (game.phase === 'title') {
      this.drawMuseum(game);
      this.drawTitle(game);
      return;
    }
    this.drawMuseum(game);
    this.drawLoot(game);
    this.drawExit(game);
    this.drawSmoke(game);
    this.drawCones(game);
    this.drawCameras(game);
    this.drawGuards(game);
    this.drawThief(game);
    this.drawHud(game);
    if (game.phase === 'caught') this.drawCaught(game);
    if (game.phase === 'escaped') this.drawEscaped(game);
    if (game.alarm >= TUNE.alarmLockdownAt) this.drawLockdownBanner(game);
  }

  // --- The room ---

  drawMuseum(game) {
    const ctx = this.ctx;
    const level = game.level;
    // Checkerboard wood floor.
    const tile = 80;
    for (let y = 0; y < WORLD_H / tile; y++) {
      for (let x = 0; x < WORLD_W / tile; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? FLOOR_A : FLOOR_B;
        ctx.fillRect(x * tile, y * tile, tile, tile);
      }
    }
    // A deep red carpet runs up the central hall to the star.
    ctx.fillStyle = '#5a1f28';
    ctx.fillRect(560, 100, 160, 596);
    ctx.fillStyle = '#6e2833';
    ctx.fillRect(568, 100, 144, 596);
    // Gold trim along the carpet.
    ctx.fillStyle = '#8a6d2f';
    ctx.fillRect(560, 100, 4, 596);
    ctx.fillRect(716, 100, 4, 596);

    // Walls: dark block with a lighter top edge.
    for (const w of level.walls) {
      ctx.fillStyle = WALL_COLOR;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = WALL_TOP;
      if (w.h <= 24) ctx.fillRect(w.x, w.y + w.h - 4, w.w, 4);
      else ctx.fillRect(w.x + w.w - 4, w.y, 4, w.h);
    }
    // Display cases and pillars.
    for (const c of level.cover) {
      if (c.label === 'pillar') {
        ctx.fillStyle = '#54432f';
        ctx.fillRect(c.x - 3, c.y - 3, c.w + 6, c.h + 6);
        ctx.fillStyle = '#6b563d';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = '#8a744f';
        ctx.fillRect(c.x + 6, c.y + 6, c.w - 12, 4);
      } else if (c.label === 'plinth') {
        ctx.fillStyle = '#3d2f22';
        ctx.fillRect(c.x - 6, c.y - 6, c.w + 12, c.h + 12);
        ctx.fillStyle = '#6b563d';
        ctx.fillRect(c.x, c.y, c.w, c.h);
      } else {
        ctx.fillStyle = CASE_COLOR;
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = CASE_GLASS;
        ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
        ctx.strokeStyle = '#8a6d2f';
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      }
    }
    // Velvet ropes: red line on brass posts.
    for (const r of level.ropes) {
      ctx.fillStyle = ROPE_COLOR;
      ctx.fillRect(r.x, r.y - 2, r.w, r.h + 4);
      ctx.fillStyle = '#c9a227';
      const posts = r.w > r.h ? Math.floor(r.w / 40) + 1 : Math.floor(r.h / 40) + 1;
      for (let i = 0; i < posts; i++) {
        const px = r.w > r.h ? r.x + (i * r.w) / (posts - 1) : r.x + r.w / 2;
        const py = r.w > r.h ? r.y + r.h / 2 : r.y + (i * r.h) / (posts - 1);
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The security panel on the north wall.
    const p = level.panel;
    ctx.fillStyle = game.camerasOff() ? '#2f4a2f' : '#274a5a';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = game.camerasOff() ? '#5a8a5a' : '#e05a4e';
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8cfc0';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SECURITY', p.x + p.w / 2, p.y + p.h + 12);

    // The star's glass case (empty once taken).
    const s = level.star;
    if (!s.taken) {
      ctx.strokeStyle = 'rgba(200, 225, 245, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(200, 225, 245, 0.10)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 24, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawLoot(game) {
    const ctx = this.ctx;
    // The Meridian Star itself: a bright four-point star that glints.
    const s = game.level.star;
    if (!s.taken) {
      const glint = 0.7 + Math.sin(this.time * 3) * 0.3;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.sin(this.time * 0.8) * 0.15);
      ctx.fillStyle = `rgba(150, 220, 255, ${glint})`;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? 15 : 5;
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#cfe9ff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MERIDIAN STAR', s.x, s.y - 32);
    }
    for (const l of game.level.loot) {
      if (l.taken) continue;
      const bob = Math.sin(this.time * 2 + l.x) * 2;
      if (l.kind === 'painting') {
        ctx.fillStyle = '#7a5a2a';
        ctx.fillRect(l.x - 26, l.y - 18 + bob, 52, 36);
        ctx.fillStyle = l.id.includes('west') ? '#3f6d8e' : '#8e6d3f';
        ctx.fillRect(l.x - 21, l.y - 13 + bob, 42, 26);
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.strokeRect(l.x - 26, l.y - 18 + bob, 52, 36);
      } else if (l.kind === 'coins') {
        ctx.fillStyle = GOLD;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(l.x - 12 + i * 6, l.y + bob, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#a8842a';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('$', l.x, l.y - 12 + bob);
      } else {
        ctx.fillStyle = '#7fb3a0';
        ctx.beginPath();
        ctx.ellipse(l.x, l.y + bob, 12, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5a8a7a';
        ctx.fillRect(l.x - 5, l.y - 22 + bob, 10, 8);
      }
    }
  }

  drawExit(game) {
    const ctx = this.ctx;
    const e = game.level.exit;
    const open = game.level.star.taken;
    ctx.fillStyle = open ? '#2f7a3a' : '#4a4a4a';
    ctx.fillRect(e.x - 6, e.y - 4, e.w + 12, e.h + 4);
    ctx.fillStyle = open ? '#57c465' : '#8a8a8a';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'EXIT — GO!' : 'SERVICE DOOR', e.x + e.w / 2, e.y + 18);
    if (open) {
      const pulse = 0.5 + Math.sin(this.time * 5) * 0.5;
      ctx.strokeStyle = `rgba(87, 196, 101, ${0.4 + pulse * 0.5})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(e.x - 10, e.y - 8, e.w + 20, e.h + 8);
    }
  }

  drawSmoke(game) {
    const ctx = this.ctx;
    for (const c of game.smokeClouds) {
      const alpha = Math.min(0.55, (c.ttl / TUNE.smokeSeconds) * 0.55);
      ctx.fillStyle = `rgba(200, 200, 210, ${alpha})`;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(220, 220, 230, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(c.x - 20, c.y + 12, c.radius * 0.6, 0, Math.PI * 2);
      ctx.arc(c.x + 24, c.y - 10, c.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    // Thrown coins in flight, then resting where they landed.
    for (const coin of game.coins) {
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, coin.flying ? 4 : 6, 0, Math.PI * 2);
      ctx.fill();
      if (!coin.flying) {
        ctx.strokeStyle = 'rgba(255, 209, 102, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 10 + Math.sin(this.time * 4) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // --- Watchers ---

  drawCones(game) {
    const ctx = this.ctx;
    const cones = [];
    for (const g of game.guards) {
      const c = {
        x: g.x, y: g.y, angle: g.angle,
        range: TUNE.guardVisionRange, half: TUNE.guardVisionHalfAngle,
        hot: g.seesThief, warm: g.partialSight || g.suspicion > 0.4,
      };
      cones.push(c);
    }
    for (const cam of game.cameras) {
      if (cam.disabled) continue;
      cones.push({
        x: cam.x, y: cam.y, angle: cam.angle,
        range: TUNE.cameraRange, half: TUNE.cameraHalfAngle,
        hot: cam.seesThief, warm: false,
      });
    }
    for (const c of cones) {
      ctx.fillStyle = c.hot ? CONE_HOT : c.warm ? CONE_WARM : CONE_CALM;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.arc(c.x, c.y, c.range, c.angle - c.half, c.angle + c.half);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = c.hot ? 'rgba(255, 70, 60, 0.7)' : 'rgba(255, 226, 130, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  drawCameras(game) {
    const ctx = this.ctx;
    for (const cam of game.cameras) {
      ctx.fillStyle = '#222';
      ctx.fillRect(cam.x - 10, cam.y - 7, 20, 14);
      ctx.fillStyle = cam.disabled ? '#555' : cam.seesThief ? '#ff3b30' : '#ff5a4e';
      ctx.beginPath();
      ctx.arc(cam.x + (cam.disabled ? 0 : Math.cos(cam.angle) * 12), cam.y + (cam.disabled ? 0 : Math.sin(cam.angle) * 12), 4, 0, Math.PI * 2);
      ctx.fill();
      if (cam.disabled) {
        ctx.fillStyle = '#cfe9ff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('OFF', cam.x, cam.y + 22);
      }
    }
  }

  drawGuards(game) {
    const ctx = this.ctx;
    for (const g of game.guards) {
      // Body: a uniformed circle with a cap brim facing the cone.
      ctx.fillStyle = '#2b3a4a';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = g.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 15, 0, Math.PI * 2);
      ctx.stroke();
      // Cap brim shows facing.
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(g.x + Math.cos(g.angle) * 8, g.y + Math.sin(g.angle) * 8, 5, 0, Math.PI * 2);
      ctx.fill();
      // State marks: ! when chasing, ? when suspicious, Z when searching.
      let mark = null;
      let markColor = '#fff';
      if (g.state === 'chase') { mark = '!'; markColor = '#ff3b30'; }
      else if (g.state === 'suspicious') { mark = '?'; markColor = '#ffd166'; }
      else if (g.state === 'investigate') { mark = '…'; markColor = '#ffd166'; }
      if (mark) {
        const bounce = Math.sin(this.time * 6) * 2;
        ctx.fillStyle = markColor;
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(mark, g.x, g.y - 24 + bounce);
      }
      // Suspicion bar while it builds.
      if (g.suspicion > 0.05 && g.suspicion < 1 && g.state === 'patrol') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(g.x - 14, g.y - 26, 28, 5);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(g.x - 14, g.y - 26, 28 * g.suspicion, 5);
      }
      ctx.fillStyle = '#d8cfc0';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.name, g.x, g.y + 28);
    }
  }

  drawThief(game) {
    const ctx = this.ctx;
    const t = game.thief;
    // Soft shadow of suspicion: a faint ring when any watcher is warm.
    const watched = game.guards.some((g) => g.partialSight) || game.cameras.some((c) => c.seesThief);
    if (watched) {
      ctx.strokeStyle = 'rgba(255, 190, 80, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius + 6 + Math.sin(this.time * 6) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Body: dark coat, hood, pale face.
    ctx.fillStyle = '#1c1c26';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8dcc8';
    ctx.beginPath();
    ctx.arc(t.x + Math.cos(t.facing) * 5, t.y + Math.sin(t.facing) * 5, 5, 0, Math.PI * 2);
    ctx.fill();
    // Sneak indicator: a small "shh" eye-line when sneaking.
    if (t.sneaking) {
      ctx.fillStyle = '#8ecae6';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('sneak', t.x, t.y - 20);
    }
    // Progress ring while picking the lock or hacking the panel.
    const prog = t.actionProgress();
    if (prog > 0) {
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = GOLD;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 22, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.pickTimer > 0 ? 'PICKING…' : 'HACKING…', t.x, t.y - 30);
    }
  }

  // --- HUD ---

  drawHud(game) {
    const ctx = this.ctx;
    // Top bar.
    ctx.fillStyle = 'rgba(10, 8, 6, 0.78)';
    ctx.fillRect(0, 0, WORLD_W, 46);
    ctx.fillStyle = '#d8cfc0';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('THE GILDED HOUR', 16, 20);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#9a8f80';
    ctx.fillText('Meridian Museum — after dark', 16, 36);

    // Alarm meter, centre top.
    const ax = 470;
    const ay = 12;
    const aw = 340;
    const ah = 16;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
    const frac = game.alarm / 100;
    const alarmColor = frac < 0.4 ? '#57c465' : frac < 0.75 ? '#ffd166' : '#ff3b30';
    ctx.fillStyle = alarmColor;
    ctx.fillRect(ax, ay, aw * frac, ah);
    ctx.strokeStyle = '#d8cfc0';
    ctx.lineWidth = 1;
    ctx.strokeRect(ax - 2, ay - 2, aw + 4, ah + 4);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ALARM ${Math.round(game.alarm)}%`, ax + aw / 2, ay + 12);
    if (game.alarm >= 75) {
      ctx.fillStyle = `rgba(255, 59, 48, ${0.5 + Math.sin(this.time * 8) * 0.4})`;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('!! LOCKDOWN IMMINENT !!', ax + aw / 2, 64);
    }

    // Loot and tools, right side.
    ctx.textAlign = 'right';
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`$${game.lootValue.toLocaleString('en-US')}`, WORLD_W - 16, 20);
    ctx.fillStyle = '#d8cfc0';
    ctx.font = '11px sans-serif';
    ctx.fillText(`coins ×${game.thief.coins}   smoke ×${game.thief.smokes}`, WORLD_W - 16, 36);

    // Objective line, bottom left.
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(10, 8, 6, 0.78)';
    const obj = game.objectiveText();
    ctx.font = '13px sans-serif';
    const ow = ctx.measureText(obj).width + 24;
    ctx.fillRect(12, WORLD_H - 36, ow, 24);
    ctx.fillStyle = '#ffd166';
    ctx.fillText('◆ ' + obj, 24, WORLD_H - 19);

    // Timer + detections, bottom right.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#d8cfc0';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${game.clockText()}   spotted ×${game.timesSpotted}`, WORLD_W - 16, WORLD_H - 19);

    // Context hint near the thief.
    const hint = game.contextHint();
    if (hint) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10, 8, 6, 0.8)';
      const hw = ctx.measureText(hint).width + 20;
      ctx.fillRect(game.thief.x - hw / 2, game.thief.y + 34, hw, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.fillText(hint, game.thief.x, game.thief.y + 48);
    }
  }

  // --- Screens ---

  dimScreen(alpha = 0.72) {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(8, 6, 5, ${alpha})`;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  drawTitle(game) {
    this.dimScreen(0.55);
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 54px Georgia, serif';
    ctx.fillText('THE GILDED HOUR', WORLD_W / 2, 190);
    ctx.fillStyle = '#e8dcc8';
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillText('One thief. One sapphire. One very awake museum.', WORLD_W / 2, 228);
    ctx.fillStyle = '#d8cfc0';
    ctx.font = '15px sans-serif';
    const lines = [
      'WASD / arrows — move      Shift — sneak      E / right-click — toss a coin',
      'Q — smoke pellet      F (hold) — pick the Star · hack the security panel',
      'Stay out of the yellow cones. Cameras feed the alarm. Guards chase what they see.',
      'Take the Meridian Star, then slip out the green service door.',
    ];
    lines.forEach((l, i) => ctx.fillText(l, WORLD_W / 2, 300 + i * 26));
    const pulse = 0.6 + Math.sin(this.time * 3) * 0.4;
    ctx.fillStyle = `rgba(255, 209, 102, ${pulse})`;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('— press ENTER or click to begin —', WORLD_W / 2, 470);
    ctx.fillStyle = '#9a8f80';
    ctx.font = '12px sans-serif';
    ctx.fillText('M — mute · R — restart after being caught', WORLD_W / 2, 510);
  }

  drawCaught(game) {
    this.dimScreen(0.66);
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText('CAUGHT!', WORLD_W / 2, 260);
    ctx.fillStyle = '#e8dcc8';
    ctx.font = '18px sans-serif';
    ctx.fillText(`${game.caughtBy} got you by the collar. The Star stays in its case.`, WORLD_W / 2, 300);
    ctx.fillStyle = '#d8cfc0';
    ctx.font = '15px sans-serif';
    ctx.fillText(`Loot pocketed: $${game.lootValue.toLocaleString('en-US')}   ·   Time: ${game.clockText()}`, WORLD_W / 2, 340);
    const pulse = 0.6 + Math.sin(this.time * 3) * 0.4;
    ctx.fillStyle = `rgba(255, 209, 102, ${pulse})`;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('press R to try again', WORLD_W / 2, 400);
  }

  drawEscaped(game) {
    this.dimScreen(0.6);
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText('CLEAN GETAWAY', WORLD_W / 2, 230);
    ctx.fillStyle = '#e8dcc8';
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillText('The Meridian Star is yours. Dawn finds an empty case.', WORLD_W / 2, 268);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`HAUL  $${game.lootValue.toLocaleString('en-US')}`, WORLD_W / 2, 330);
    ctx.fillStyle = '#d8cfc0';
    ctx.font = '15px sans-serif';
    ctx.fillText(`Time ${game.clockText()}   ·   Spotted ${game.timesSpotted} time${game.timesSpotted === 1 ? '' : 's'}   ·   Rank: ${game.rankText()}`, WORLD_W / 2, 366);
    const pulse = 0.6 + Math.sin(this.time * 3) * 0.4;
    ctx.fillStyle = `rgba(255, 209, 102, ${pulse})`;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('press R to run it again', WORLD_W / 2, 420);
  }

  drawLockdownBanner(game) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255, 59, 48, ${0.55 + Math.sin(this.time * 10) * 0.25})`;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('— LOCKDOWN —', WORLD_W / 2, 84);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.fillText('Doors sealed. Guards converging. Stay out of sight!', WORLD_W / 2, 106);
  }
}
