import { createServer } from 'http';
import Fastify from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { initWorld, getRoomSnapshot } from './world/loader';
import { handleCommand } from './core/commands';
import { handleEditorEvents } from './core/editor';
import { runtime } from './state/runtime';
import { startGameLoop } from './core/loop/tickLoop';

const fastify = Fastify();
const httpServer = createServer(fastify as any);
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });

fastify.get('/health', async () => ({ ok: true }));

io.on('connection', (socket) => {
  // Temporary simple join flow: client sends a name
  socket.on('login', ({ name }) => {
    let player = runtime.createOrLoadPlayer(name);
    player.socketId = socket.id;
    player.roomId = 'town_square';
    runtime.players.set(player.id, player);
    socket.join(player.roomId);
    // Emit snapshot after joining room
    const snap = getRoomSnapshot(player.roomId);
    socket.emit('bootstrap', {
      player: { id: player.id, name: player.name, roomId: player.roomId, stats: player.stats },
      room: snap
    });
  });

  socket.on('command', (raw: string) => {
    handleCommand(socket, raw);
  });

  socket.on('disconnect', () => {
    runtime.handleDisconnect(socket.id);
  });

  // Handle editor events
  handleEditorEvents(socket);
});

runtime.setIO(io);

(async () => {
  await initWorld();
  startGameLoop(io);
  const port = process.env.PORT || 3001;
  httpServer.listen(port, () => console.log(`Server listening on ${port}`));
})();
