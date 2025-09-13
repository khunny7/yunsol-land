import type { CommandContext } from '../index';
import { runtime } from '../../../state/runtime';
import { getRoomSnapshot } from '../../../world/loader';
import { log } from '../../../util/logger';

export function moveCommand(ctx: CommandContext) {
  log('moveCommand args:', ctx.args);
  const rawDir = ctx.args[0];
  if (!rawDir) {
    ctx.socket.emit('error', { reason: 'missing_direction' });
    return;
  }
  const dirMap: Record<string,string> = { n:'n', north:'n', s:'s', south:'s', e:'e', east:'e', w:'w', west:'w' };
  const dir = dirMap[rawDir.toLowerCase()];
  if (!dir) {
    ctx.socket.emit('error', { reason: 'invalid_direction' });
    return;
  }
  const player = ctx.player;
  const currentRoom = runtime.rooms.get(player.roomId);
  if (!currentRoom) return;
  const targetId = currentRoom.exits[dir];
  if (!targetId) {
    ctx.socket.emit('error', { reason: 'no_exit' });
    return;
  }
  const from = player.roomId;
  // Perform move while still in the old room so we get the broadcast for self
  runtime.movePlayer(player.id, targetId); // broadcasts player_moved to from & to
  // Now swap socket rooms
  ctx.socket.leave(from);
  ctx.socket.join(targetId);
  // Emit fresh snapshot to mover
  const snap = getRoomSnapshot(targetId);
  if (snap) {
    ctx.socket.emit('room_snapshot', snap);
  }
}
