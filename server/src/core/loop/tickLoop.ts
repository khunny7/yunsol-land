import type { Server } from 'socket.io';
import { runtime } from '../../state/runtime';

const TICK_MS = 250;
let tickCounter = 0;
let lastTime = Date.now();

export function startGameLoop(io: Server) {
  setInterval(() => {
    const now = Date.now();
    const dt = now - lastTime; // ms
    lastTime = now;
    tickCounter++;

    // Process cooldowns / scheduled events
    runtime.processScheduled(now);

    // AI every 1000ms approx
    if (tickCounter % (1000 / TICK_MS) === 0) {
      runtime.aiStep(io);
    }
  }, TICK_MS);
}
