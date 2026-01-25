# Iberion - AI Coding Instructions

## Project Overview
**Iberion** is a turn-based tactical strategy game (hexagonal grid-based, like Civilization/Total War) with:
- Multiplayer support via Supabase cloud sync
- Progressive campaign mode with 8-player scenarios
- Hero/commander progression with equipment and talents
- Resource management and territory control mechanics
- Battle Pass seasonal progression
- Tutorial system for new players

**Tech Stack**: Vanilla JavaScript, Supabase (PostgreSQL), Service Worker (offline PWA), HTML5/CSS3

---

## Critical Architecture Patterns

### 1. **Global Game State (state.js)**
All game logic revolves around a single `gameState` object plus three global arrays:
```javascript
gameState = {
  numPlayers, currentPlayer, currentPhase, turnNumber,
  playerResources: { 1: {oro, comida, madera, piedra, hierro}, ... },
  playerCivilizations, activeCommanders, eliminatedPlayers, ...
}
board[][]  // Hex grid with owner, terrain, element DOM reference
units[]   // All units on board; includes health, morale, regiments
```
**Golden Rule**: Always sync state changes to board/units via specific manager functions—never mutate directly.

### 2. **Action Request Pattern (Network-Safe)**
Every player action goes through a **Request Function** → **Supabase sync** → **Validation** → **State mutation**:
```javascript
// Examples: RequestMoveUnit(), RequestAttack(), RequestSplitUnit()
// Pattern: 1) Check isNetworkGame() & currentPlayer
//          2) Call Supabase (NetworkManager._prepararEstadoParaNube)
//          3) Let server reflect changes back to all clients
```
**Why**: Prevents desync when multiple players modify state simultaneously.

### 3. **Manager Object Patterns**
Most managers are objects with methods (NOT classes):
- `PlayerDataManager` → User auth/progression via Supabase + localStorage fallback
- `NetworkManager` → Multiplayer sync, match creation (e.g., `crearPartidaEnNube()`)
- `BattlePassManager` → Season progression, tier rewards
- `UIManager` → Single source for UI refreshes (called after state changes)
- `BankManager` → Trading, market logic

**Convention**: Managers include a `_prepare` or `_clean` function to strip DOM/circular refs before serializing.

### 4. **Phase-Based Game Flow (gameFlow.js)**
Phases control what actions are allowed:
```javascript
currentPhase: "deployment" | "play" | "gameOver" | "redeployment"
// - deployment: Place initial units
// - play: Normal turn-based gameplay
// - gameOver: Battle complete
```
Each phase has validators in `gameFlow.js` (e.g., `checkGameOver()`, `checkVictoryConditions()`).

### 5. **Hex Grid System**
- Cube coordinates: `(r, c)` map to actual hex position
- **Neighbors**: Use `getHexNeighbors(r, c)` from `utils.js` (handles edge wrapping)
- **Distance**: `hexDistance(r1, c1, r2, c2)` or BFS for terrain cost
- **Supply/Roads**: Checked via `isHexSupplied()` and `findConnectedCities()` for unit movement validity

### 6. **Unit & Combat System**
Units contain:
- `regiments[]`: Array of regiment objects with health/type (Infantry, Cavalry, etc.)
- `morale`, `isDisorganized`: Affect combat rolls
- `talents[]`: Passive/active abilities from talent tree
- `experience`, `level`: Hero progression
- `actionId`: For deduplicating network actions (prevents double-tap bugs)

**Combat Flow**: `simulateBattle()` in gameFlow.js checks talents, terrain bonuses, morale state.

---

## Developer Workflows

### Starting the Game
1. Open `index.html` (service worker auto-registers in `<head>`)
2. `main.js` entry point → calls `initApp()` which cascades initialization
3. Load scenario via `campaignManager.js` → `showScreen()` → `initializeCampaignMode()`
4. Player selects map size/difficulty → `initializeNewGameBoardDOMAndData()` creates board DOM

### Testing Locally (No Multiplayer)
- Modify `playerTypes` in `state.js` to 'ai' for computer opponents
- Set `currentPlayer` manually to test specific player's turn
- Use `debugConsole.js` (Ctrl+Shift+D) for real-time state inspection

### Network Multiplayer Flow
1. **Host**: Calls `NetworkManager.crearPartidaEnNube()` → generates 4-char matchId → polls for guest
2. **Guest**: Joins via `NetworkManager.unirseSalaEnNube(matchId)`
3. Both call `activarEscuchaDeTurnos(matchId)` → Supabase realtime listener
4. **On every turn change**: Supabase pushes new `game_state` → client merges via `_prepararEstadoParaNube()` replacer

### Common Modifications
- **Add new unit type**: Edit `UNIT_DEFINITIONS` in `constants.js`, add sprites in `images/sprites/`
- **New terrain type**: Add to `TERRAIN_TYPES` in `constants.js` (include movement costs, passability)
- **New talent**: Add to `TALENT_TREE` in `talents.js`, implement bonus logic in `calculateTalentBonuses()` (utils.js)
- **New resource**: Add key to `initialResources` in `state.js`, update resource display in `uiUpdates.js`

---

## Key Files by Function

| File | Purpose |
|------|---------|
| `state.js` | Global game state, board, units arrays |
| `main.js` | Hex click handler, unit selection, movement validation |
| `gameFlow.js` | Turn management, victory conditions, morale/supply logic |
| `playerDataManager.js` | Google OAuth, profile persistence (Supabase) |
| `networkManager.js` | Multiplayer sync, state serialization (safe JSON.stringify) |
| `unit_Actions.js` | Move, attack, split unit logic (3.7k lines) |
| `boardManager.js` | Map generation, procedural terrain, panning/zoom |
| `campaignManager.js` | Campaign mode, scenario loading, territory meta-game |
| `constants.js` | All game configs (board sizes, unit defs, raid, season) |
| `utils.js` | Hex math, supply checks, unit lookup, toast notifications |
| `talentTree.js` | Talent database and tree building |
| `uiUpdates.js` | Canvas/DOM refresh after state changes |

---

## Testing & Debugging

### Known Challenges
1. **Action Deduplication**: Network lag causes double-clicks → always check `actionId` in Request functions
2. **Morale State**: Units lose morale when surrounded/isolated; affects combat AND movement
3. **Supply System**: Units can only move/attack if `isHexSupplied()` returns true (connected to capital/cities)
4. **Serialization**: DOM elements + circular refs break Supabase sync → use `replacer` function in JSON.stringify

### Debug Console (Ctrl+Shift+D)
- Inspect `gameState` in real-time
- Execute arbitrary JS: `units[0].morale = 100`
- Check board state: `board[5][7]`

---

## When Adding Features

**Always consider**:
- ✅ Does this change affect multiplayer state? (Add to `_prepararEstadoParaNube()` replacer if needed)
- ✅ Is there an AI equivalent? (Check `aiLogic.js` and `ai_gameplayLogic.js`)
- ✅ Does UI need refresh? (Call `UIManager.updateAllUIDisplays()` after state change)
- ✅ Are there phase gates? (Can this action happen in current `currentPhase`?)
- ✅ New constants belong in `constants.js`, not hardcoded

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Changing unit directly instead of via Request function | Wrap in `RequestMoveUnit()` or similar to ensure Supabase sync |
| Forgetting `actionId` in combat → double damage | Add `actionId: crypto.randomUUID()` to all Request functions |
| Modifying `board[][]` but forgetting to update DOM | Call `renderBoardToDOM()` after changes |
| Network state not syncing | Check `NetworkManager._prepararEstadoParaNube()` doesn't strip needed data |
| Tutorial gets stuck | Reset `gameState.isTutorialActive = false` in debug console |

---

**Last Updated**: January 2026 | **Game Name**: Hex General Evolved (Modular)
