import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Player { id: string; name: string; roomId: string; stats: any; }
interface RoomSnapshot { id: string; name: string; description: string; exits: Record<string,string>; players: {id:string;name:string}[]; mobs: any[]; }

export const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [cmd, setCmd] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = io('http://localhost:3001');
    setSocket(s);
    s.on('connect', () => setConnected(true));
    s.on('bootstrap', (data) => {
      setPlayer(data.player);
      setRoom(data.room);
      appendLog(`Entered ${data.room.name}`);
    });
    s.on('room_message', (m) => appendLog(`[${m.from}] ${m.text}`));
    s.on('player_moved', ({ playerId, from, to }) => {
      if (playerId === player?.id) {
        appendLog(`You moved to ${to}`);
      } else {
        appendLog(`Player ${playerId} moved.`);
      }
    });
    s.on('room_snapshot', (snap) => {
      setRoom(snap);
      appendLog(`Entered ${snap.name}`);
    });
    s.on('error', (e) => appendLog(`Error: ${e.reason}`));
    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  function appendLog(line: string) { setLog(l => [...l, line]); }

  function doLogin() {
    socket?.emit('login', { name: nameInput || 'Guest' + Math.floor(Math.random()*1000) });
  }

  function sendCommand() {
    if (!cmd.trim()) return;
    socket?.emit('command', cmd);
    setCmd('');
  }

  function exitButtons() {
    if (!room) return null;
    return Object.keys(room.exits).map(d => <button key={d} onClick={() => socket?.emit('command', d)}>{d}</button>);
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'monospace' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!player && (
          <div style={{ padding: 8 }}>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Name" />
            <button onClick={doLogin} disabled={!connected}>Login</button>
          </div>
        )}
        {player && room && (
          <div style={{ padding: 8 }}>
            <h3>{room.name}</h3>
            <p>{room.description}</p>
            <div>Exits: {exitButtons()}</div>
            <div>Players: {room.players.map(p => p.name).join(', ')}</div>
          </div>
        )}
        <div ref={logRef} style={{ flex: 1, overflow: 'auto', background: '#111', color: '#ddd', padding: 8 }}>
          {log.map((l,i) => <div key={i}>{l}</div>)}
        </div>
        {player && (
          <div style={{ padding: 8 }}>
            <input style={{ width: '80%' }} value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendCommand(); }} />
            <button onClick={sendCommand}>Send</button>
          </div>
        )}
      </div>
      <div style={{ width: 300, borderLeft: '1px solid #333', padding: 8 }}>
        <h4>Status</h4>
        {player && <div>HP: {player.stats.hp}/{player.stats.maxHp}</div>}
      </div>
    </div>
  );
};
