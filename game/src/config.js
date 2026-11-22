// The Gilded Hour — tuning constants and the museum floor plan.
// Everything in the level (walls, cases, loot, patrols, cameras) is data
// here, so the level can be reshaped without touching the game logic.

export const WORLD_W = 1280;
export const WORLD_H = 720;

export const TUNE = {
  playerWalk: 165,
  playerSneak: 92,
  playerRadius: 13,
  guardPatrolSpeed: 58,
  guardChaseSpeed: 108,
  guardVisionRange: 215,
  guardVisionHalfAngle: 0.56, // ~32 degrees each side
  guardHearing: 270,
  guardCatchDistance: 24,
  cameraRange: 265,
  cameraHalfAngle: 0.44,
  cameraSweep: 0.55, // radians per second
  alarmGuardRate: 30, // per second while a guard has eyes on the thief
  alarmCameraRate: 22,
  alarmDecay: 6,
  alarmLockdownAt: 100,
  lockdownSeconds: 10,
  starPickSeconds: 2.4,
  panelHackSeconds: 1.6,
  cameraOffSeconds: 12,
  smokeSeconds: 6,
  smokeRadius: 95,
  coinCount: 3,
  smokeCount: 2,
};

// Rectangles are { x, y, w, h }. Walls block movement and sight.
// Cover blocks (cases, pillars) block movement and sight too.
// Ropes block movement only: you can be seen over them, but not cross them.
export const LEVEL = {
  walls: [
    // Outer shell.
    { x: 0, y: 0, w: 1280, h: 24 },
    { x: 0, y: 696, w: 600, h: 24 },
    { x: 680, y: 696, w: 600, h: 24 },
    { x: 0, y: 0, w: 24, h: 720 },
    { x: 1256, y: 0, w: 24, h: 720 },
    // West / central divider: two doorways (top and bottom gaps).
    { x: 400, y: 24, w: 24, h: 216 },
    { x: 400, y: 360, w: 24, h: 160 },
    { x: 400, y: 620, w: 24, h: 76 },
    // East / central divider, mirrored.
    { x: 856, y: 24, w: 24, h: 216 },
    { x: 856, y: 360, w: 24, h: 160 },
    { x: 856, y: 620, w: 24, h: 76 },
    // A short stub wall under the star balcony, making two approach lanes.
    { x: 560, y: 96, w: 20, h: 84 },
    { x: 700, y: 96, w: 20, h: 84 },
  ],
  cover: [
    // Display cases (west wing).
    { x: 96, y: 140, w: 110, h: 54, label: 'case' },
    { x: 96, y: 500, w: 110, h: 54, label: 'case' },
    { x: 250, y: 320, w: 54, h: 110, label: 'case' },
    // Display cases (east wing).
    { x: 1074, y: 140, w: 110, h: 54, label: 'case' },
    { x: 1074, y: 500, w: 110, h: 54, label: 'case' },
    { x: 976, y: 320, w: 54, h: 110, label: 'case' },
    // Pillars in the central hall.
    { x: 528, y: 372, w: 34, h: 34, label: 'pillar' },
    { x: 718, y: 372, w: 34, h: 34, label: 'pillar' },
    { x: 528, y: 540, w: 34, h: 34, label: 'pillar' },
    { x: 718, y: 540, w: 34, h: 34, label: 'pillar' },
    // The star's own plinth.
    { x: 622, y: 158, w: 36, h: 36, label: 'plinth' },
  ],
  ropes: [
    // Velvet rope ring around the star, open at the bottom.
    { x: 540, y: 120, w: 200, h: 6 },
    { x: 540, y: 120, w: 6, h: 110 },
    { x: 734, y: 120, w: 6, h: 110 },
    // Rope queue in front of the west painting.
    { x: 96, y: 250, w: 110, h: 6 },
    // Rope queue in front of the east painting.
    { x: 1074, y: 250, w: 110, h: 6 },
  ],
  // The Meridian Star, the one piece the job is about.
  star: { x: 640, y: 176, value: 50000 },
  // Optional side loot: walk over it to pocket it.
  loot: [
    { id: 'painting-west', kind: 'painting', x: 150, y: 218, value: 8000, name: 'Portrait of Lady Maren' },
    { id: 'painting-east', kind: 'painting', x: 1130, y: 218, value: 8000, name: 'The Blue Regatta' },
    { id: 'coins-west', kind: 'coins', x: 150, y: 590, value: 3500, name: 'Coin tray' },
    { id: 'coins-east', kind: 'coins', x: 1130, y: 590, value: 3500, name: 'Coin tray' },
    { id: 'vase-south', kind: 'vase', x: 640, y: 620, value: 6000, name: 'Celadon vase' },
  ],
  // The security panel: hold F beside it to kill the cameras for a while.
  panel: { x: 742, y: 40, w: 44, h: 18 },
  // The way out: the service door in the south wall.
  exit: { x: 600, y: 692, w: 80, h: 28 },
  playerStart: { x: 640, y: 660 },
  guards: [
    {
      name: 'Marlow',
      color: '#e8b64c',
      waypoints: [
        { x: 470, y: 300 },
        { x: 810, y: 300 },
        { x: 810, y: 580 },
        { x: 470, y: 580 },
      ],
    },
    {
      name: 'Petra',
      color: '#7fb3e8',
      waypoints: [
        { x: 110, y: 110 },
        { x: 330, y: 110 },
        { x: 330, y: 620 },
        { x: 110, y: 620 },
      ],
    },
    {
      name: 'Okafor',
      color: '#e87f8a',
      waypoints: [
        { x: 1170, y: 110 },
        { x: 950, y: 110 },
        { x: 950, y: 620 },
        { x: 1170, y: 620 },
      ],
    },
  ],
  cameras: [
    { id: 'cam-west', x: 500, y: 30, baseAngle: Math.PI / 2, sweep: 0.9, phase: 0 },
    { id: 'cam-east', x: 780, y: 30, baseAngle: Math.PI / 2, sweep: 0.9, phase: 1.7 },
  ],
};
