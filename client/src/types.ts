export interface PlayerRef {
  id: string;
  name: string;
}

export interface MobRef {
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
  description?: string;
}

export interface RoomSnapshot {
  id: string;
  name: string;
  description: string;
  exits: Record<string,string>;
  players: PlayerRef[];
  mobs: MobRef[];
}

export interface RoomData {
  id: string;
  name: string;
  description: string;
  exits: Record<string, string>;
  staticFlags: Record<string, any>;
}

export type AppMode = 'game' | 'mapEditor' | 'mobEditor';
