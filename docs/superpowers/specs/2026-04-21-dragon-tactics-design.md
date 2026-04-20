# Dragon Tactics — Design Spec

- **Date**: 2026-04-21
- **Project**: 10_DT (Dragon Tactics)
- **Platform**: Web browser (vanilla HTML/CSS/JS, no build tools)
- **Scope**: Single-player MVP

---

## 1. Overview

A turn-based card + board game for the browser. A single human player commands a party against a 3-phase dragon boss on a 3x5 grid. AI fills the remaining 2–4 party slots. Players hold hidden race-king missions, some cooperative, some adversarial. Three matches are played and scores are tallied for final victory.

### In scope (MVP)
- Single-player with 2–4 AI party members
- 3-match tournament, aggregated score
- Rule-based dragon AI + rule-based ally AI
- Shared player deck + dragon-only deck
- 4 races with passive abilities
- Hidden missions (1 required + 1 optional per player)

### Out of scope
- Online / local multiplayer
- Advanced AI (MCTS, minimax)
- Rich audio / animation
- Persistence, accounts, i18n

---

## 2. Core Rules

### Board
- **3 rows × 5 columns** grid, rendered via CSS Grid.
- Dragon starts at **center cell (row 2, col 3)**.
- Players start on edge cells, no overlap.
- One occupant per cell. Moving into an ally's cell **auto-swaps** positions.

### Turn Order
- Each round, dragon + every surviving player rolls **1d6**.
- Action order = descending dice value. Re-roll on ties.

### Card Draw
- Match start: each player's initial hand is **3 cards**.
- No automatic per-turn draw.
- On your turn, instead of playing a card, you may **skip action and draw 2 cards**, but only if current hand is ≤ 4 cards.
- Max hand size: **6** (reachable only via draw action from ≤ 4).

### Player Turn — Choose One
1. Play 1 card from hand (move / attack / etc.)
2. Draw 2 cards (hand must be ≤ 4)
3. Discard entire hand → reassign both mission cards

### Player HP
- Base **3 HP** (Dwarf race: 4).
- Healed by 응급처치 card, capped at max.
- At 0 HP → eliminated for the rest of the match.

### Player Deck (40 cards, shared)

| Card | Count | Effect |
|---|---|---|
| 이동 (Move), range 1 | 6 | Move 1 in 4 directions |
| 이동, range 2 | 4 | Move up to 2 |
| 이동, range 3 | 2 | Move up to 3 |
| 공격 (Attack), range 1 | 6 | 1 damage to target in range |
| 공격, range 2 | 4 | 1 damage, range 2 |
| 공격, range 3 | 2 | 1 damage, range 3 |
| 숨기 (Hide) | 4 | Active this round: when behind ally on dragon line, hide-roll gains +2 |
| 응급처치 (Heal) | 3 | +1 HP to self or adjacent ally |
| 정찰 (Scout) | 2 | Reveal next-next dragon card beyond what is already revealed |
| 도발 (Taunt) | 2 | Next dragon action targets you (if valid) |
| **보물: 용사의 검** | 1 | Use: 3 damage to dragon |
| **보물: 생명의 물약** | 1 | Use: fully restore own HP |
| **보물: 바람의 망토** | 1 | Use: move 1–2 cells without consuming turn action |
| **보물: 용비늘 방패** | 1 | Passive: next 1 hit completely negated, card then consumed |
| **보물: 고대 룬** | 1 | Use: next own dice roll gains +2 |

Total = 12 + 12 + 4 + 3 + 2 + 2 + 5 = **40 cards**.

### Interactions
- **Hiding on dragon line**: for a single-target line attack (화염 숨결) where an ally sits between the dragon and the chosen target, roll 1d6:
  - 4+ → ally takes the hit instead of the target
  - 3 or less → original target is hit
  - If the **target** used a 숨기 card this round, the threshold becomes 2+ (i.e., +2 bonus on the roll)
- Hide-roll does **not** apply to 관통 화염 (piercing line): that attack hits every player on the line, including any ally, with no body-block mechanic.
- **Swap**: moving into an ally's cell exchanges positions automatically.
- **Occupancy**: only one entity per cell; move attempts into dragon cell are illegal.

---

## 3. Races & Missions

### 4 Races (random assignment per match, duplicates allowed)

| Race | Passive |
|---|---|
| 인간 (Human) | At turn start, 5% chance to draw 1 extra card |
| 엘프 (Elf) | Attack card range +1 |
| 드워프 (Dwarf) | Max HP +1 (base 4) |
| 오크 (Orc) | Attack card damage +1 |

### Mission Structure
- Per race: **race-specific pool of 4–8** + **shared common pool of 7** = combined pool.
- Match start: assign **2 missions per player** (1 required + 1 optional) randomly from the combined pool.
- Missions are **hidden** from other players.
- Per-mission points vary by difficulty.
- **Mission reassignment**: discarding entire hand on your turn reassigns both missions.

### Race-Specific Pools

**인간 (Human)**
| Mission | Points |
|---|---|
| Land the killing blow on the dragon | 5 |
| All allies alive at match end | 4 |
| Use 응급처치 3 times | 2 |
| End match at full HP | 2 |

**엘프 (Elf)**
| Mission | Points |
|---|---|
| Acquire 2 or more distinct treasure cards | 5 |
| Use 정찰 3 times | 3 |
| Land 5 ranged (range ≥ 2) attacks | 3 |
| Take zero damage the entire match | 4 |

**드워프 (Dwarf)**
| Mission | Points |
|---|---|
| Get hit in place of ally via hide-roll 2 times | 4 |
| Use 도발 2 times | 3 |
| End match at 1 HP | 3 |
| Dragon reaches phase 3 | 2 |
| End match holding at least 1 unused treasure | 3 |

**오크 (Orc, contains adversarial missions)**
| Mission | Points | Slot |
|---|---|---|
| Dragon wins (party wipe) | 5 | Required only |
| Eliminate 1 other player (direct damage from you) | 5 | Required only |
| Reduce dragon HP to ≤ 3 then have party wipe before victory | 4 | Required only |
| Use 공격 cards 6 times | 2 | Any |
| Acquire 3 treasure cards | 4 | Any |
| All Elves eliminated at match end | 4 | Any |
| All Humans eliminated at match end | 3 | Any |
| All Dwarves eliminated at match end | 3 | Any |

### Common Pool (shared by all races, 7 missions)

| Mission | Points |
|---|---|
| Use 공격 cards 5 times | 2 |
| Move a cumulative 10 cells | 2 |
| Deal at least 1 damage to the dragon during phase 1 (contributed to phase 2 transition) | 3 |
| Perform the draw-2 action 3 times | 2 |
| Use the hand-discard mission-reassign once in a match | 1 |
| Acquire at least 1 treasure card | 2 |
| Use 2 treasures (automatic 용비늘 방패 trigger counts) | 4 |

### Assignment Rules
- Race-targeting missions (e.g., "All Elves eliminated") are excluded from the pool **if no player of that race is present** in the match.
- Orc adversarial missions (marked "Required only") cannot occupy the optional slot.
- Missions from the combined pool are drawn without replacement for the pair (required + optional are distinct missions).

### Scoring
- **Per match**: sum of completed mission points + finisher bonus (3 pts to whoever deals final dragon damage) + survival bonus (1 pt if alive at match end).
- **Per game**: sum of 3 match scores. Highest wins. Ties broken by total dragon damage dealt.

### Match End Conditions
- Dragon HP reaches 0, OR
- All players eliminated (party wipe), OR
- 30 rounds elapsed (timeout — score as-is)

---

## 4. The Dragon

### HP & Phases

| Phase | HP Range | Dice per Turn | Actions per Turn | Pre-Revealed Cards |
|---|---|---|---|---|
| 1 | 15–11 | 1 | 1 | 1 |
| 2 | 10–6 | 2 | 2 (distinct cards) | 2 |
| 3 | 5–1 | 3 | 3 | 3 |

- Phase transition occurs immediately upon HP crossing a threshold.
- Phase transition produces a highlighted log entry and screen effect.

### Dragon Deck (22 cards)

| Card | Effect | Phase Gate | Count |
|---|---|---|---|
| 물기 (Bite) | 1 damage to adjacent target | All | 2 |
| 화염 숨결 (Breath) | 2 damage to nearest target on same row/col; hide-roll applies | All | 4 |
| 꼬리치기 (Tail) | 1 damage to all 8 adjacent cells | All | 3 |
| 날개짓 (Wing) | Push all players 1 cell away from dragon | All | 2 |
| 위협 (Roar) | Next round: all players' order-dice −1 | All | 2 |
| **관통 화염 (Piercing)** | Entire row or column: 1 damage to every player in the line (no hide-roll) | All | 2 |
| **돌진 (Charge)** | Dragon moves 2 in a line; 2 damage to players in path and destination | All | 2 |
| **지정 표식 (Mark)** | Mark a cell; next dragon turn, 2 damage to that cell and 4-adjacent cells | All | 2 |
| 광폭 (Frenzy) | 1 damage to all players | Phase 2+ | 2 |
| 재배치 (Reposition) | Dragon teleports to (2,3) | Phase 3 only | 1 |

Phase-gated cards enter the deck on phase transition (shuffled in).
Deck cycling: when deck empties, reshuffle discard pile.

### Targeting
- For targeted cards: select valid target with **most cards in hand**; tie → random.
- Exception: if any player used 도발 this round, that player becomes forced target.
- AoE cards (꼬리치기, 광폭, 날개짓, 지정 표식 resolution, 관통 화염) affect all eligible; no single-target selection.

### Pre-Reveal
- After the dragon's turn ends, the next card (or next N, matching phase count) is revealed face-up.
- Players can see revealed cards in the dragon info panel.
- 정찰 (player card) reveals one card beyond the currently revealed window.

### Defense-Pattern Map

| Attack Type | Defense Options |
|---|---|
| Adjacent (물기) | Move out of adjacency, 용비늘 방패 |
| Adjacent AoE (꼬리치기) | Move to non-adjacent cell, shield |
| Line (화염 숨결) | Hide-roll, 도발 redirection, exit row/col |
| Line-piercing (관통 화염) | Exit row/col entirely, shield |
| Charge | Exit the line path, shield |
| Marked cell (지정 표식) | Move off marked cell before resolution |
| Full board (광폭) | Shield, post-damage 응급처치 |
| Push / debuff (날개짓, 위협) | No mitigation, effect absorbed |

---

## 5. AI

### Dragon AI
- Card selection is deterministic (deck order + pre-reveal), so AI handles:
  - Target selection per rules above.
  - Direction choice (재배치, 돌진): prioritize positioning that brings the most players into the card's effective range; tie-break by most-cards-in-hand.
- Emits phase-transition events for UI effects.

### Ally AI — Priority-Based Rule System

Each ally AI evaluates its turn in this order. Highest-priority triggered action wins; within category, an action-scoring function picks best.

**Priority 1: Self-preservation**
- Self HP ≤ 1 AND 응급처치 in hand → use on self.
- Self HP ≤ 1 AND next revealed dragon card threatens self → use 숨기 or move off the threatened line/cell.
- 용비늘 방패 held: trigger passively on next lethal hit.

**Priority 2: Betrayal missions (Orc only)**
- If a betrayal action is available, execute it with **30% probability** (else pick a cooperative action to mask identity).
- "Eliminate 1 player" + adjacent low-HP ally + attack card in hand → attack ally.
- "All Xs eliminated" → passively let race X die (decline to shield them, steer dragon toward them when possible).

**Priority 3: Mission progress**
- Missions 1–2 steps from completion: weight those actions +20 to +30.
- Treasure-related mission holder: prefer draw-2 action.

**Priority 4: Dragon damage**
- Dragon HP ≤ 3 + self can reach/finish → attempt finishing attack.
- Dragon HP ≤ 5 + attack card in range → attack.

**Priority 5: Cooperation & positioning**
- Ally HP low + 응급처치 in hand + adjacent → heal.
- Move to interpose on dragon line (especially if Dwarf with "hide in place of ally" mission).

**Priority 6: Hand management (baseline)**
- Hand ≤ 2 → draw-2 action.
- Hand 4–6 with good card available → play.
- Otherwise → move toward useful position or draw.

### Action Scoring Weights

| Component | Weight |
|---|---|
| Survival defense | +100 |
| Dragon-finisher attack | +80 |
| Mission progress (scaled by remaining steps) | +5 to +30 |
| Betrayal (passes 30% filter) | +20 |
| Cooperation | +15 |
| Dragon damage (non-finisher) | +10 |
| Draw-2 (hand low) | +3 |

Ties broken randomly via seeded RNG.

### Determinism
- All AI randomness uses the seeded RNG (`rng.js`).
- Game start logs its seed; replaying with the same seed and input sequence reproduces outcomes.

---

## 6. Architecture & File Layout

### Directory Structure
```
10_DT/
├── index.html
├── css/
│   ├── styles.css
│   └── animations.css
├── js/
│   ├── main.js           entry point, init, binds events
│   ├── state.js          state shape + immutable update helpers
│   ├── engine.js         match/round/turn orchestration, action execution
│   ├── cards.js          card definitions + effect functions (player + dragon)
│   ├── missions.js       mission pools + progress evaluation + scoring
│   ├── races.js          race definitions + passive applications
│   ├── dragon-ai.js      dragon target + direction logic
│   ├── ally-ai.js        ally AI scoring + decision
│   ├── render.js         state → DOM (full re-render)
│   ├── input.js          user input handlers
│   ├── rng.js            seeded RNG
│   └── log.js            game log buffer + rendering
├── assets/               (optional)
└── tests/
    └── scenarios.md      manual test checklist
```

### Data Flow (unidirectional)
```
user input → engine mutates state via pure functions → render(state) → DOM
AI turn → ally-ai/dragon-ai decide → engine executes → render → next turn
```

- Single top-level state object (module-scoped, not global).
- All mutations flow through `engine.js` functions.
- `render.js` does a full re-render each frame (scope is small enough that diffing is unnecessary).

### State Shape
```js
state = {
  seed: 12345,
  matchIndex: 0,              // 0..2
  matchScores: [[], [], []],  // per-match per-player score breakdown
  round: 0,
  phase: 'setup' | 'rolling' | 'acting' | 'resolving' | 'match-end' | 'game-end',
  board: Array(3).fill(Array(5).fill(null)), // occupant id or null
  dragon: {
    hp, maxHp, phase,
    deck, discard, revealed,
    position: { r, c },
    markedCells: [ { r, c, resolvesOnRound } ]
  },
  players: [{
    id, name, race, isAI,
    hp, maxHp,
    hand: [...],
    position: { r, c },
    missions: { required, optional },
    missionProgress: { ... counters keyed by mission id },
    statusEffects: { hiddenThisRound, shieldActive, runeBonusNext, tauntActive },
    isEliminated: bool,
    dragonDamageDealt: 0
  }],
  turnOrder: [ ...playerIds, 'dragon', ... ],
  currentTurnIndex: 0,
  commonDeck: [...],
  commonDiscard: [...],
  log: [ { round, turn, actor, message } ]
}
```

### Purity & Testability
- `engine`, `cards`, `missions`, `races`, `*-ai` expose pure functions `(state, args) → newState`.
- Enables snapshot-based manual testing, replay, and future unit tests.

### Module Dependencies (no cycles)
```
main → engine → { cards, missions, races, dragon-ai, ally-ai, rng }
main → render ← state (read-only)
main → input → engine
render → log
```

### Round Sequence
1. `engine.startRound()` — roll order dice, compute `turnOrder`.
2. For each actor in turn order:
   - Player (human): wait for input, then `engine.executeAction(...)`.
   - Player (AI): `allyAi.decide(state, player) → action`, then `engine.executeAction(...)`.
   - Dragon: `dragonAi.resolve(state) → action(s)`, then `engine.executeDragonTurn(...)`.
   - After each action: update state, call `render(state)`, append log.
3. Round end check: dragon dead? party wipe? round count 30?
4. Next round or transition to match-end → score → next match or game-end.

---

## 7. UI & Testing

### Layout (single page)

```
┌───────────────────────────────────────────────────────────┐
│ Title  •  Match 1/3  •  Round 5  •  Phase 2   [Log]      │
├───────────────────────────────────┬───────────────────────┤
│                                   │  Dragon              │
│         3 x 5 Board               │  HP bar              │
│         (CSS Grid)                │  Phase indicator     │
│         🐉 user tokens            │  Revealed cards list │
│         💀 marked cells           │                      │
│                                   │  Turn order strip    │
├───────────────────────────────────┴───────────────────────┤
│ My info: race, HP, mission icons (hidden)                │
│ My hand (clickable): [card][card][card][card]            │
│ Actions: [Draw 2]  [Discard hand → swap missions]        │
├───────────────────────────────────────────────────────────┤
│ Log (collapsible)                                         │
└───────────────────────────────────────────────────────────┘
```

### Interactions
- Click a card → highlight the card + valid target cells on the board.
- Click a valid target → execute the action.
- Click the card again or outside the board → cancel selection.
- AI and dragon turns auto-advance with a 300 ms inter-action delay for readability.

### Visual Feedback
- Move-valid cells: blue border. Attack-valid: red border.
- Dragon attack path flashes red for 500 ms before damage resolution.
- Marked cells show 💀 with a pulsing animation.
- Phase transitions produce a full-screen red flash + log highlight.

### Accessibility
- Keyboard: `1`–`6` select a hand card, arrow keys move the board cursor, `Enter` confirms.
- Color contrast meets WCAG AA.

### Testing Strategy (MVP)
1. **Manual scenario checklist** (`tests/scenarios.md`):
   - Phase transitions occur at HP 10 and 5 precisely.
   - Move cards cannot target cells beyond listed range.
   - Moving into an ally's cell produces a swap.
   - Line-attack hide-roll triggers when an ally is on the dragon-line path.
   - "Killing blow on dragon" mission only credits the last-damage-dealer.
   - "All Elves eliminated" excluded from the pool when no Elves exist.
   - Draw-2 action available at hand ≤ 4, disallowed at 5+.
   - Hand-discard reassigns both missions.
   - Deck reshuffles from discard when empty.
   - Three-match totals sum correctly and winner is declared.
2. **Console scenarios** (optional):
   - Expose `window.runScenario(name)` that seeds RNG and runs a fixed sequence.
3. **Seeded reproducibility**:
   - Display the seed prominently; rerun with the same seed to reproduce bugs.

### Performance
- Board (15 cells), 5 players, 40-card deck, full re-render < 200 DOM nodes.
- CSS transitions for animation; no JS animation loops needed.

---

## 8. Open Items (future iterations, not MVP)

- Balance pass: HP values, damage numbers, mission point values, deck composition after playtests.
- Difficulty levels (easy/normal/hard via weight skew).
- Local hotseat for 3–5 humans sharing one screen.
- Online multiplayer via lightweight signaling server.
- Richer audio and animation.
- Card art and race portraits.
- Save/resume for interrupted matches.

---

## 9. Success Criteria

MVP is shippable when:
- A full 3-match game can be played end-to-end without console errors.
- Dragon phases transition correctly and card behavior matches this spec.
- AI party members act plausibly (survival, missions, dragon damage) without obvious griefing beyond betrayal missions.
- The manual scenario checklist passes 100%.
- A match completes in under 15 minutes of real time at comfortable pacing.
