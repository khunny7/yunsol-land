import type { CommandContext } from '../index';
import { runtime } from '../../../state/runtime';

export function sayCommand(ctx: CommandContext) {
  const text = ctx.args.join(' ');
  if (!text) {
    ctx.socket.emit('error', { reason: 'empty_message' });
    return;
  }
  const player = ctx.player;
  runtime.broadcastRoom(player.roomId, 'room_message', { from: player.name, text });
}
