import fs from 'fs';
import path from 'path';
import { runtime } from '../state/runtime';

const ROOMS_FILE = path.join(__dirname, '../../seed/rooms.json');

export async function initWorld() {
  // Minimal: load rooms from JSON if exists else create a tiny map
  if (fs.existsSync(ROOMS_FILE)) {
    const raw = fs.readFileSync(ROOMS_FILE, 'utf-8');
    const rooms = JSON.parse(raw);
    for (const r of rooms) runtime.rooms.set(r.id, r);
  } else {
    const rooms = [
      { id: 'town_square', name: 'Town Square', description: 'A bright open plaza.', exits: { n: 'north_road' }, staticFlags: { safe: true } },
      { id: 'north_road', name: 'North Road', description: 'A quiet path heading north.', exits: { s: 'town_square' }, staticFlags: {} }
    ];
    runtime.rooms.set('town_square', rooms[0] as any);
    runtime.rooms.set('north_road', rooms[1] as any);
  }
}

export function getRoomSnapshot(roomId: string) {
  const room = runtime.rooms.get(roomId);
  if (!room) return null;
  return {
    id: room.id,
    name: room.name,
    description: room.description,
    exits: room.exits,
    players: Array.from(runtime.players.values()).filter(p => p.roomId === roomId).map(p => ({ id: p.id, name: p.name })),
    mobs: [] // placeholder
  };
}
