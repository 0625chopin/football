// D-03 ② 시드 고정 스냅샷 스위트 골격 (docs/require/06-prioritization-and-risks.md).
// 대상: 경기 100건 + 시즌 3건, 동일 match_seed 재실행 시 이벤트 로그 바이트 단위 동일성(KPI-3).
//
// 이 디렉터리(src/__suites__/)는 D-03이 근거인 H-03(3단 머지 게이트)의 6종 분류 골격이며,
// D-03 자체가 프로젝트 전역 게이트라 sim 전용이 아니다(13일차 1차 교차 점검, 2팀 지적으로
// src/lib/sim/__suites__/에서 이 위치로 이동 — 2팀 소유 경로(src/lib/sim/**)에서 빠져나옴).
//
// 이 카테고리는 아직 대응하는 co-located 구현 파일이 없다 — 실제 케이스는 엔진 코드
// 구현 이후 담당팀이 채운다.
//
// 최종 디렉터리 구조는 15일차 H-03(3단 머지 게이트 스크립트화)에서 확정한다.
import { describe, it } from 'vitest';

describe('__suites__/snapshot', () => {
  it.todo('시드 고정 스냅샷 — 경기 100건, 시즌 3건 바이트 동일성');
});
