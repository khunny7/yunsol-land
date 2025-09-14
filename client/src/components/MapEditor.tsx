import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import * as PIXI from 'pixi.js';
import { RoomData } from '../types';

interface Props {
  socket: Socket | null;
}

interface EditorRoom extends RoomData {
  x: number;
  y: number;
}

export const MapEditor: React.FC<Props> = ({ socket }) => {
  const [rooms, setRooms] = useState<EditorRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<EditorRoom | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isConnectingRooms, setIsConnectingRooms] = useState(false);
  const [connectionStart, setConnectionStart] = useState<EditorRoom | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const roomSpritesRef = useRef<Map<string, PIXI.Graphics>>(new Map());

  // Initialize PIXI
  useEffect(() => {
    let mounted = true;
    async function setup() {
      if (!containerRef.current || appRef.current) return;
      const app = new PIXI.Application();
      await app.init({ width: 800, height: 600, backgroundColor: 0x2c3e50, antialias: true });
      
      if (mounted && containerRef.current) {
        appRef.current = app;
        containerRef.current.appendChild(app.canvas as HTMLCanvasElement);
        
        // Enable interaction
        app.stage.eventMode = 'static';
        app.stage.hitArea = app.screen;
        
        // Handle clicks for creating rooms
        app.stage.on('pointerdown', handleCanvasClick);
      }
    }
    setup();
    return () => { 
      mounted = false; 
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  // Load existing rooms
  useEffect(() => {
    if (socket) {
      socket.emit('editor:getRooms');
      socket.on('editor:roomsData', (roomsData: RoomData[]) => {
        // Position rooms in a grid if they don't have positions
        const editorRooms: EditorRoom[] = roomsData.map((room, index) => ({
          ...room,
          x: (index % 4) * 150 + 100,
          y: Math.floor(index / 4) * 150 + 100
        }));
        setRooms(editorRooms);
      });
    }
    
    return () => {
      if (socket) {
        socket.off('editor:roomsData');
      }
    };
  }, [socket]);

  // Render rooms when they change
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    // Clear existing sprites
    app.stage.removeChildren();
    roomSpritesRef.current.clear();

    // Draw connections first (so they appear behind rooms)
    rooms.forEach(room => {
      Object.entries(room.exits).forEach(([direction, targetRoomId]) => {
        const targetRoom = rooms.find(r => r.id === targetRoomId);
        if (targetRoom) {
          drawConnection(app, room, targetRoom, direction);
        }
      });
    });

    // Draw rooms
    rooms.forEach(room => {
      const sprite = drawRoom(app, room);
      roomSpritesRef.current.set(room.id, sprite);
    });
  }, [rooms]);

  const handleCanvasClick = (event: PIXI.FederatedPointerEvent) => {
    if (!isCreatingRoom) return;
    
    const point = event.global;
    createNewRoom(point.x, point.y);
    setIsCreatingRoom(false);
  };

  const createNewRoom = (x: number, y: number) => {
    const newRoom: EditorRoom = {
      id: `room_${Date.now()}`,
      name: `New Room`,
      description: 'A new room',
      exits: {},
      staticFlags: {},
      x,
      y
    };
    
    setRooms(prev => [...prev, newRoom]);
    setSelectedRoom(newRoom);
    setEditForm({ name: newRoom.name, description: newRoom.description });
  };

  const drawRoom = (app: PIXI.Application, room: EditorRoom): PIXI.Graphics => {
    const graphics = new PIXI.Graphics();
    
    // Room circle
    const isSelected = selectedRoom?.id === room.id;
    graphics.beginFill(isSelected ? 0x3498db : 0x34495e);
    graphics.lineStyle(2, isSelected ? 0xe74c3c : 0x7f8c8d);
    graphics.drawCircle(0, 0, 30);
    graphics.endFill();
    
    // Room name
    const text = new PIXI.Text(room.name, { 
      fontSize: 10, 
      fill: 0xffffff,
      wordWrap: true,
      wordWrapWidth: 80,
      align: 'center'
    });
    text.anchor.set(0.5, 0);
    text.y = 35;
    graphics.addChild(text);
    
    graphics.position.set(room.x, room.y);
    graphics.eventMode = 'static';
    graphics.cursor = 'pointer';
    
    // Handle room selection
    graphics.on('pointerdown', (e) => {
      e.stopPropagation();
      if (isConnectingRooms && connectionStart) {
        connectRooms(connectionStart, room);
        setIsConnectingRooms(false);
        setConnectionStart(null);
      } else if (isConnectingRooms) {
        setConnectionStart(room);
      } else {
        setSelectedRoom(room);
        setEditForm({ name: room.name, description: room.description });
      }
    });
    
    app.stage.addChild(graphics);
    return graphics;
  };

  const drawConnection = (app: PIXI.Application, from: EditorRoom, to: EditorRoom, direction: string) => {
    const line = new PIXI.Graphics();
    line.lineStyle(2, 0x95a5a6);
    line.moveTo(from.x, from.y);
    line.lineTo(to.x, to.y);
    
    // Direction label
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const text = new PIXI.Text(direction, { fontSize: 8, fill: 0x95a5a6 });
    text.position.set(midX, midY);
    text.anchor.set(0.5);
    
    app.stage.addChild(line);
    app.stage.addChild(text);
  };

  const connectRooms = (from: EditorRoom, to: EditorRoom) => {
    if (from.id === to.id) return;
    
    // Simple direction naming based on relative position
    const direction = to.x > from.x ? 'e' : to.x < from.x ? 'w' : to.y > from.y ? 's' : 'n';
    const oppositeDirection = direction === 'e' ? 'w' : direction === 'w' ? 'e' : direction === 's' ? 'n' : 's';
    
    // Update rooms with new connections
    setRooms(prev => prev.map(room => {
      if (room.id === from.id) {
        return { ...room, exits: { ...room.exits, [direction]: to.id } };
      }
      if (room.id === to.id) {
        return { ...room, exits: { ...room.exits, [oppositeDirection]: from.id } };
      }
      return room;
    }));
  };

  const saveRoom = () => {
    if (!selectedRoom) return;
    
    const updatedRoom = {
      ...selectedRoom,
      name: editForm.name,
      description: editForm.description
    };
    
    setRooms(prev => prev.map(room => 
      room.id === selectedRoom.id ? updatedRoom : room
    ));
    
    setSelectedRoom(updatedRoom);
    
    // Send to server
    socket?.emit('editor:updateRoom', updatedRoom);
  };

  const deleteRoom = () => {
    if (!selectedRoom) return;
    
    setRooms(prev => prev.filter(room => room.id !== selectedRoom.id));
    socket?.emit('editor:deleteRoom', selectedRoom.id);
    setSelectedRoom(null);
  };

  const saveMap = () => {
    socket?.emit('editor:saveMap', rooms);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'monospace' }}>
      {/* Canvas */}
      <div style={{ flex: 1, background: '#34495e' }}>
        <div ref={containerRef} />
      </div>
      
      {/* Control Panel */}
      <div style={{ width: 300, background: '#2c3e50', color: '#ecf0f1', padding: 16 }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Map Editor</h3>
        
        <div style={{ marginBottom: 16 }}>
          <button 
            onClick={() => setIsCreatingRoom(!isCreatingRoom)}
            style={{ 
              background: isCreatingRoom ? '#e74c3c' : '#3498db', 
              color: 'white', 
              border: 'none', 
              padding: '8px 16px',
              marginRight: 8,
              cursor: 'pointer'
            }}
          >
            {isCreatingRoom ? 'Cancel' : 'Add Room'}
          </button>
          
          <button 
            onClick={() => setIsConnectingRooms(!isConnectingRooms)}
            style={{ 
              background: isConnectingRooms ? '#e74c3c' : '#27ae60', 
              color: 'white', 
              border: 'none', 
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            {isConnectingRooms ? 'Cancel' : 'Connect Rooms'}
          </button>
        </div>

        <button 
          onClick={saveMap}
          style={{ 
            background: '#f39c12', 
            color: 'white', 
            border: 'none', 
            padding: '8px 16px',
            marginBottom: 16,
            cursor: 'pointer'
          }}
        >
          Save Map
        </button>

        {isConnectingRooms && (
          <div style={{ background: '#34495e', padding: 8, marginBottom: 16, fontSize: 12 }}>
            {connectionStart ? 'Click destination room' : 'Click first room to connect'}
          </div>
        )}
        
        {selectedRoom && (
          <div>
            <h4 style={{ margin: '0 0 8px 0' }}>Edit Room</h4>
            
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Name:</label>
              <input 
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                style={{ width: '100%', padding: 4, background: '#34495e', color: '#ecf0f1', border: '1px solid #7f8c8d' }}
              />
            </div>
            
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Description:</label>
              <textarea 
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                style={{ width: '100%', height: 60, padding: 4, background: '#34495e', color: '#ecf0f1', border: '1px solid #7f8c8d', resize: 'vertical' }}
              />
            </div>
            
            <div style={{ marginBottom: 8 }}>
              <button 
                onClick={saveRoom}
                style={{ background: '#27ae60', color: 'white', border: 'none', padding: '6px 12px', marginRight: 8, cursor: 'pointer' }}
              >
                Save
              </button>
              
              <button 
                onClick={deleteRoom}
                style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
            
            <div style={{ fontSize: 12, color: '#bdc3c7' }}>
              <strong>ID:</strong> {selectedRoom.id}<br/>
              <strong>Exits:</strong> {Object.keys(selectedRoom.exits).join(', ') || 'None'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};