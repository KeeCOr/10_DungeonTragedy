# Dragon Tactics — Steam Achievements

---

## Stats

| API Name | Type | Description |
|----------|------|-------------|
| `STAT_GAMES_PLAYED` | INT | Total matches played |
| `STAT_GAMES_WON` | INT | Total victories |
| `STAT_DRAGONS_DEFEATED` | INT | Dragon bosses defeated |
| `STAT_MISSIONS_COMPLETED` | INT | Hidden missions completed |
| `STAT_CARDS_PLAYED` | INT | Total cards played |
| `STAT_TOURNAMENT_WINS` | INT | 3-match tournaments won |
| `STAT_RACES_PLAYED` | INT | Distinct races used |

---

## Achievements

| API Name | EN Name | KO Name | How to Unlock |
|----------|---------|---------|---------------|
| `ACH_FIRST_BLOOD` | First Blood | 첫 피 | Defeat the dragon for the first time |
| `ACH_TUTORIAL_DONE` | Dragonlore Student | 용의 전설 입문 | Complete the tutorial |
| `ACH_FIRST_MISSION` | Secret Agenda | 비밀 임무 | Complete a hidden mission |
| `ACH_MISSION_COLLECTOR` | Double Agent | 이중 요원 | Complete both missions in one match |
| `ACH_FIRST_TOURNAMENT` | Tournament Victor | 토너먼트 우승 | Win a 3-match tournament |
| `ACH_ALL_RACES` | Diverse Army | 다양한 군단 | Win at least once with each race (Human, Elf, Dwarf, Orc) |
| `ACH_HUMAN_WIN` | Human Resilience | 인간의 의지 | Win using a Human party |
| `ACH_ELF_WIN` | Elven Precision | 엘프의 정밀함 | Win using an Elf party |
| `ACH_DWARF_WIN` | Dwarven Endurance | 드워프의 인내 | Win using a Dwarf party |
| `ACH_ORC_WIN` | Orcish Fury | 오크의 분노 | Win using an Orc party |
| `ACH_FAST_WIN` | Lightning Campaign | 번개 원정대 | Win a match in under 10 minutes |
| `ACH_NO_DEATHS` | Untouchable | 무적의 원정대 | Win a match without any hero dying |
| `ACH_CARD_MASTER` | Card Sharp | 카드의 달인 | Play 200 cards total across all matches |
| `ACH_COMEBACK` | Dragon Slayer's Will | 용사냥꾼의 의지 | Win a match after losing 3 heroes |
| `ACH_VETERAN` | Dragon Tactics Veteran | 베테랑 전술가 | Win 20 matches total |

---

## Implementation Notes

- Steam API: `ISteamUserStats`
- All achievements unlockable in single-player
- Race-based achievements require tracking which race is active at match start
- `ACH_NO_DEATHS` requires tracking hero death count per match (reset on new match)
- `ACH_CARD_MASTER` uses `STAT_CARDS_PLAYED` cumulative counter
- Replace App ID 480 with real Steamworks App ID before submission
