// Shots: deterministic staged states for screenshots, driven by the
// page's `?shot=` query. Each one puts the game in a readable moment —
// title, mid-heist, high alarm, getaway — so the screenshots show the
// whole game at a glance. Nothing here runs during normal play.

import { TUNE } from './config.js';
import { PHASES } from './game.js';

export const SHOT_NAMES = ['start', 'play', 'alarm', 'win'];

// Put the game into the staged state for `name`, then freeze it there
// (the render loop keeps drawing, but the simulation does not advance).
export function applyShot(game, name) {
  const g = game;
  if (name === 'start') {
    g.reset();
    g.phase = PHASES.TITLE;
    return;
  }

  g.reset();
  g.phase = PHASES.PLAYING;
  g.startedAt = 0;

  if (name === 'play') {
    // Mid-heist: the thief is crossing the central hall, one guard's cone
    // sweeping close, a painting already pocketed, alarm ticking up.
    g.thief.x = 560;
    g.thief.y = 470;
    g.thief.facing = -Math.PI / 2;
    g.thief.coins = 2;
    g.thief.smokes = 1;
    g.level.loot[0].taken = true;
    g.lootValue = 8000;
    g.alarm = 34;
    g.elapsed = 74;
    g.timesSpotted = 1;
    // Marlow patrols the hall right above the thief.
    const marlow = g.guards[0];
    marlow.x = 640;
    marlow.y = 330;
    marlow.angle = Math.PI * 0.72;
    marlow.state = 'patrol';
    // Petra watches the west wing; Okafor sweeps the east.
    g.guards[1].x = 220;
    g.guards[1].y = 300;
    g.guards[1].angle = Math.PI / 2;
    g.guards[2].x = 1030;
    g.guards[2].y = 420;
    g.guards[2].angle = -Math.PI / 2;
    // A smoke pellet hangs in the east doorway.
    g.smokeClouds.push({ x: 868, y: 300, radius: TUNE.smokeRadius, ttl: 4 });
  } else if (name === 'alarm') {
    // High alarm: the thief is at the star's case, Marlow has spotted him
    // and is closing in, a camera cone is red, lockdown is one breath away.
    g.thief.x = 640;
    g.thief.y = 250;
    g.thief.facing = -Math.PI / 2;
    g.thief.pickTimer = 1.1;
    g.thief.coins = 1;
    g.thief.smokes = 0;
    g.level.loot[0].taken = true;
    g.level.loot[3].taken = true;
    g.lootValue = 11500;
    g.alarm = 82;
    g.elapsed = 132;
    g.timesSpotted = 4;
    const marlow = g.guards[0];
    marlow.x = 640;
    marlow.y = 420;
    marlow.angle = -Math.PI / 2;
    marlow.state = 'chase';
    marlow.seesThief = true;
    marlow.lastSeen = { x: 640, y: 250 };
    g.guards[1].x = 300;
    g.guards[1].y = 480;
    g.guards[1].angle = 0;
    g.guards[1].state = 'suspicious';
    g.guards[1].suspicion = 1;
    g.guards[2].x = 980;
    g.guards[2].y = 300;
    g.guards[2].angle = Math.PI;
    const cam = g.cameras[0];
    cam.angle = Math.PI / 2 + 0.35;
    cam.seesThief = true;
  } else if (name === 'win') {
    // The getaway: star taken, thief at the service door, getaway screen up.
    g.thief.x = 640;
    g.thief.y = 668;
    g.thief.facing = Math.PI / 2;
    g.level.star.taken = true;
    g.level.loot[0].taken = true;
    g.level.loot[1].taken = true;
    g.level.loot[4].taken = true;
    g.lootValue = 50000 + 8000 + 8000 + 6000;
    g.alarm = 18;
    g.elapsed = 187;
    g.timesSpotted = 2;
    g.phase = PHASES.ESCAPED;
    g.guards[0].x = 700;
    g.guards[0].y = 480;
    g.guards[0].angle = Math.PI / 2;
    g.guards[1].x = 200;
    g.guards[1].y = 200;
    g.guards[2].x = 1100;
    g.guards[2].y = 500;
  } else {
    g.reset();
    g.phase = PHASES.TITLE;
  }
  // Freeze the staged moment: the update loop skips while frozen, so the
  // screenshot is exactly the staged frame.
  g.frozen = true;
}
