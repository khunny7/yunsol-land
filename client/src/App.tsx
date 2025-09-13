import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoomStage } from './components/RoomStage';

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
  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 480 });
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

  useEffect(() => {
    if (room) {
      console.log('App room state updated:', room);
    }
  }, [room]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 700) {
        setCanvasSize({ width: window.innerWidth, height: window.innerHeight * 0.5 });
      } else {
        setCanvasSize({ width: 640, height: 480 });
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function appendLog(line: string) { setLog(l => [...l, line]); }

  function doLogin() {
    console.log('Login button clicked', { nameInput, socket, connected });
    if (!connected || !socket) {
      appendLog('Socket not connected.');
      return;
    }
    socket.emit('login', { name: nameInput || 'Guest' + Math.floor(Math.random()*1000) });
  }

  function doLogout() {
    setPlayer(null);
    setRoom(null);
    setLog([]);
    setNameInput('');
    setCmd('');
    socket?.disconnect();
    setSocket(null);
    setConnected(false);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'monospace' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#222' }}>
        {room ? (
          <RoomStage room={room} playerId={player?.id || null} width={canvasSize.width} height={canvasSize.height} />
        ) : (
          <div style={{ width: canvasSize.width, height: canvasSize.height, background: '#222', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            No room data
          </div>
        )}
      </div>
      <div style={{ width: '100%', background: '#181818', color: '#eee', padding: 12, boxSizing: 'border-box' }}>
        {!player && (
          <div style={{ padding: 8, display: 'flex', gap: 8 }}>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Name" />
            <button onClick={doLogin} disabled={!connected}>Login</button>
          </div>
        )}
        {player && (
          <button onClick={doLogout} style={{ marginBottom: 8 }}>Logout</button>
        )}
        {player && room && (
          <div style={{ marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>{room.name}</h3>
            <p style={{ margin: '4px 0' }}>{room.description}</p>
            <div>Exits: {exitButtons()}</div>
            <div>Players: {room.players.map(p => p.name).join(', ')}</div>
          </div>
        )}
        <div ref={logRef} style={{ maxHeight: 120, overflow: 'auto', background: '#111', color: '#ddd', padding: 8, marginBottom: 8 }}>
          {log.map((l,i) => <div key={i}>{l}</div>)}
        </div>
        {player && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1 }} value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendCommand(); }} />
            <button onClick={sendCommand}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
};
