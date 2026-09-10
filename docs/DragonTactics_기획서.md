# DragonTactics 기획서 (Game Design Document)

> 현재 문서 기준 버전: 0.6.1  
> 최종 갱신: 2026-09-10

---

## v0.6.1 Battlefield Label Readability Fix (2026-09-10)

- 동일 depth의 전장 UI 라벨 버그를 수정했다: `.self-label`과 `.cell-hp`가 최소 스테이지 배율에서 0.32em(약 3.6px)까지 축소되어 상속되던 문제를 해결했다.
- 두 라벨 모두 0.56rem~0.72rem 반응형 clamp, 고정 단위 line-height, `white-space: nowrap`을 적용해 최소 크기에서도 읽을 수 있게 했다.
- HP 숫자는 tabular figures(`font-variant-numeric: tabular-nums`)로 표시하며, self label은 상단 중앙, HP는 상단 우측에 각각 고정되어 공유 z-index 3 안에서 겹치지 않는다.
- 계약 테스트 4종을 추가해 읽기 가능한 clamp 값, 라벨 앵커링/비중첩, 공유 depth(z-index), `DragonTactics_v${version}_portable.exe` 네이밍 계약을 검증한다.
- 검증: `npm test` 통과, 189 tests, 0 failures.
- 로컬 한글 지원 폰트 동작과 아틀라스/패널 크기는 이번 패치에서 변경하지 않았다.

---

## v0.6.0 Audio & Activation Feedback Update (2026-09-08)

- Dragon activation UX compares the forecast and last result using the same Damage/Risk metrics, and stores `forecastDamage` plus `damageDelta` in `lastActivationSummary` so the next choice can be evaluated against the actual outcome.
- Eight real Kenney CC0 OGG files are mapped to BGM and UI/action/danger/success/failure/transition/recovery cues.
- BGM begins after the first trusted user gesture; BGM and SFX volume/mute settings persist independently.
- Visibility lifecycle pauses and resumes BGM safely, SFX polyphony is capped at eight, and danger/result cues duck BGM for about 350 ms.
- The packaged Electron app loads through its local `127.0.0.1` HTTP server rather than `file://`.


## 1. 게임 개요

| 항목 | 내용 |
|------|------|
| **타이틀** | Dragon Tactics |
| **장르** | 전술 카드 게임 (턴제, vs AI) |
| **플랫폼** | Steam (Windows) 1차, 브라우저 웹 현재 |
| **기술 스택** | 순수 HTML/CSS/JavaScript + Node 정적 서버 + Electron 래퍼 |
| **타깃 세션** | 10~20분 |
| **연령 등급** | PEGI 3~7 / ESRB E10+ / GRB 전체이용가 |
| **레퍼런스** | Into the Breach |

---

## 2. 문제 정의

짧은 시간에 전략 퍼즐을 즐기려는 PC 인디 전략 플레이어에게, 기존 카드 전술 게임에서 "보스 패턴을 알고도 최적 이동 결과가 충분히 명확하지 않아 내 선택이 틀렸다는 감각이 생기기 어렵다"는 문제가 있다.

DragonTactics는 드래곤의 다음 공격을 알고, 아군 위치와 카드 1장 선택으로 피해를 줄이거나 보상을 챙기는 3×5 보드 전술 게임이다.

---

## 3. 주 페르소나

- **이름**: 이승빈, 35세, 기획자 과장
- **선호 장르**: Into the Breach 격자 전술, 짧은 PC 인디 전략 게임
- **사용 맥락**: 퇴근 후 10~20분 안에 한 판을 집중해서 플레이한다.
- **기대**: 드래곤 공격 예고, 예상 피해, 실제 결과가 한눈에 보여서 다음 판단이 납득 가능해야 한다.

---

## 4. 핵심 루프

```
드래곤의 공개된 공격 카드 & 위협 영역 확인
  → 패에서 이동 / 공격 / 방어 / 치유 / 정찰 / 폭발 / 보물 중 1장 선택
    → 보드 위치 & 미션 조건 고려해 행동 실행
      → 드래곤 턴: 공개 카드 해결, HP/피해/탈락 여부 갱신
        → 결과 요약 + 다음 공격 예리뷰 확인 후 다음 턴 판단
```

---

## 5. 게임 구성

| 요소 | 내용 |
|------|------|
| **보드** | 3열 × 5행 CSS Grid |
| **드래곤** | 보드 최상단 존재. 열/전체/모서리 패턴 공격 |
| **플레이어** | 1명 + AI 아군 2~4명 |
| **종족** | Human, Elf, Dwarf, Orc |
| **카드** | 이동, 공격, 방어, 치유, 정찰, 폭발, 보물 |
| **진행** | 3매치 토너먼트, 드래곤 처치 목표 점수 |
| **미션** | 공통 미션 + 종족 미션, 필수/선택 미션 |

### 5.1 카드 종류

| 카드 | 효과 |
|------|------|
| 이동 | 자신 또는 아군 유닛 N칸 이동 |
| 공격 | 드래곤에게 직접 피해 |
| 방어 | 드래곤 공격 피해 감소 (Shield) / 회피 (Hide) |
| 치유 | 자신 또는 아군 HP 회복 |
| 정찰 | 드래곤 다음 공격 미리 공개 |
| 폭발 | 보드 범위 내 드래곤 피해 + 자기 피해 가능 |
| 보물 | 즉시 자원/점수 획득 |

### 5.2 드래곤 공격 패턴

- **열 공격**: 지정 열 전체 유닛에 피해
- **전체 공격**: 보드 전체 범위 피해
- **모서리 공격**: 코너 4칸 집중 피해
- 공격 카드는 **공개 상태**로 다음 턴 시작 전 드래곤 패널에 표시됨 → 플레이어가 예측하고 대응 가능

---

## 6. v0.4.0 핵심 개선 (Preview & Last Result)

### 6.1 드래곤 활성화 Preview 패널

드래곤 턴 실행 전, `getDragonActivationPreview(state)`가 계산한 예측 피해를 **Preview** 패널로 표시한다.

- 예상 피해 대상자
- 예상 피해량
- Shield/Hide 효과 시뮬레이션
- 위협 데칼 아틀라스 3슬롯으로 위협 영역 시각화

### 6.2 드래곤 활성화 Last Result 패널

드래곤 턴 실행 후, `executeDragonTurn()`이 `dragon.lastActivationSummary`에 저장한 결과를 **Last Result** 패널로 표시한다.

- 실제 피해량 (forecastDamage 대비 damageDelta 포함)
- 탈락 여부
- 예측 vs 실제 비교 (왜 예측과 달랐는지 짧은 이유)

### 6.3 타이밍 튜토리얼 시나리오

조기 사용 / 지연 사용 / 기회 상실 케이스 3개를 자동 플레이 테스트로 추가.

---

## 7. UI/HUD 규칙

- 위협 데칼: 토큰, HP, 보상, 피해 숫자보다 낮은 레이어에 배치.
- 드래곤 패널: **Preview** → 공개 카드 → **Last Result** 순서로 읽힌다.
- 플레이어의 주요 행동 선택은 카드 사용 또는 이동 계열 행동 1개로 제한.
- 버튼 최소 44px 클릭 영역 보장.
- 긴 텍스트는 패널 안에서 줄바꿈하되 보드 위 핵심 수치를 가리지 않는다.

---

## 8. 기술 아키텍처

### 8.1 스택

| 계층 | 선택 | 역할 |
|------|------|------|
| 게임 로직 | 순수 JavaScript (ES Module) | 보드 상태, 카드 해석, 드래곤 AI |
| 렌더링 | HTML/CSS Grid | 3×5 보드 |
| 서버 | Node.js HTTP 서버 | 정적 파일 서빙 (개발/웹 배포) |
| 데스크톱 | Electron (`electron/main.cjs`) | Windows 실행파일 래퍼 |
| Steam | steamworks.js | Steam 통합 (graceful fallback) |
| 빌드 | electron-builder | NSIS 인스톨러 + portable |

### 8.2 Electron 구조

```
10_DT/
├── electron/
│   ├── main.cjs       # BrowserWindow, Node HTTP 서버 시작, ipcMain
│   ├── preload.cjs    # contextBridge 노출
│   └── package.json   # type: commonjs (root의 type:module 오버라이드)
├── public/            # 정적 에셋 (atlas PNG 등)
├── src/               # 게임 소스
└── package.json       # main: electron/main.cjs, build 설정
```

**참고**: 루트 `package.json`의 `"type": "module"` 선언 때문에 Electron main/preload 파일을 `.cjs` 확장자로 작성하고 `electron/package.json`에서 `{"type": "commonjs"}`로 오버라이드한다.

### 8.3 Steam 통합

- **앱 ID**: 480 (개발용 Spacewar ID) → 출시 전 실제 ID 교체
- `steam_appid.txt`로 로컬 SDK 연결
- Achievements: `window.steamAchievement.unlock(id)`
- Steam 미설치 환경에서도 `steamworks.js` graceful fallback으로 정상 동작

### 8.4 IPC 인터페이스

```javascript
window.steam.isAvailable()              // Boolean
window.steam.getUserName()              // String
window.steamAchievement.unlock(id)      // Promise<Boolean>
window.steamAchievement.isUnlocked(id)  // Boolean
```

---

## 9. 리소스 목록

| 파일 | 용도 |
|------|------|
| `public/assets/dragon-type-atlas.png` | 드래곤 타입 메달리온 |
| `public/assets/dragon-fullbody-atlas.png` | 보스 풀바디 배경 아틀라스 |
| `public/assets/race-token-atlas.png` | 보드 토큰 |
| `public/assets/race-portrait-atlas.png` | 아군/플레이어 초상 |
| `public/assets/skill-icon-atlas.png` | 카드 아이콘 |
| `public/assets/ui-button-frame-atlas.png` | 액션 버튼 프레임 |
| `public/assets/threat-marker-decal-atlas.png` | 드래곤 위협 영역 데칼 |

---

## 10. 플랫폼 및 배포

### 10.1 Steam (1차)

- **빌드 타입**: NSIS 인스톨러 + Portable EXE
- **앱 ID**: `com.stoic.dragontactics`
- **등급**: PEGI 3~7, ESRB E10+, GRB 전체이용가
- **스토어 에셋**: `docs/store-description.md`, `docs/store-description-ko.md`
- **개인정보처리방침**: `docs/privacy-policy.md`

### 10.2 IARC 설문 요약

| 항목 | 응답 |
|------|------|
| 폭력 | 경미 (판타지 카드 전투, HP 수치만 표현) |
| 성적 콘텐츠 | 없음 |
| 공포 | 없음 (드래곤은 판타지 몬스터) |
| 도박 | 없음 |
| 온라인 기능 | 없음 (오프라인 싱글) |
| 인앱 구매 | 없음 |

---

## 11. 빌드, 테스트, 실행

```bash
# 테스트
npm test          # 161 tests, 0 failures (2026-07-16 기준)

# 개발 실행 (브라우저)
npm start
# 또는
npm run serve

# Electron 개발 실행
npm run electron

# Steam 포함 배포 빌드
npm run electron:build
```

---

## 12. 남은 리스크 & 다음 우선순위

1. **Electron/Vite 기반 브라우저 빌드 구성** — Steam 데스크톱 출시를 위한 패키징.
2. **Into the Breach와의 차별화 명확화** — 하드코어 경쟁 대신 타이밍 기반 직관성으로 포지셔닝.
3. **SVG/코드 자산 교체** — 현재 인라인 SVG 리소스를 실제 PNG 아틀라스로 교체.
4. **결과 설명 강화** — "왜 이 피해가 들어왔는가"를 한두 문장으로 리플레이하는 기능 추가.
5. **실제 Steam 앱 ID 발급** — 480 → 실제 ID 교체.

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-09-10 | v0.6.1 전장 라벨 가독성 수정: `.self-label`/`.cell-hp` 반응형 clamp, tabular-nums, 계약 테스트 4종 추가 (189 tests) |
| 2026-09-03 | Electron/Steam 통합, 플랫폼 배포 섹션 추가; 인코딩 깨짐 수정, GDD 전체 구조 개편 |
| 2026-07-27 | Dragon activation UX: forecastDamage/damageDelta를 lastActivationSummary에 저장 |
| 2026-07-16 | v0.4.0 검증 완료 (161 tests pass); UTF-8 문서 재작성 |
| 2026-06-29 | v0.4.0 위협 마커 데칼 아틀라스 적용 |
| 2026-06-29 | v0.3.0 드래곤 활성화 Preview / Last Result 패널 도입 |
