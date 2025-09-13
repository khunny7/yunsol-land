import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { RoomSnapshot } from '../types';

interface Props {
  room: RoomSnapshot | null;
  playerId: string | null;
  width?: number;
  height?: number;
}

// Simple deterministic position generator for players in a room
function positionFor(index: number, total: number, w: number, h: number) {
  if (total === 1) return { x: w/2, y: h/2 };
  const radius = Math.min(w, h) * 0.3;
  const angle = (index / total) * Math.PI * 2;
  return { x: w/2 + Math.cos(angle)*radius, y: h/2 + Math.sin(angle)*radius };
}

export function RoomStage({ room, playerId, width = 320, height = 240 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [pixiReady, setPixiReady] = useState(false);
  const spritesRef = useRef<Record<string, PIXI.Graphics>>({});

  // Initialize Pixi once
  useEffect(() => {
    let mounted = true;
    async function setup() {
      if (!containerRef.current || appRef.current) return;
      const app = new PIXI.Application();
      await app.init({ width, height, backgroundColor: 0x1e1e24, antialias: true });
      if (mounted && containerRef.current) {
        appRef.current = app;
        containerRef.current.appendChild(app.canvas as HTMLCanvasElement);
        setPixiReady(true);
      }
    }
    setup();
    return () => { mounted = false; appRef.current?.destroy(true); };
  }, [width, height]);

  // Draw scene only when Pixi is ready and room is present
  useEffect(() => {
    const app = appRef.current;
    console.log('RoomStage draw effect', { room, playerId, app, pixiReady });
    if (!app || !pixiReady) return;
    app.stage.removeChildren();
    spritesRef.current = {};

    if (!room) {
      // Draw debug border if no room
      const bounds = new PIXI.Graphics();
      bounds.lineStyle(2, 0xff0000).drawRect(0, 0, width, height);
      app.stage.addChild(bounds);
      return;
    }

    // Draw background based on room id
    const bg = new PIXI.Graphics();
    if (room.id === 'town_square') {
      // Plaza: light circle
      bg.beginFill(0xeeeecc).drawCircle(width/2, height/2, Math.min(width, height)*0.4).endFill();
    } else if (room.id === 'north_road') {
      // Road: brown path
      bg.beginFill(0x8d674a).drawRect(width/2-40, 0, 80, height).endFill();
    } else {
      // Default: soft gradient
      bg.beginFill(0xcccccc).drawRect(0,0,width,height).endFill();
    }
    app.stage.addChild(bg);

    // Always draw room boundary
    const bounds = new PIXI.Graphics();
    bounds.lineStyle(2, 0x555577).drawRoundedRect(8, 8, width - 16, height - 16, 12);
    app.stage.addChild(bounds);

    // Draw players if any
    const total = room.players.length;
    if (total > 0) {
      room.players.forEach((p, idx) => {
        const g = new PIXI.Graphics();
        const me = p.id === playerId;
        g.beginFill(me ? 0x4caf50 : 0x2196f3).drawCircle(0, 0, me ? 14 : 10).endFill();
        const { x, y } = positionFor(idx, total, width, height);
        g.x = x; g.y = y;
        app.stage.addChild(g);
        spritesRef.current[p.id] = g;

        // Name tag
        const name = new PIXI.Text(p.name, { fill: me ? '#8be88b' : '#b0d4ff', fontSize: 12 });
        name.anchor.set(0.5, 0);
        name.x = x; name.y = y + 16;
        app.stage.addChild(name);
      });
    }
  }, [room, playerId, width, height, pixiReady]);

  return <div style={{ width, height, background: '#333', border: '2px solid #444' }} ref={containerRef} />;
}
