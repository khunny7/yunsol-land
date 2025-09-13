export interface PlayerRef {
  id: string;
  name: string;
}
export interface RoomSnapshot {
  id: string;
  name: string;
  description: string;
  exits: Record<string,string>;
  players: PlayerRef[];
  mobs: any[];
}
