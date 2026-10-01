# DragonTactics 업데이트 내역서

## 2026-09-23 v0.4.1 드래곤 전술 과제 결과

- 첫 조우 브리핑의 5종 전술 과제를 실제 매치 상태로 판정해 결과 화면에 연결했다.
- 점수표 위에 과제 달성/재도전, 판정 근거, 다음 판단을 표시하고 데이터 누락 복구 상태를 추가했다.
- 긴 텍스트와 560px 이하 세로 적층, 색 외 결과 텍스트와 `aria-label`을 적용했다.
- 변경 파일: `js/dragons.js`, `js/main.js`, `css/styles.css`, `tests/dragons.test.js`, `package.json`, `package-lock.json` 및 관련 문서.
- 검증: `npm test` 168/168 통과, 변경 JS 구문 검사 통과. build 스크립트가 없어 빌드는 미실행이다.
- Impeccable 검사에서 기존 CSS 경고 4건이 남았으며 이번 추가 영역의 신규 경고는 없다. 실제 화면 수동 시각 검증은 미완료다.

## 2026-09-21 v0.4.0 드래곤 첫 조우 브리핑

- 목표 예시 화면: `docs/design-references/2026-09-21-first-dragon-encounter-brief.png`.
- 각 매치 시작 전에 드래곤 역할, 유리한 전장 대응, 전술 과제를 필수·선택 미션과 함께 표시한다.
- 드래곤별 첫 확인을 localStorage에 저장하고 재조우에서는 전술 재확인 상태로 표시한다.
- 레이아웃/컴포넌트: 기존 미션 공개 패널, 드래곤 메달리온, 미션 카드를 재사용하고 560px 이하에서 한 열로 적층한다.
- 데이터/상태: 5종 한국어 브리핑, 첫 조우·재조우·긴 텍스트·좁은 화면을 다룬다. 네트워크 로딩·오류 경로는 없다.
- 변경: `js/dragons.js`, `js/main.js`, `css/styles.css`, `tests/dragons.test.js`, `tests/mission-reveal.test.js`와 관련 문서.
- 검증: `npm test` 165/165 통과. 별도 build 스크립트 없음. 실제 화면 수동 시각 검증은 미완료다.

## 2026-07-16 v0.4.0 검증 및 문서 정리
- 드래곤 활성화 Preview / Last result 개선분을 재검증했다.
- 런타임에 노출될 수 있는 깨진 문자열을 ASCII 기반 문구로 정리했다.
- 기획서 MD/HTML을 UTF-8 문서로 재작성해 HTML 확인용 문서 가독성을 복구했다.
- 검증: `npm test` 통과, 161 tests, 0 failures.
- 빌드/릴리스: 현재 별도 build/release 스크립트 없음. `npm start` 또는 `npm run serve`로 실행한다.

## 2026-06-29 v0.4.0 Threat Marker Decal Atlas
- 공개된 드래곤 공격 셀에 3슬롯 위협 데칼 아틀라스를 적용했다.
- 토큰, HP, 피해 숫자는 데칼보다 위 레이어에 유지한다.

## 2026-06-29 v0.3.0 Dragon Activation Preview And Summary
- 드래곤 활성화 전 예상 피해와 대상자를 표시한다.
- 드래곤 턴 후 실제 피해와 탈락 여부를 요약한다.
- 조기, 지연, 기회 상실 튜토리얼 시나리오 3개를 추가했다.
