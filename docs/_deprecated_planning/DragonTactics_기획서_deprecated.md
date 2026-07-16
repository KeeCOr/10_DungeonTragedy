# DragonTactics 기획서

문제 정의: 턴제 전술 플레이어가 카드 운과 위치 판단을 함께 쓰는 압축된 보스전을 원한다.

## 게임 소개
카드와 보드 전술로 드래곤을 상대하는 턴제 전략 게임.

DragonTactics의 핵심 매력은 한 번의 선택이 다음 장면의 위험도, 보상, 성장 방향으로 이어지는 구조다. 이 문서는 처음 보는 사람에게 게임의 재미와 현재 방향을 빠르게 소개하기 위한 단일 기획서이며, 세부 변경 이력은 별도 업데이트 내역서에서 관리한다.

## 한 줄 소개
카드와 보드 전술로 드래곤을 상대하는 턴제 전략 게임.

## 핵심 루프
유저가 현재 전장의 정보를 읽고 선택을 하면 전투/운영 결과가 갱신되고, 그 보상과 손실 때문에 다시 다음 선택을 준비한다.

## 게임 플레이 예시
- 1단계: 플레이어가 DragonTactics의 현재 목표, 보유 자원, 즉시 대응해야 할 위험을 확인한다.
- 2단계: 카드, 유닛, 배치, 명령, 이동 중 현재 상황에 맞는 핵심 행동을 선택한다.
- 3단계: 선택 결과가 전투, 운영, 보상, 손실로 즉시 갱신되고 다음 판단의 근거가 된다.
- 4단계: 획득한 보상이나 변화한 상태를 바탕으로 다음 선택을 준비하며 핵심 루프를 반복한다.
- 플레이 감각: 짧은 세션 안에서 상황 파악, 의미 있는 선택, 즉각적인 피드백, 다음 목표 제시가 끊기지 않는 흐름을 지향한다.

## 핵심 재미
- 읽기 쉬운 상황 판단: 지금 위험한 요소와 얻을 수 있는 보상이 한눈에 들어온다.
- 직접적인 선택 피드백: 선택 직후 전투, 점수, 자원, 성장 상태가 변해 손맛을 만든다.
- 누적되는 성장감: 반복 플레이가 단순 재시작이 아니라 다음 전략의 재료로 이어진다.

## 주요 시스템
- 핵심 선택 시스템: 현재 국면에서 가능한 행동을 5개 이하의 명확한 선택지로 제시한다.
- 위험/보상 피드백: 행동 전후의 이득, 손실, 위협 변화를 빠르게 보여준다.
- 성장과 해금: 세션 결과가 능력, 카드, 유닛, 건물, 장비, 스테이지 등 다음 플레이의 선택지를 넓힌다.
- 상태별 UX: 로딩, 빈 상태, 오류, 많은 데이터, 긴 텍스트 상황에서도 레이아웃이 무너지지 않도록 관리한다.
- 실행 안정성: 테스트와 빌드 산출물을 기준으로 현재 플레이 가능한 범위를 계속 확인한다.

## 게임 구성과 규칙 (GDD 통합)
- 통합 기준 문서: `superpowers/specs/2026-04-21-dragon-tactics-design.md`
- 작성 기준: 16_PokerStrike_GDD처럼 화면 구조, 핵심 시스템, 진행/승패 규칙, UI/HUD, 미결 항목을 한 문서에서 바로 읽을 수 있게 정리한다.

### 화면/플레이 구조
- **1. Overview** (superpowers/specs/2026-04-21-dragon-tactics-design.md)
  - A turn-based card + board game for the browser. A single human player commands a party against a 3-phase dragon boss on a 3x5 grid. AI fills the remaining 2–4 party slots. Players hold hidden race-king missions, some cooperative, some adversarial. Three matches are played and scores are tallied for final victory.
- **Board** (superpowers/specs/2026-04-21-dragon-tactics-design.md)
  - **3 rows × 5 columns** grid, rendered via CSS Grid.
  - Dragon starts at **center cell (row 2, col 3)**.
  - Players start on edge cells, no overlap.
  - One occupant per cell. Moving into an ally's cell **auto-swaps** positions.
- **Layout (single page)** (superpowers/specs/2026-04-21-dragon-tactics-design.md)
  - ┌───────────────────────────────────────────────────────────┐
  - │ Title • Match 1/3 • Round 5 • Phase 2 [Log] │
  - ├───────────────────────────────────┬───────────────────────┤
  - │ │ Dragon │
  - │ 3 x 5 Board │ HP bar │
  - │ (CSS Grid) │ Phase indicator │
  - │ 🐉 user tokens │ Revealed cards list │

### 핵심 시스템
- **In scope (MVP)** (superpowers/specs/2026-04-21-dragon-tactics-design.md)
  - Single-player with 2–4 AI party members
  - 3-match tournament, aggregated score
  - Rule-based dragon AI + rule-based ally AI
  - Shared player deck + dragon-only deck
  - 4 races with passive abilities
  - Hidden missions (1 required + 1 optional per player)
- **Out of scope** (superpowers/specs/2026-04-21-dragon-tactics-design.md)
  - Online / local multiplayer
  - Advanced AI (MCTS, minimax)
  - Rich audio / animation
  - Persistence, accounts, i18n
- **Player Deck (40 cards, shared)** (superpowers/specs/2026-04-21-dragon-tactics-design.md)
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
- **Assignment Rules** (superpowers/specs/2026-04-21-dragon-tactics-design.md)
  - Race-targeting missions (e.g., "All Elves eliminated") are excluded from the pool **if no player of that race is present** in the match.
  - Orc adversarial missions (marked "Required only") cannot occupy the optional slot.
  - Missions from the combined pool are drawn without replacement for the pair (required + optional are distinct missions).

### 진행/승패 규칙
- **Common Pool (shared by all races, 7 missions)** (superpowers/specs/2026-04-21-dragon-tactics-design.md)
| Mission | Points |
|---|---|
| Use 공격 cards 5 times | 2 |
| Move a cumulative 10 cells | 2 |
| Deal at least 1 damage to the dragon during phase 1 (contributed to phase 2 transition) | 3 |
| Perform the draw-2 action 3 times | 2 |
| Use the hand-discard mission-reassign once in a match | 1 |
- **Defense-Pattern Map** (superpowers/specs/2026-04-21-dragon-tactics-design.md)
| Attack Type | Defense Options |
|---|---|
| Adjacent (물기) | Move out of adjacency, 용비늘 방패 |
| Adjacent AoE (꼬리치기) | Move to non-adjacent cell, shield |
| Line (화염 숨결) | Hide-roll, 도발 redirection, exit row/col |
| Line-piercing (관통 화염) | Exit row/col entirely, shield |
| Charge | Exit the line path, shield |

### UI/HUD/피드백
- **Dragon Tactics — Design Spec** (superpowers/specs/2026-04-21-dragon-tactics-design.md)
  - **Date**: 2026-04-21
  - **Project**: 10_DT (Dragon Tactics)
  - **Platform**: Web browser (vanilla HTML/CSS/JS, no build tools)
  - **Scope**: Single-player MVP
- **Mission Structure** (superpowers/specs/2026-04-21-dragon-tactics-design.md)
  - Per race: **race-specific pool of 4–8** + **shared common pool of 7** = combined pool.
  - Match start: assign **2 missions per player** (1 required + 1 optional) randomly from the combined pool.
  - Missions are **hidden** from other players.
  - Per-mission points vary by difficulty.
  - **Mission reassignment**: discarding entire hand on your turn reassigns both missions.
- **Race-Specific Pools** (superpowers/specs/2026-04-21-dragon-tactics-design.md)
  - **인간 (Human)**
| Mission | Points |
|---|---|
| Land the killing blow on the dragon | 5 |
| All allies alive at match end | 4 |
| Use 응급처치 3 times | 2 |
| End match at full HP | 2 |

### 구현 메모/미결
- **보강 필요** (기획서)
  - 별도 GDD 또는 디자인 스펙이 없으므로, 다음 문서 갱신 시 세부 규칙과 수치표를 추가해야 한다.

## MVP 가설
| 기능 | 검증할 가설 | 검증 방법 |
|------|-------------|-----------|
| 핵심 전투/운영 루프 | 플레이어는 한 판 안에서 선택 결과를 이해하면 다음 판을 자발적으로 시작한다. | 1회 플레이 후 재시작률 60% 이상 |
| 위험/보상 표시 | 위험과 보상이 동시에 보이면 선택 시간이 줄고 납득도가 오른다. | 주요 선택 평균 8초 이내, 결과 불만 피드백 20% 이하 |
| 성장 보상 | 보상이 다음 전략을 바꾸면 반복 플레이 피로가 낮아진다. | 3판 내 서로 다른 빌드 선택률 50% 이상 |

## 레퍼런스 분석
- 장르 기준 레퍼런스는 한 판 시작까지 3단계 이내, 첫 의미 있는 선택까지 30초 이내가 목표다.
- 적용 교훈: 규칙 설명보다 먼저 선택 가능한 상황을 보여주고, 결과 화면에서 다음 판의 개선 포인트를 바로 제안한다.

## 현재 개발 상태 예상 수치
- 완성 목표 대비 구현 체감도: 약 50%
- 첫 세션에서 핵심 루프가 전달될 가능성: 약 56%
- UI/리소스 일관성 체감: 약 46%
- 콘텐츠와 반복 플레이 분량 충족도: 약 46%
- 빌드/실행 안정성 기대치: 약 40%
- 해석 기준: 현재 문서, 최근 산출물 기록, 연결된 예시 이미지 유무를 기준으로 한 사전 추정치이며 실제 플레이 테스트 후 ±15%p 정도 보정이 필요하다.

- 첫 세션 평균 플레이 시간 8분 이상
- 첫 세션 내 2회차 진입률 55% 이상
- 핵심 선택 화면에서 무응답/이탈률 15% 이하

## 현재 구현 상태
- 이 문서는 2026-06-24 기준으로 현재 플레이 방향과 구현 체감 상태를 요약한다.
- 핵심 루프, 조작 원칙, 리소스 적용 현황, 빌드 기준은 프로젝트별 실제 구현과 산출물 기록을 기준으로 계속 보정한다.
- 세부 변경 이력은 별도 업데이트 내역서에서 관리하고, 본 기획서는 처음 보는 사람이 현재 방향을 빠르게 이해하는 공유 문서로 유지한다.
- 새 기능, 밸런스 변경, 리소스 교체, UX 개선이 들어가면 본문과 HTML 문서를 함께 갱신한다.

## 조작과 UX 원칙
- 주요 버튼은 44px 이상으로 유지하고, 화면당 CTA 강조색은 하나만 사용한다.
- 버튼/선택지는 한 번에 5개 이하로 노출해 판단 부담을 줄인다.
- 로딩, 빈 상태, 에러, 많은 데이터, 긴 텍스트 상태를 각각 별도 화면/컴포넌트로 확인한다.
- HUD 동일 레이어 요소는 겹치지 않게 배치하고, 겹침이 필요한 효과는 별도 depth/z-order를 쓴다.

## 적용 리소스
- 런타임에 쓰이는 대표 이미지와 UI 리소스는 프로젝트별 asset/public/Resources 경로를 기준으로 관리한다.
- 새 이미지가 필요할 때는 프로젝트 접두어를 포함한 lowercase kebab-case 파일명을 사용한다.
- 최종 런타임 비주얼은 PNG/WebP 등 비트맵 자산을 우선 사용하고, SVG 또는 코드 드로잉은 문서/임시 참조로만 남긴다.

## 공유용 이미지 미리보기
![DragonTactics 공유용 예시 1](DragonTactics_01_플레이예시.png)

![DragonTactics 공유용 예시 2](dragon-tactics-layout-preview.png)

![DragonTactics 공유용 예시 3](dragon-tactics-raid-preview.png)

- docs/dragon-tactics-raid-preview.png
- docs/DragonTactics_01_플레이예시.png
- docs/DragonTactics_레퍼런스_layout-preview.png

## 빌드, 테스트, 릴리스
- npm test
- 현재 문서 기준 버전: 0.2.0

## 남은 리스크와 다음 우선순위
- 첫 화면에서 게임의 목표와 다음 행동이 5초 안에 보이는지 확인한다.
- 주요 선택의 결과 예측과 실제 결과가 어긋나는 지점을 플레이 테스트로 수집한다.
- 기획서에 남아 있던 변경 이력성 내용은 업데이트 내역서로 계속 이동해 소개 문서의 밀도를 유지한다.
