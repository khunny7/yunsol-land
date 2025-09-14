import type { Socket } from 'socket.io';
import { runtime } from '../state/runtime';

interface MobTemplate {
  id: string;
  name: string;
  baseStats: {
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    speed: number;
  };
  aiType: string;
  respawnMs: number;
  description: string;
}

interface PlacedMob extends MobTemplate {
  roomId: string;
}

class EditorState {
  mobTemplates = new Map<string, MobTemplate>();
  placedMobs = new Map<string, PlacedMob[]>(); // roomId -> mobs

  // Mob operations
  createMob(mob: MobTemplate) {
    this.mobTemplates.set(mob.id, mob);
  }

  updateMob(mob: MobTemplate) {
    this.mobTemplates.set(mob.id, mob);
  }

  deleteMob(mobId: string) {
    this.mobTemplates.delete(mobId);
    // Remove all placed instances
    for (const [roomId, mobs] of this.placedMobs.entries()) {
      this.placedMobs.set(roomId, mobs.filter(m => m.id !== mobId));
    }
  }

  placeMobInRoom(mobId: string, roomId: string) {
    const template = this.mobTemplates.get(mobId);
    if (!template) return;

    const placedMob: PlacedMob = { ...template, roomId };
    const roomMobs = this.placedMobs.get(roomId) || [];
    roomMobs.push(placedMob);
    this.placedMobs.set(roomId, roomMobs);
  }

  removePlacedMob(mobId: string, roomId: string) {
    const roomMobs = this.placedMobs.get(roomId) || [];
    const index = roomMobs.findIndex(m => m.id === mobId);
    if (index !== -1) {
      roomMobs.splice(index, 1);
      this.placedMobs.set(roomId, roomMobs);
    }
  }

  getAllMobTemplates(): MobTemplate[] {
    return Array.from(this.mobTemplates.values());
  }

  getAllPlacedMobs(): PlacedMob[] {
    const allMobs: PlacedMob[] = [];
    for (const mobs of this.placedMobs.values()) {
      allMobs.push(...mobs);
    }
    return allMobs;
  }
}

const editorState = new EditorState();

export function handleEditorEvents(socket: Socket) {
  // Room operations
  socket.on('editor:getRooms', () => {
    const rooms = Array.from(runtime.rooms.values());
    socket.emit('editor:roomsData', rooms);
  });

  socket.on('editor:updateRoom', (roomData: any) => {
    runtime.rooms.set(roomData.id, roomData);
    console.log('Updated room:', roomData.id);
  });

  socket.on('editor:deleteRoom', (roomId: string) => {
    runtime.rooms.delete(roomId);
    console.log('Deleted room:', roomId);
  });

  socket.on('editor:saveMap', (rooms: any[]) => {
    // Clear existing rooms and replace with new ones
    runtime.rooms.clear();
    rooms.forEach(room => {
      runtime.rooms.set(room.id, {
        id: room.id,
        name: room.name,
        description: room.description,
        exits: room.exits,
        staticFlags: room.staticFlags || {}
      });
    });
    console.log('Saved map with', rooms.length, 'rooms');
  });

  // Mob operations
  socket.on('editor:getMobs', () => {
    socket.emit('editor:mobsData', editorState.getAllMobTemplates());
  });

  socket.on('editor:getPlacedMobs', () => {
    socket.emit('editor:placedMobsData', editorState.getAllPlacedMobs());
  });

  socket.on('editor:createMob', (mobData: MobTemplate) => {
    editorState.createMob(mobData);
    console.log('Created mob template:', mobData.id);
  });

  socket.on('editor:updateMob', (mobData: MobTemplate) => {
    editorState.updateMob(mobData);
    console.log('Updated mob template:', mobData.id);
  });

  socket.on('editor:deleteMob', (mobId: string) => {
    editorState.deleteMob(mobId);
    console.log('Deleted mob template:', mobId);
  });

  socket.on('editor:placeMob', ({ mobId, roomId }: { mobId: string; roomId: string }) => {
    editorState.placeMobInRoom(mobId, roomId);
    console.log('Placed mob', mobId, 'in room', roomId);
  });

  socket.on('editor:removePlacedMob', ({ mobId, roomId }: { mobId: string; roomId: string }) => {
    editorState.removePlacedMob(mobId, roomId);
    console.log('Removed mob', mobId, 'from room', roomId);
  });
}

export { editorState };
export type { MobTemplate, PlacedMob };