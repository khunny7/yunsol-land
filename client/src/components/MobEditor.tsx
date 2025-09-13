import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { MobRef, RoomData } from '../types';

interface Props {
  socket: Socket | null;
}

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

export const MobEditor: React.FC<Props> = ({ socket }) => {
  const [mobTemplates, setMobTemplates] = useState<MobTemplate[]>([]);
  const [placedMobs, setPlacedMobs] = useState<PlacedMob[]>([]);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MobTemplate | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    hp: 10,
    atk: 2,
    def: 0,
    speed: 1,
    aiType: 'wander',
    respawnMs: 30000
  });

  // Load data on mount
  useEffect(() => {
    if (socket) {
      socket.emit('editor:getMobs');
      socket.emit('editor:getRooms');
      socket.emit('editor:getPlacedMobs');
      
      socket.on('editor:mobsData', setMobTemplates);
      socket.on('editor:roomsData', setRooms);
      socket.on('editor:placedMobsData', setPlacedMobs);
    }
    
    return () => {
      if (socket) {
        socket.off('editor:mobsData');
        socket.off('editor:roomsData');
        socket.off('editor:placedMobsData');
      }
    };
  }, [socket]);

  const createMobTemplate = () => {
    const newMob: MobTemplate = {
      id: `mob_${Date.now()}`,
      name: editForm.name || 'New Mob',
      baseStats: {
        hp: editForm.hp,
        maxHp: editForm.hp,
        atk: editForm.atk,
        def: editForm.def,
        speed: editForm.speed
      },
      aiType: editForm.aiType,
      respawnMs: editForm.respawnMs,
      description: editForm.description
    };

    setMobTemplates(prev => [...prev, newMob]);
    socket?.emit('editor:createMob', newMob);
    setIsCreating(false);
    resetForm();
  };

  const updateMobTemplate = () => {
    if (!selectedTemplate) return;

    const updatedMob: MobTemplate = {
      ...selectedTemplate,
      name: editForm.name,
      baseStats: {
        hp: editForm.hp,
        maxHp: editForm.hp,
        atk: editForm.atk,
        def: editForm.def,
        speed: editForm.speed
      },
      aiType: editForm.aiType,
      respawnMs: editForm.respawnMs,
      description: editForm.description
    };

    setMobTemplates(prev => prev.map(mob => 
      mob.id === selectedTemplate.id ? updatedMob : mob
    ));
    socket?.emit('editor:updateMob', updatedMob);
    setSelectedTemplate(updatedMob);
  };

  const deleteMobTemplate = () => {
    if (!selectedTemplate) return;
    
    setMobTemplates(prev => prev.filter(mob => mob.id !== selectedTemplate.id));
    socket?.emit('editor:deleteMob', selectedTemplate.id);
    setSelectedTemplate(null);
    resetForm();
  };

  const placeMobInRoom = () => {
    if (!selectedTemplate || !selectedRoom) return;

    const placedMob: PlacedMob = {
      ...selectedTemplate,
      roomId: selectedRoom
    };

    setPlacedMobs(prev => [...prev, placedMob]);
    socket?.emit('editor:placeMob', { mobId: selectedTemplate.id, roomId: selectedRoom });
  };

  const removePlacedMob = (mobId: string, roomId: string) => {
    setPlacedMobs(prev => prev.filter(mob => !(mob.id === mobId && mob.roomId === roomId)));
    socket?.emit('editor:removePlacedMob', { mobId, roomId });
  };

  const selectTemplate = (template: MobTemplate) => {
    setSelectedTemplate(template);
    setEditForm({
      name: template.name,
      description: template.description,
      hp: template.baseStats.hp,
      atk: template.baseStats.atk,
      def: template.baseStats.def,
      speed: template.baseStats.speed,
      aiType: template.aiType,
      respawnMs: template.respawnMs
    });
    setIsCreating(false);
  };

  const startCreating = () => {
    setIsCreating(true);
    setSelectedTemplate(null);
    resetForm();
  };

  const resetForm = () => {
    setEditForm({
      name: '',
      description: '',
      hp: 10,
      atk: 2,
      def: 0,
      speed: 1,
      aiType: 'wander',
      respawnMs: 30000
    });
  };

  const getRoomName = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    return room ? room.name : roomId;
  };

  const getMobsInRoom = (roomId: string) => {
    return placedMobs.filter(mob => mob.roomId === roomId);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'monospace', background: '#2c3e50' }}>
      {/* Left Panel - Mob Templates */}
      <div style={{ width: 300, background: '#34495e', color: '#ecf0f1', padding: 16, overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Mob Templates</h3>
        
        <button 
          onClick={startCreating}
          style={{ 
            width: '100%',
            background: '#3498db', 
            color: 'white', 
            border: 'none', 
            padding: '8px 16px',
            marginBottom: 16,
            cursor: 'pointer'
          }}
        >
          Create New Mob
        </button>

        <div style={{ marginBottom: 16 }}>
          {mobTemplates.map(template => (
            <div 
              key={template.id}
              onClick={() => selectTemplate(template)}
              style={{ 
                background: selectedTemplate?.id === template.id ? '#3498db' : '#2c3e50',
                padding: 8, 
                marginBottom: 8, 
                cursor: 'pointer',
                border: '1px solid #7f8c8d'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{template.name}</div>
              <div style={{ fontSize: 12, color: '#bdc3c7' }}>
                HP: {template.baseStats.hp} | ATK: {template.baseStats.atk} | AI: {template.aiType}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Panel - Editor Form */}
      <div style={{ width: 350, background: '#2c3e50', color: '#ecf0f1', padding: 16, overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 16px 0' }}>
          {isCreating ? 'Create Mob' : selectedTemplate ? 'Edit Mob' : 'Select a Mob'}
        </h3>

        {(isCreating || selectedTemplate) && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Name:</label>
              <input 
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                style={{ width: '100%', padding: 6, background: '#34495e', color: '#ecf0f1', border: '1px solid #7f8c8d' }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Description:</label>
              <textarea 
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                style={{ width: '100%', height: 60, padding: 6, background: '#34495e', color: '#ecf0f1', border: '1px solid #7f8c8d', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>HP:</label>
                <input 
                  type="number"
                  value={editForm.hp}
                  onChange={(e) => setEditForm(prev => ({ ...prev, hp: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: 6, background: '#34495e', color: '#ecf0f1', border: '1px solid #7f8c8d' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Attack:</label>
                <input 
                  type="number"
                  value={editForm.atk}
                  onChange={(e) => setEditForm(prev => ({ ...prev, atk: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: 6, background: '#34495e', color: '#ecf0f1', border: '1px solid #7f8c8d' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Defense:</label>
                <input 
                  type="number"
                  value={editForm.def}
                  onChange={(e) => setEditForm(prev => ({ ...prev, def: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: 6, background: '#34495e', color: '#ecf0f1', border: '1px solid #7f8c8d' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Speed:</label>
                <input 
                  type="number"
                  value={editForm.speed}
                  onChange={(e) => setEditForm(prev => ({ ...prev, speed: parseInt(e.target.value) || 1 }))}
                  style={{ width: '100%', padding: 6, background: '#34495e', color: '#ecf0f1', border: '1px solid #7f8c8d' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>AI Type:</label>
              <select 
                value={editForm.aiType}
                onChange={(e) => setEditForm(prev => ({ ...prev, aiType: e.target.value }))}
                style={{ width: '100%', padding: 6, background: '#34495e', color: '#ecf0f1', border: '1px solid #7f8c8d' }}
              >
                <option value="wander">Wander</option>
                <option value="guard">Guard</option>
                <option value="aggressive">Aggressive</option>
                <option value="passive">Passive</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Respawn Time (ms):</label>
              <input 
                type="number"
                value={editForm.respawnMs}
                onChange={(e) => setEditForm(prev => ({ ...prev, respawnMs: parseInt(e.target.value) || 30000 }))}
                style={{ width: '100%', padding: 6, background: '#34495e', color: '#ecf0f1', border: '1px solid #7f8c8d' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              {isCreating ? (
                <button 
                  onClick={createMobTemplate}
                  style={{ background: '#27ae60', color: 'white', border: 'none', padding: '8px 16px', marginRight: 8, cursor: 'pointer' }}
                >
                  Create
                </button>
              ) : (
                <>
                  <button 
                    onClick={updateMobTemplate}
                    style={{ background: '#f39c12', color: 'white', border: 'none', padding: '8px 16px', marginRight: 8, cursor: 'pointer' }}
                  >
                    Update
                  </button>
                  <button 
                    onClick={deleteMobTemplate}
                    style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>

            {selectedTemplate && (
              <div style={{ border: '1px solid #7f8c8d', padding: 12, background: '#34495e' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Place in Room</h4>
                <select 
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  style={{ width: '100%', padding: 6, background: '#2c3e50', color: '#ecf0f1', border: '1px solid #7f8c8d', marginBottom: 8 }}
                >
                  <option value="">Select Room</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
                <button 
                  onClick={placeMobInRoom}
                  disabled={!selectedRoom}
                  style={{ 
                    background: selectedRoom ? '#3498db' : '#7f8c8d', 
                    color: 'white', 
                    border: 'none', 
                    padding: '6px 12px',
                    cursor: selectedRoom ? 'pointer' : 'not-allowed'
                  }}
                >
                  Place Mob
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Panel - Placed Mobs */}
      <div style={{ flex: 1, background: '#34495e', color: '#ecf0f1', padding: 16, overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Placed Mobs</h3>
        
        {rooms.map(room => {
          const mobsInRoom = getMobsInRoom(room.id);
          if (mobsInRoom.length === 0) return null;
          
          return (
            <div key={room.id} style={{ marginBottom: 16, border: '1px solid #7f8c8d', padding: 12 }}>
              <h4 style={{ margin: '0 0 8px 0' }}>{room.name}</h4>
              {mobsInRoom.map((mob, index) => (
                <div 
                  key={`${mob.id}-${index}`}
                  style={{ 
                    background: '#2c3e50',
                    padding: 8, 
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{mob.name}</div>
                    <div style={{ fontSize: 12, color: '#bdc3c7' }}>
                      HP: {mob.baseStats.hp} | ATK: {mob.baseStats.atk} | AI: {mob.aiType}
                    </div>
                  </div>
                  <button 
                    onClick={() => removePlacedMob(mob.id, room.id)}
                    style={{ 
                      background: '#e74c3c', 
                      color: 'white', 
                      border: 'none', 
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          );
        })}
        
        {placedMobs.length === 0 && (
          <div style={{ color: '#7f8c8d', textAlign: 'center', marginTop: 40 }}>
            No mobs placed yet. Create and place some mobs!
          </div>
        )}
      </div>
    </div>
  );
};