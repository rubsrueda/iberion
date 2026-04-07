/**
 * replayRenderer.js
 * Renderizador de replay basado en DOM para reutilizar el look real del juego.
 */

const ReplayRenderer = {
    canvas: null,
    canvasParent: null,
    replayRoot: null,
    boardContainer: null,
    boardLayer: null,
    unitsLayer: null,
    replayData: null,
    boardData: null,
    currentTurn: 0,
    isPlaying: false,
    playbackSpeed: 1,
    animationFrameId: null,
    boardStateMap: new Map(),
    unitsStateMap: new Map(),
    hexElements: new Map(),
    unitElements: new Map(),

    initialize: function(canvasElement, replayData, boardData) {
        this._reset();

        this.canvas = canvasElement;
        this.canvasParent = canvasElement ? canvasElement.parentElement : null;
        this.replayData = replayData || { timeline: [] };
        this.boardData = this._normalizeBoardData(boardData, this.replayData);

        if (!this.canvasParent) {
            console.error('[ReplayRenderer] Contenedor visual no disponible');
            return;
        }

        this._createReplayDOM();
        this._buildBoard();

        const timeline = this.replayData.timeline || [];
        if (timeline.length === 0) {
            this.currentTurn = 0;
            return;
        }

        this.goToTurn(0);
    },

    _reset: function() {
        this.stop();
        this.boardStateMap = new Map();
        this.unitsStateMap = new Map();
        this.hexElements = new Map();
        this.unitElements = new Map();

        if (this.replayRoot && this.replayRoot.parentElement) {
            this.replayRoot.parentElement.removeChild(this.replayRoot);
        }

        if (this.canvas) {
            this.canvas.style.display = 'block';
        }

        this.replayRoot = null;
        this.boardContainer = null;
        this.boardLayer = null;
        this.unitsLayer = null;
    },

    _createReplayDOM: function() {
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }

        const root = document.createElement('div');
        root.className = 'replay-live-root';
        root.style.cssText = 'width:100%;height:100%;position:relative;overflow:auto;background:rgba(12,22,32,0.75);';

        const container = document.createElement('div');
        container.className = 'replay-live-board-container';
        container.style.cssText = 'position:relative;margin:16px auto;';

        const boardLayer = document.createElement('div');
        boardLayer.className = 'replay-live-board-layer';
        boardLayer.style.cssText = 'position:relative;';

        const unitsLayer = document.createElement('div');
        unitsLayer.className = 'replay-live-units-layer';
        unitsLayer.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;';

        container.appendChild(boardLayer);
        container.appendChild(unitsLayer);
        root.appendChild(container);
        this.canvasParent.appendChild(root);

        this.replayRoot = root;
        this.boardContainer = container;
        this.boardLayer = boardLayer;
        this.unitsLayer = unitsLayer;
    },

    _normalizeBoardData: function(boardData, replayData) {
        if (Array.isArray(boardData) && boardData.length > 0) {
            return boardData;
        }

        let metadata = replayData?.metadata;
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch (err) { metadata = null; }
        }

        const boardInfo = metadata?.b || replayData?.boardInfo || { rows: 20, cols: 20 };
        const rows = Number(boardInfo.rows) || 20;
        const cols = Number(boardInfo.cols) || 20;

        const generated = [];
        for (let r = 0; r < rows; r++) {
            generated[r] = [];
            for (let c = 0; c < cols; c++) {
                generated[r][c] = { r, c, terrain: 'plains', owner: null, structure: null, isCity: false, isCapital: false };
            }
        }

        return generated;
    },

    _buildBoard: function() {
        if (!this.boardLayer || !Array.isArray(this.boardData) || this.boardData.length === 0) return;

        const rows = this.boardData.length;
        const cols = this.boardData[0]?.length || 0;
        const hexWidth = typeof HEX_WIDTH !== 'undefined' ? HEX_WIDTH : 50;
        const hexHeight = typeof HEX_HEIGHT !== 'undefined' ? HEX_HEIGHT : 57.73;
        const hexVert = typeof HEX_VERT_SPACING !== 'undefined' ? HEX_VERT_SPACING : (hexHeight * 0.75);

        this.boardLayer.style.width = `${cols * hexWidth + hexWidth / 2}px`;
        this.boardLayer.style.height = `${rows * hexVert + hexHeight * 0.25}px`;
        this.boardContainer.style.width = this.boardLayer.style.width;
        this.boardContainer.style.height = this.boardLayer.style.height;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const hexEl = document.createElement('div');
                hexEl.className = 'hex';
                hexEl.dataset.r = String(r);
                hexEl.dataset.c = String(c);

                const xPos = c * hexWidth + (r % 2 !== 0 ? hexWidth / 2 : 0);
                const yPos = r * hexVert;
                hexEl.style.left = `${xPos}px`;
                hexEl.style.top = `${yPos}px`;

                this.boardLayer.appendChild(hexEl);
                this.hexElements.set(`${r},${c}`, hexEl);
            }
        }
    },

    _applyHexVisuals: function(hexState) {
        const key = `${hexState.r},${hexState.c}`;
        const hexEl = this.hexElements.get(key);
        if (!hexEl) return;

        const structureSprite = hexEl.querySelector('.structure-sprite');
        if (structureSprite) structureSprite.remove();

        hexEl.className = 'hex';

        const terrain = hexState.t || hexState.terrain || 'plains';
        hexEl.classList.add(terrain);

        const seasonKey = (typeof gameState !== 'undefined' && gameState?.currentSeasonKey)
            ? gameState.currentSeasonKey
            : 'spring';
        hexEl.classList.add(`season-${seasonKey}`);

        const owner = hexState.o !== undefined ? hexState.o : hexState.owner;
        if (owner !== null && owner !== undefined) {
            hexEl.classList.add(`player${owner}-owner`);
        }

        if (hexState.iC || hexState.isCity) hexEl.classList.add('city');
        if (hexState.iCa || hexState.isCapital) hexEl.classList.add('capital-city');

        const structure = hexState.s || hexState.structure;
        if (structure) {
            const safeStructure = String(structure).replace(/\s+/g, '-');
            hexEl.classList.add(`structure-${safeStructure}`);

            const spriteEl = document.createElement('span');
            spriteEl.className = 'structure-sprite';
            const structureData = (typeof STRUCTURE_TYPES !== 'undefined') ? STRUCTURE_TYPES[structure] : null;
            const sprite = structureData?.sprite || '🏛️';

            if (typeof sprite === 'string' && (sprite.includes('/') || sprite.includes('.'))) {
                spriteEl.style.backgroundImage = `url('${sprite}')`;
                spriteEl.style.backgroundSize = 'contain';
                spriteEl.style.backgroundRepeat = 'no-repeat';
                spriteEl.style.backgroundPosition = 'center';
                spriteEl.textContent = '';
            } else {
                spriteEl.style.backgroundImage = 'none';
                spriteEl.textContent = sprite;
            }

            hexEl.appendChild(spriteEl);
        }
    },

    _renderUnit: function(unitState) {
        const key = String(unitState.id || unitState.unitId);
        let unitEl = this.unitElements.get(key);

        if (!unitEl) {
            unitEl = document.createElement('div');
            unitEl.classList.add('unit');
            unitEl.dataset.id = key;

            const strength = document.createElement('div');
            strength.className = 'unit-strength';
            unitEl.appendChild(strength);

            this.unitsLayer.appendChild(unitEl);
            this.unitElements.set(key, unitEl);
        }

        const playerId = unitState.p ?? unitState.playerId ?? 1;
        const classesToRemove = [];
        unitEl.classList.forEach(cls => {
            if (cls.startsWith('player')) classesToRemove.push(cls);
        });
        classesToRemove.forEach(cls => unitEl.classList.remove(cls));
        unitEl.classList.add(`player${playerId}`);

        const sprite = unitState.spr || unitState.sprite || '';
        if (typeof sprite === 'string' && (sprite.includes('/') || sprite.includes('.'))) {
            unitEl.style.backgroundImage = `url('${sprite}')`;
            unitEl.textContent = '';
        } else {
            unitEl.style.backgroundImage = 'none';
            unitEl.textContent = sprite || '⚔️';
        }

        const strengthEl = unitEl.querySelector('.unit-strength');
        if (strengthEl) {
            const hp = Number(unitState.h ?? unitState.health ?? 0);
            strengthEl.textContent = String(Math.max(0, Math.round(hp)));
            unitEl.appendChild(strengthEl);
        }

        this._positionUnitElement(unitEl, unitState.r, unitState.c);
    },

    _positionUnitElement: function(unitEl, r, c) {
        const hexWidth = typeof HEX_WIDTH !== 'undefined' ? HEX_WIDTH : 50;
        const hexVert = typeof HEX_VERT_SPACING !== 'undefined' ? HEX_VERT_SPACING : 43.3;
        const xPos = c * hexWidth + (r % 2 !== 0 ? hexWidth / 2 : 0) + (hexWidth / 2) - 18;
        const yPos = r * hexVert + 11;

        unitEl.style.left = `${xPos}px`;
        unitEl.style.top = `${yPos}px`;
    },

    _syncDOMFromState: function() {
        this.boardStateMap.forEach(hexState => this._applyHexVisuals(hexState));

        const aliveUnitIds = new Set();
        this.unitsStateMap.forEach(unitState => {
            const health = Number(unitState.h ?? unitState.health ?? 0);
            if (health <= 0 || unitState.isDead) return;
            const id = String(unitState.id || unitState.unitId);
            aliveUnitIds.add(id);
            this._renderUnit(unitState);
        });

        Array.from(this.unitElements.keys()).forEach(id => {
            if (aliveUnitIds.has(id)) return;
            const unitEl = this.unitElements.get(id);
            if (unitEl && unitEl.parentElement) unitEl.parentElement.removeChild(unitEl);
            this.unitElements.delete(id);
        });
    },

    _cloneHexState: function(hex) {
        return {
            r: hex.r,
            c: hex.c,
            o: hex.o !== undefined ? hex.o : (hex.owner ?? null),
            s: hex.s !== undefined ? hex.s : (hex.structure ?? null),
            iC: Boolean(hex.iC !== undefined ? hex.iC : hex.isCity),
            iCa: Boolean(hex.iCa !== undefined ? hex.iCa : hex.isCapital),
            t: hex.t || hex.terrain || 'plains'
        };
    },

    _cloneUnitState: function(unit) {
        return {
            id: unit.id ?? unit.unitId,
            n: unit.n ?? unit.name ?? 'Unidad',
            p: unit.p ?? unit.playerId ?? 1,
            r: unit.r,
            c: unit.c,
            reg: unit.reg ?? unit.regiments ?? 0,
            rt: unit.rt ?? unit.regimentType ?? 'Infanteria Ligera',
            spr: unit.spr ?? unit.sprite ?? '',
            h: unit.h ?? unit.health ?? 0,
            mh: unit.mh ?? unit.maxHealth ?? 0,
            m: unit.m ?? unit.morale ?? 100,
            isDead: Boolean(unit.isDead)
        };
    },

    _applyTurnState: function(turnIndex) {
        const timeline = this.replayData?.timeline || [];
        this.boardStateMap.clear();
        this.unitsStateMap.clear();

        if (timeline.length === 0) return;

        for (let i = 0; i <= turnIndex; i++) {
            const turn = timeline[i];
            if (!turn) continue;

            if (Array.isArray(turn.boardState)) {
                this.boardStateMap.clear();
                turn.boardState.forEach(hex => {
                    const normalized = this._cloneHexState(hex);
                    this.boardStateMap.set(`${normalized.r},${normalized.c}`, normalized);
                });
            }

            if (Array.isArray(turn.unitsState)) {
                this.unitsStateMap.clear();
                turn.unitsState.forEach(unit => {
                    const normalized = this._cloneUnitState(unit);
                    this.unitsStateMap.set(String(normalized.id), normalized);
                });
            }

            if (turn.isFullSnapshot) {
                continue;
            }

            if (Array.isArray(turn.boardDelta)) {
                turn.boardDelta.forEach(hex => {
                    const normalized = this._cloneHexState(hex);
                    this.boardStateMap.set(`${normalized.r},${normalized.c}`, normalized);
                });
            }

            const unitsDelta = turn.unitsDelta;
            if (Array.isArray(unitsDelta)) {
                this.unitsStateMap.clear();
                unitsDelta.forEach(unit => {
                    const normalized = this._cloneUnitState(unit);
                    this.unitsStateMap.set(String(normalized.id), normalized);
                });
            } else if (unitsDelta && typeof unitsDelta === 'object') {
                (unitsDelta.added || []).forEach(unit => {
                    const normalized = this._cloneUnitState(unit);
                    this.unitsStateMap.set(String(normalized.id), normalized);
                });

                (unitsDelta.modified || []).forEach(unit => {
                    const id = String(unit.id);
                    const existing = this.unitsStateMap.get(id) || { id };
                    const merged = this._cloneUnitState({ ...existing, ...unit, id });
                    this.unitsStateMap.set(id, merged);
                });

                (unitsDelta.removed || []).forEach(unitId => {
                    const id = String(unitId);
                    const existing = this.unitsStateMap.get(id);
                    if (existing) {
                        existing.isDead = true;
                        existing.h = 0;
                        this.unitsStateMap.set(id, existing);
                    }
                });
            }
        }
    },

    _addTurnEffects: function(turnIndex) {
        const turn = this.replayData?.timeline?.[turnIndex];
        if (!turn || !Array.isArray(turn.events)) return;

        turn.events.forEach(event => {
            const loc = event.location || event.to;
            if (!Array.isArray(loc) || loc.length < 2) return;

            const key = `${loc[0]},${loc[1]}`;
            const hexEl = this.hexElements.get(key);
            if (!hexEl) return;

            if (event.type === 'BATTLE' || event.type === 'UNIT_DEATH') {
                hexEl.classList.add('hit-effect');
                setTimeout(() => hexEl.classList.remove('hit-effect'), 350);
            }

            if (event.type === 'CONQUEST') {
                hexEl.classList.add('owner-change-effect');
                setTimeout(() => hexEl.classList.remove('owner-change-effect'), 600);
            }
        });
    },

    goToTurn: function(turnNumber) {
        const timeline = this.replayData?.timeline || [];
        if (timeline.length === 0) {
            this.currentTurn = 0;
            return;
        }

        const clamped = Math.max(0, Math.min(turnNumber, timeline.length - 1));
        this.currentTurn = clamped;

        this._applyTurnState(clamped);
        this._syncDOMFromState();

        if (typeof window !== 'undefined' && window.ReplayUI && typeof window.ReplayUI.updateTurnDisplay === 'function') {
            window.ReplayUI.updateTurnDisplay();
        }
    },

    play: function() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.playLoop();
    },

    playLoop: function() {
        if (!this.isPlaying) return;

        const totalTurns = this.replayData?.timeline?.length || 0;
        if (totalTurns <= 1 || this.currentTurn >= totalTurns - 1) {
            this.isPlaying = false;
            return;
        }

        this.currentTurn += 1;
        this._applyTurnState(this.currentTurn);
        this._syncDOMFromState();
        this._addTurnEffects(this.currentTurn);

        if (typeof window !== 'undefined' && window.ReplayUI && typeof window.ReplayUI.updateTurnDisplay === 'function') {
            window.ReplayUI.updateTurnDisplay();
        }

        const baseDelay = 1000 / Math.max(1, this.playbackSpeed);
        this.animationFrameId = setTimeout(() => this.playLoop(), baseDelay);
    },

    seek: function(progress) {
        const totalTurns = this.replayData?.timeline?.length || 1;
        const targetTurn = Math.floor(Math.max(0, Math.min(1, progress)) * (totalTurns - 1));
        this.goToTurn(targetTurn);
    },

    previousTurn: function() {
        this.stopPlaybackOnly();
        this.goToTurn(this.currentTurn - 1);
    },

    nextTurn: function() {
        this.stopPlaybackOnly();
        const next = this.currentTurn + 1;
        this.goToTurn(next);
        this._addTurnEffects(this.currentTurn);
    },

    setPlaybackSpeed: function(speed) {
        this.playbackSpeed = Number(speed) || 1;
    },

    stopPlaybackOnly: function() {
        this.isPlaying = false;
        if (this.animationFrameId) {
            clearTimeout(this.animationFrameId);
            this.animationFrameId = null;
        }
    },

    stop: function() {
        this.stopPlaybackOnly();
        this.goToTurn(0);
    },

    destroy: function() {
        this._reset();
    }
};

if (typeof window !== 'undefined') {
    window.ReplayRenderer = ReplayRenderer;
}
