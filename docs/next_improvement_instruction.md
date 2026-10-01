# DragonTactics Next Improvement Instruction

Date: 2026-06-24

## Goal
Turn the current biggest project issue into a small, executable improvement batch. This file is intentionally scoped so the next worker can start without rereading the whole workspace audit.

## Instructions
1. Make dragon activation the centerpiece: preview expected impact before use and summarize actual result after use.
2. Add three tutorial scenarios focused on timing: early dragon use, delayed dragon use, and missed opportunity.
3. Replace or document any runtime SVG/code-drawn dragon, board, or VFX resources before visual polish work.

## Completion Rules
- Do not include discarded projects in this batch.
- If gameplay, UI, systems, content, controls, build behavior, or project scope changes, update the project planning document and update log before build/release.
- If runtime source changes, run the nearest available validation and then perform the required build/package step from the project instructions.
- If a folder or asset looks ambiguous, document the decision instead of deleting it.

## 2026-06-30 Completion Note
- Completed as v0.4.0: dragon activation preview, actual activation summary, three timing tutorial scenarios, and runtime resource documentation are present.
- Validation rerun in this batch: `npm test` passed 161 tests.
- Build note: this project is a static web/Node server project with no package build script; run `npm start` or `npm run serve` to serve the refreshed source.

## 2026-07-02 Recheck Note

- Re-ran `npm test`; 161 tests passed.
- No new runtime blocker was found in the current automated suite.
- Keep any hold/critical label tied to explicit strategic scope or content-depth concerns, not to an unresolved dragon-feedback regression.


## 2026-09-18 전체 프로젝트 공통 완료 조건

1. **첫 5분 핵심 루프**: 시작 10초 안에 목표가 읽히고, 5분 안에 첫 판단→실행→결과→보상/손실→다음 목표가 한 번 완결되어야 한다.
2. **판단 전후 피드백**: 선택 전 예상 이득·위험·비용, 실행 직후 성공·실패·상태 변화, 결과 화면의 원인·변화·다음 점검 행동을 같은 흐름으로 제공한다. 정답을 자동 추천하지 않는다.
3. **출시 증거 패키지**: 테스트·빌드·첫 5분 수동 확인·대표 실행 화면·로딩/빈 상태/오류/저장 복귀·버전과 검증 날짜를 기록한다. 수행하지 않은 항목은 미검증으로 표시한다.

공통 기준 원문: `C:\Development\_workspace_docs\전체_프로젝트_공통_개선기준_2026-09-18.md`

## 2026-09-18 프로젝트별 고유 개선 3개
> 아래 세 항목은 이 프로젝트의 고유 우선순위다. 구현 후에만 완료로 표시한다.

1. 드래곤 스킬 사용 전 예상 피해와 위험도 표시
2. 사용 전후 전황을 동일한 지표로 비교
3. [완료·자동 검증] 드래곤별 역할과 유리한 전장을 첫 조우 시 브리핑하고 드래곤별 확인 상태 저장

### 2026-09-21 완료 근거

- 예시 화면: `docs/design-references/2026-09-21-first-dragon-encounter-brief.png`
- 구현: `js/dragons.js`의 5종 한국어 브리핑 데이터, `js/main.js`의 첫 조우·재조우 패널, `css/styles.css`의 좁은 화면 적층
- 자동 검증: `npm test` 165/165 통과
- 빌드: package.json에 build 스크립트가 없어 미실행
- 미검증: 실제 데스크톱·좁은 폭 수동 시각 확인과 체험 과제 성공 여부의 결과 화면 연결

### 2026-09-23 완료 근거

- [완료] 첫 조우 체험 과제 성공·실패를 매치 결과 화면에 연결했다.
- [완료] 5종 드래곤별 판정 근거와 다음 판단, 데이터 누락 복구 상태를 구현했다.
- 검증: `npm test` 168/168 및 변경 JS 구문 검사 통과. build 스크립트 없음.
- 미검증: 실제 데스크톱·560px 이하 화면 시각 확인.
- 다음 후보: 결과의 판정 근거를 해당 턴 전투 로그로 다시 찾아갈 수 있게 연결한다.
