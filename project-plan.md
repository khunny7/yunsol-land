# Project Plan: Text MUD with 2D Visuals

## Goals
- Create a text-based MUD game with a 2D cute visual layer.
- Playable via both text commands and mouse/keyboard interactions.
- Real-time gameplay with low latency.
- Fast development using TypeScript end-to-end.

---

## Tech Choices

### Backend
- **Node.js + TypeScript**
- **Fastify**: HTTP server.
- **Socket.IO**: Real-time communication.
- **In-memory state**: Authoritative game state.
- **Prisma ORM**: SQLite for prototype (seamless upgrade path to PostgreSQL later).
- **Redis**: Optional for scaling and caching (deferred).
- **Zod**: Input validation.
- **Vitest**: Testing framework.

### Frontend
- **React + Vite**: Fast development and familiar framework.
- **PixiJS**: Lightweight 2D rendering engine for visuals.
- **Zustand**: State management.
- **Modular CSS**: Use CSS Modules instead of Tailwind for styling.

---

## Data Flow
1. **Client connects**: Authenticates via HTTP and receives session + initial game state.
2. **Socket.IO connection**: Joins player and room channels.
3. **Player actions**: Commands (text or UI) are sent to the server.
4. **Server processes**: Validates, mutates state, and emits events.
5. **Game loop**: Handles AI, cooldowns, and scheduled events.
6. **Persistence**: Player and world persistence stored in SQLite (file db) via Prisma; transient combat state stays in memory.

---

## Data Model

### Core Tables (SQLite via Prisma; same shape if later moved to PostgreSQL)
- **players**: `id`, `name`, `roomId`, `stats`, `inventory`, `createdAt`, `updatedAt`
- **rooms**: `id`, `name`, `description`, `exits`, `staticFlags`
- **items**: `id`, `name`, `type`, `props`
- **mobs**: `id`, `name`, `baseStats`, `aiType`, `respawnSeconds`
- **player_events**: `id`, `playerId`, `ts`, `type`, `payload` (can be pruned / optional early)
- **world_meta**: `key`, `value`

### In-Memory Structures
- **rooms**: Map of room states (live mobs, occupants).
- **players**: Map of player runtime states.
- **mobs**: Map of mob runtime states.
- **scheduler**: Priority queue for scheduled events.
- **tickCounter**: Global tick counter.

---

## Game Loop / Timing
- **Core tick**: 250ms for responsiveness (cooldowns, AI polling).
- **Secondary tick**: 1s for regen and periodic effects.
- **Scheduled events**: Priority queue processed each tick.

---

## Command Pipeline
1. **Input**: Raw command (e.g., `/say hello`).
2. **Parse**: Tokenize and resolve aliases.
3. **Validate**: Check context (e.g., room, state).
4. **Execute**: Mutate state and emit events.

---

## Dual UI Strategy

### Shared State Adapter
- Single source of truth: Event stream from the server.

### Text Layer
- Virtualized scrollback for logs.
- Command input for text commands.

### Visual Layer (PixiJS)
- Render room background, entities (players, mobs, items).
- Clickable elements mapped to commands.

---

## Persistence & Durability
- **Chosen DB**: SQLite file (e.g., `data/game.db`) managed via Prisma.
- **Players**: Persist on: login create, room change, inventory change, logout, periodic (every 30–60s) snapshot.
- **Rooms**: Static JSON definitions loaded on boot; dynamic flags (if any) stored in `world_meta`.
- **Mobs**: Definitions static; runtime state ephemeral; respawn timers reconstructed on boot.
- **Events / Audit**: Optional; can skip `player_events` until needed.
- **Backup**: Copy `game.db` file (simple OS-level backup). When upgrading to PostgreSQL, run Prisma migrate & switch connection string.

---

## Deployment Phases

### Phase 1 (MVP)
- Single Node.js process.
- SQLite persistence (no external service required).
- No Redis initially.

### Phase 2
- Optional migration to PostgreSQL if multi-instance needed.
- Introduce Redis for pub/sub & shared presence.

### Phase 3
- Separate worker for heavy AI or scheduled tasks.

---

## Directory Structure

### Server
```
server/
  src/
    index.ts
    config/
    core/
      loop/
        tickLoop.ts
        scheduler.ts
      commands/
        index.ts
        parser.ts
        verbs/
          move.ts
          say.ts
          attack.ts
      world/
        loader.ts
        rooms.ts
        mobs.ts
      systems/
        combat.ts
        ai.ts
        regen.ts
      state/
        players.ts
        mobs.ts
        rooms.ts
      events/
        emitter.ts
        types.ts
    transport/
      socket.ts
      http.ts
    persistence/
      prismaClient.ts
      playerRepo.ts
      snapshot.ts
    util/
      logger.ts
      id.ts
    tests/
      commandParser.test.ts
      tickLoop.test.ts
  prisma/
    schema.prisma
  data/ (SQLite db file)
  package.json
```

### Client
```
client/
  src/
    main.tsx
    App.tsx
    sockets/
      connection.ts
      eventHandlers.ts
    state/
      store.ts
      selectors.ts
    textui/
      CommandInput.tsx
      LogView.tsx
    visual/
      PixiStage.tsx
      sprites/
        index.ts
        mobSprite.ts
        playerSprite.ts
    game/
      eventRouter.ts
      adapters.ts
    assets/
      manifest.ts
      sprites/
    hooks/
      useEventFeed.ts
    styles/
      index.css
    types/
      shared.d.ts
```

---

## Incremental Feature Roadmap

1. **Bootstrap**: Connect, create player, static room, move (n/s/e/w), look.
2. **Text log + command input**: Basic UI.
3. **Mobs**: Spawn + simple wander AI.
4. **Combat**: Attack, HP, death, respawn.
5. **Inventory**: Items on ground → pickup.
6. **Persistence**: Reliable SQLite writes & reload test.
7. **Visual polish**: Simple animations, floating damage numbers.
8. **Basic auth**: Token-based (JWT or simple signed token).
9. **Scaling readiness**: Abstract DB connection for potential Postgres move.

---

## Testing Focus

- **Command parser**: Edge cases.
- **Movement validation**: Invalid exits.
- **Tick scheduler**: Drift handling.
- **Combat**: Damage calculations.
- **Persistence**: Reload player & world state integrity after restart.
- **AI**: Decision frequency and safety.

---

## Performance & Scaling Notes

- Single process + SQLite is fine (low write contention, small player count).
- Measure before optimizing; upgrade DB only when concurrency or reporting demands it.
- Future migration: Change Prisma datasource URL + run migrations.

---

## Next Steps

1. Scaffold server and client skeleton.
2. Define Prisma schema (SQLite) for players & rooms only (start minimal).
3. Implement shared command/event types.
4. Build minimal move + say loop.
5. Add persistence write on move & disconnect.
6. Test restart consistency.

---

## Updates Based on Feedback

### Frontend Styling
- **Modular CSS**: Use CSS Modules instead of Tailwind for styling. This allows scoped styles for each component without the need for a utility-first framework.

### State Management
- **Zustand**: Lightweight and simple state management library. Easier to use than Redux for this project as it avoids boilerplate and is sufficient for managing game state.
- **Why not Redux?**: Redux is more complex and requires additional setup (reducers, actions, middleware). Zustand provides a simpler API and is better suited for small to medium-sized projects.

### Backend Must-Haves for Prototype
- **Node.js + TypeScript**
- **Fastify**
- **Socket.IO**
- **In-memory state** (authoritative runtime)
- **SQLite persistence via Prisma** (basic player & room save/load) — now REQUIRED, not optional.
- **Command parser**
- **Game loop**

### Chosen Lightweight Database
- **SQLite** selected for zero external dependency, fast iteration, and smooth upgrade path through Prisma.

### Adjusted Goals for Minimal Effort
- Working prototype with minimal external services.
- Mandatory basic persistence (SQLite) for player continuity.
- Modular CSS + PixiJS visuals.
- Skip Redis and advanced scaling until necessary.
