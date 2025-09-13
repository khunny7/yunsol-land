import { randomUUID } from 'crypto';

interface PlayerRuntime {
  id: string;
  name: string;
  roomId: string;
  stats: { hp: number; maxHp: number; atk: number; def: number };
  inventory: any[];
  socketId?: string;
}

interface RoomRuntime {
  id: string;
  name: string;
  description: string;
  exits: Record<string, string>;
  staticFlags: Record<string, any>;
}

class RuntimeState {
  players = new Map<string, PlayerRuntime>();
  rooms = new Map<string, RoomRuntime>();
  private io: any | undefined;

  setIO(io: any) { this.io = io; }

  createOrLoadPlayer(name: string) {
    let existing = Array.from(this.players.values()).find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const player: PlayerRuntime = {
      id: randomUUID(),
      name,
      roomId: 'town_square',
      stats: { hp: 10, maxHp: 10, atk: 2, def: 0 },
      inventory: []
    };
    this.players.set(player.id, player);
    return player;
  }

  getPlayerBySocket(socketId: string) {
    return Array.from(this.players.values()).find(p => p.socketId === socketId);
  }

  movePlayer(playerId: string, targetRoomId: string) {
    const player = this.players.get(playerId);
    if (!player) return;
    const from = player.roomId;
    player.roomId = targetRoomId;
    this.broadcastRoom(from, 'player_moved', { playerId, from, to: targetRoomId });
    this.broadcastRoom(targetRoomId, 'player_moved', { playerId, from, to: targetRoomId });
    // TODO: persistence hook
  }

  broadcastRoom(roomId: string, event: string, payload: any) {
    if (this.io) this.io.to(roomId).emit(event, payload);
  }

  processScheduled(now: number) {
    // placeholder for future scheduled events
  }

  aiStep(io: any) {
    // simple AI placeholder
  }

  handleDisconnect(socketId: string) {
    const player = this.getPlayerBySocket(socketId);
    if (!player) return;
    player.socketId = undefined;
  }
}

export const runtime = new RuntimeState();
export type { PlayerRuntime, RoomRuntime };
