# 📚 IBERION Documentation Index

> Complete documentation system for IBERION - A turn-based tactical strategy game

**Last Updated:** February 2, 2026  
**Total Documentation:** 3800+ lines across 7 main documents  
**Status:** ✅ Complete and Ready for Onboarding

---

## 🎯 Start Here Based on Your Role

### 👨‍💻 I'm a **Programmer**
**Time commitment:** 4-5 hours over 5 days

1. **Today (15 min):** [Quick Start for Developers](./QUICK_START_DEVELOPERS.md)
   - What is IBERION in 5 minutes
   - Your first bug fix walkthrough
   - 5-day learning path

2. **Tomorrow (1 hour):** [Technical-Functional Guide](./GUIA_TECNICA_FUNCIONAL_IBERION.md#arquitectura)
   - Complete architecture overview
   - State management deep dive
   - All game systems explained

3. **This week (30 min):** [Code Patterns](./PATRONES_CODIGO.md)
   - Request pattern (for player actions)
   - Manager pattern (for subsystems)
   - Network & persistence patterns

4. **Always available:** [Cheat Sheet](./CHEAT_SHEET_QUICK_REFERENCE.md) (print it!)

---

### 🎮 I'm a **Game Designer**
**Time commitment:** 1.5-2 hours

1. **Start here (45 min):** [Gameplay & Mechanics Guide](./GUIA_GAMEPLAY_MECANICAS.md)
   - How to win (3 different ways)
   - All resources explained
   - Combat mechanics & formulas
   - All civilizations & balance

2. **Deep dive (20 min):** [Technical Guide § Unit System](./GUIA_TECNICA_FUNCIONAL_IBERION.md#sistema-de-unidades)

3. **Reference:** [FAQ § Game Design](./FAQ_EXTENDIDO.md)

---

### 🧪 I'm **QA / Tester**
**Time commitment:** 45 minutes

1. **First (20 min):** [Gameplay Guide § Game Modes](./GUIA_GAMEPLAY_MECANICAS.md#modos-de-juego)

2. **Second (15 min):** [Quick Start § Testing](./QUICK_START_DEVELOPERS.md#-cómo-probar-tu-código)

3. **Reference:** [Checklists](./PATRONES_CODIGO.md#checklist-de-implementación)

---

### 👥 I'm a **Community Manager / Producer**
**Time commitment:** 1 hour

1. **Start (20 min):** [Gameplay § Winning & Strategy](./GUIA_GAMEPLAY_MECANICAS.md)

2. **Balance (20 min):** [Balance & Tuning](./GUIA_GAMEPLAY_MECANICAS.md#balance-y-tunning)

3. **Reference:** [FAQ § Game Questions](./FAQ_EXTENDIDO.md)

---

## 📖 All Documents

| Document | Purpose | Audience | Read Time |
|----------|---------|----------|-----------|
| **[Quick Start for Developers](./QUICK_START_DEVELOPERS.md)** | First day essentials, bug fix example, 5-day path | Programmers | 15 min |
| **[Technical-Functional Guide](./GUIA_TECNICA_FUNCIONAL_IBERION.md)** | Complete architecture, all systems, feature how-tos | Programmers | 1-2 hrs |
| **[Code Patterns](./PATRONES_CODIGO.md)** | How to write consistent code, all patterns with examples | Programmers | 30 min |
| **[Gameplay & Mechanics](./GUIA_GAMEPLAY_MECANICAS.md)** | How to play, all civs, combat formulas, strategy, balance | Designers, Players | 45 min |
| **[Extended FAQ](./FAQ_EXTENDIDO.md)** | 30+ common questions with detailed answers | Everyone | 20 min |
| **[Cheat Sheet](./CHEAT_SHEET_QUICK_REFERENCE.md)** | Quick reference, debug commands, printable | Programmers | 5 min |
| **[Documentation Central](./DOCUMENTACION_CENTRAL.md)** | Hub with links, search by topic, learning paths | Everyone | varies |

---

## 🔍 Search by Topic

### Architecture & Structure
- **Game State:** [Quick Start](./QUICK_START_DEVELOPERS.md#-concepto-2-estado-central-vs-estado-local) or [Tech Guide](./GUIA_TECNICA_FUNCIONAL_IBERION.md#estructura-de-estado)
- **Data Flow:** [Tech Guide § Data Flow](./GUIA_TECNICA_FUNCIONAL_IBERION.md#flujo-principal-de-datos)
- **File Organization:** [Tech Guide § Code Structure](./GUIA_TECNICA_FUNCIONAL_IBERION.md#estructura-del-código)

### Game Systems
- **Units:** [Gameplay](./GUIA_GAMEPLAY_MECANICAS.md#sistema-de-unidades) or [Tech Guide](./GUIA_TECNICA_FUNCIONAL_IBERION.md#sistema-de-unidades)
- **Resources:** [Gameplay](./GUIA_GAMEPLAY_MECANICAS.md#recursos-y-economía) or [Tech Guide](./GUIA_TECNICA_FUNCIONAL_IBERION.md#sistema-de-recursos)
- **Morale & Supply:** [Tech Guide](./GUIA_TECNICA_FUNCIONAL_IBERION.md#sistema-de-morale)
- **Civilizations:** [Gameplay](./GUIA_GAMEPLAY_MECANICAS.md#civilizaciones) or [Tech Guide](./GUIA_TECNICA_FUNCIONAL_IBERION.md#civilizaciones)

### Implementation
- **Adding a Feature:** [Tech Guide § Features](./GUIA_TECNICA_FUNCIONAL_IBERION.md#agregar-features)
- **Adding a Unit:** [Tech Guide § Add Unit](./GUIA_TECNICA_FUNCIONAL_IBERION.md#agregar-una-unidad-nueva)
- **Request Pattern:** [Patterns](./PATRONES_CODIGO.md#patrón-estándar-de-request)
- **First Bug Fix:** [Quick Start § Bug Fix](./QUICK_START_DEVELOPERS.md#-tu-primer-bug-fix-ejemplo-real)

### Debugging & Troubleshooting
- **Debug Console:** [Cheat Sheet](./CHEAT_SHEET_QUICK_REFERENCE.md#-comandos-de-debug-console---f12)
- **Testing Guide:** [Quick Start § Testing](./QUICK_START_DEVELOPERS.md#-cómo-probar-tu-código)
- **FAQ Troubleshooting:** [FAQ](./FAQ_EXTENDIDO.md)

---

## 📊 Documentation Statistics

```
TOTAL DOCUMENTATION: 3800+ lines
TOTAL DOCUMENTS: 7 main files
TOTAL TOPICS: 120+
TOTAL EXAMPLES: 50+
TOTAL TABLES: 10+

BREAKDOWN BY AUDIENCE:
├─ Programmers: 2400 lines (Tech Guide + Patterns + Quick Start + Cheat Sheet)
├─ Designers: 800 lines (Gameplay Guide)
├─ Everyone: 600 lines (FAQ + Documentation Central)
└─ Specific roles: 280+ lines (Completacion + Solutions)
```

---

## 🚀 Getting Started Checklist

### Day 1 (Programmers)
- [ ] Read [Quick Start](./QUICK_START_DEVELOPERS.md) (15 min)
- [ ] Open `state.js` and `main.js` (15 min)
- [ ] Try debug console commands (10 min)
- [ ] Understand turn cycle (10 min)

### Day 2-3 (Programmers)
- [ ] Read [Tech Guide § Architecture](./GUIA_TECNICA_FUNCIONAL_IBERION.md#arquitectura) (30 min)
- [ ] Read [Patterns § Request](./PATRONES_CODIGO.md#patrón-estándar-de-request) (20 min)
- [ ] Review example in [unit_Actions.js](./unit_Actions.js) (30 min)

### Day 4 (Programmers)
- [ ] Find an easy bug
- [ ] Follow [Quick Start § Bug Fix](./QUICK_START_DEVELOPERS.md#-tu-primer-bug-fix-ejemplo-real) guide
- [ ] Test locally and in multiplayer

### Day 5 (Programmers)
- [ ] Pick a small feature
- [ ] Follow [Tech Guide § Features](./GUIA_TECNICA_FUNCIONAL_IBERION.md#agregar-features)
- [ ] Test all game types
- [ ] Make first PR

---

## 💡 Key Concepts Quick Reference

### Architecture
```
UI (click) → Logic (validate) → State (gameState) → 
  Persistence (save) → Network (sync) → Back to UI (render)
```

### State Structure
```javascript
gameState = { currentPlayer, turnNumber, currentPhase, playerResources... }
board[][] = { terrain, owner, structure, ... }
units[] = { id, name, health, morale, regiments[], ... }
```

### Standard Request Pattern
```javascript
async function RequestAction(param) {
    if (!canPlayerAction()) return false;           // Validate
    const actionId = crypto.randomUUID();           // Dedup
    if (isNetworkGame()) await syncToServer();      // Network
    mutateState();                                   // Execute
    UIManager.updateAllUIDisplays();                // Render
    saveGameUnified("autosave", true);              // Persist
    return true;
}
```

---

## 🎓 Learning Paths

### Path 1: New Programmer (5 days, 4-5 hours)
1. Quick Start (15 min)
2. Tech Guide § Basics (30 min)
3. Patterns (30 min)
4. Bug fix (30 min)
5. Small feature (45 min)
= **~4-5 hours total**

### Path 2: Game Designer (2 hours)
1. Gameplay Guide (45 min)
2. Tech Guide § Systems (30 min)
3. FAQ (20 min)
= **~2 hours total**

### Path 3: QA (1 hour)
1. Gameplay § Modes (20 min)
2. Testing guide (15 min)
3. Keep FAQ open
= **~1 hour total**

---

## ✨ Special Features

✅ **Beginner-Friendly:** Start with 15-minute Quick Start  
✅ **Progressive:** Deep dive available in Tech Guide  
✅ **Practical:** Examples > Theory, includes code templates  
✅ **Multi-Format:** Guides, FAQ, Patterns, Cheat Sheet  
✅ **Role-Based:** Different paths for different roles  
✅ **Complete:** All systems documented with examples  
✅ **Searchable:** Use Ctrl+F in any document  
✅ **Printable:** Cheat Sheet fits on 4 pages  

---

## 📞 Quick Links

| Resource | Link |
|----------|------|
| 🏠 Documentation Hub | [DOCUMENTACION_CENTRAL.md](./DOCUMENTACION_CENTRAL.md) |
| 🚀 Quick Start | [QUICK_START_DEVELOPERS.md](./QUICK_START_DEVELOPERS.md) |
| 📘 Technical Guide | [GUIA_TECNICA_FUNCIONAL_IBERION.md](./GUIA_TECNICA_FUNCIONAL_IBERION.md) |
| 🎨 Code Patterns | [PATRONES_CODIGO.md](./PATRONES_CODIGO.md) |
| 🎮 Gameplay Guide | [GUIA_GAMEPLAY_MECANICAS.md](./GUIA_GAMEPLAY_MECANICAS.md) |
| ❓ FAQ | [FAQ_EXTENDIDO.md](./FAQ_EXTENDIDO.md) |
| 📋 Cheat Sheet | [CHEAT_SHEET_QUICK_REFERENCE.md](./CHEAT_SHEET_QUICK_REFERENCE.md) |

---

## 🎯 What This Documentation Enables

✅ **New developers can be productive in 5 days**  
✅ **Designers understand all mechanics**  
✅ **QA knows what to test**  
✅ **Everyone speaks the same language**  
✅ **Code stays consistent**  
✅ **Knowledge is documented forever**  
✅ **Onboarding is self-service**  

---

## 📝 Notes

- All documents are cross-linked for easy navigation
- Use Ctrl+F to search within a document
- Print the Cheat Sheet for quick reference
- Join the team tomorrow and start with Quick Start!

**Version:** 1.0 - Stable  
**Status:** Ready for Onboarding  
**Last Updated:** February 2, 2026

---

**Welcome to IBERION! 🎮**
