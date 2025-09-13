import { parseCommand } from './parser';
import type { Socket } from 'socket.io';
import { runtime } from '../../state/runtime';
import { moveCommand } from './verbs/move';
import { sayCommand } from './verbs/say';

const registry: Record<string, (ctx: CommandContext) => void> = {
  move: moveCommand,
  say: sayCommand,
};

export interface CommandContext {
  socket: Socket;
  player: any; // refine later
  args: string[];
  raw: string;
}

export function handleCommand(socket: Socket, raw: string) {
  const parsed = parseCommand(raw);
  const player = runtime.getPlayerBySocket(socket.id);
  if (!player) {
    socket.emit('error', { reason: 'not_logged_in' });
    return;
  }
  const fn = registry[parsed.verb];
  if (!fn) {
    socket.emit('error', { reason: 'unknown_command' });
    return;
  }
  fn({ socket, player, args: parsed.args, raw });
}
