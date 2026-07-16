# DragonTactics 업데이트 내역서

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