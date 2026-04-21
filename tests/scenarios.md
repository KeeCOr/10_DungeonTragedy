# Manual Scenario Checklist

Run `npm run serve` (requires python3) or any other static server, then open http://localhost:8000. Work through each scenario; when a step fails, copy the printed seed and file a bug.

## Boot & basic loop
- [ ] Page loads without console errors
- [ ] Seed printed to console
- [ ] Board shows 15 cells, dragon at center, 3 player tokens on edges
- [ ] HUD shows "Match 1/3 · Round 1 · Dragon Phase 1"
- [ ] Player hand shows 3 cards
- [ ] Turn order strip shows 4 entries (3 players + dragon)

## Move card
- [ ] Clicking a "이동 1" card highlights adjacent cells
- [ ] Clicking an out-of-range cell does nothing
- [ ] Clicking an adjacent empty cell moves the token and consumes the card
- [ ] Moving into an ally cell swaps positions
- [ ] Attempt to move onto dragon cell is rejected (no state change)

## Attack card
- [ ] "공격 1" card highlights adjacent dragon/ally cells
- [ ] Attacking dragon reduces dragon HP by 1
- [ ] Elf character dealing attack shows +1 effective range highlight
- [ ] Orc character attack reduces HP by 2 (1 + 1 orc bonus)

## Utility cards
- [ ] Hide card plays immediately, no target prompt
- [ ] Scout reveals one more dragon card
- [ ] Taunt plays immediately and sets status (validated in dragon targeting below)
- [ ] Heal on self restores 1 HP (capped at max)
- [ ] Heal target prompt only highlights self + adjacent allies

## Draw & mission swap
- [ ] Draw-2 button disabled when hand > 4
- [ ] Draw-2 adds 2 cards to hand
- [ ] Swap missions clears hand and assigns new missions

## Dragon phases
- [ ] Dragon HP 15→10 triggers phase 2 (reveals 2 cards, takes 2 actions)
- [ ] Dragon HP 10→5 triggers phase 3 (reveals 3 cards, takes 3 actions)
- [ ] Phase transition triggers the red screen flash

## Dragon AI card-specific
- [ ] Bite: targets most-hand adjacent player
- [ ] Breath on line with ally blocker triggers hide-roll
- [ ] Piercing row damages every player in the row
- [ ] Mark places a 💀 on a cell; following turn, cell + 4-adjacent take 2 dmg
- [ ] Charge moves dragon 2 cells and damages path

## Treasures
- [ ] Sword reduces dragon HP by 3
- [ ] Potion fully heals self
- [ ] Cloak moves 1–2 cells outside turn action
- [ ] Shield: next hit is negated
- [ ] Rune: next dice roll (turn order) shows +2 effect

## Missions & scoring
- [ ] Orc "All Elves eliminated" mission absent from pool when no elves present (check console via state dump)
- [ ] Killing dragon triggers "Human: killing blow" credit
- [ ] Match-end summary prints per-player score

## Match/game flow
- [ ] Dragon HP 0 → match ends, alert shows scores
- [ ] Party wipe → match ends
- [ ] Game-end alert shows totals across 3 matches
