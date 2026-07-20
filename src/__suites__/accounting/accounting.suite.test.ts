// D-03 ④ 회계 항등식 스위트 골격 (docs/require/06-prioritization-and-risks.md).
// 대상: 포인트 총량 보존, zero-sum 검증.
//
// 이 디렉터리(src/__suites__/)는 D-03이 근거인 H-03(3단 머지 게이트)의 6종 분류 골격이며,
// D-03 자체가 프로젝트 전역 게이트라 sim 전용이 아니다(13일차 1차 교차 점검, 2팀 지적으로
// src/lib/sim/__suites__/에서 이 위치로 이동 — 2팀 소유 경로(src/lib/sim/**)에서 빠져나옴).
//
// **이 카테고리는 애초에 sim 소관이 아니다** — 포인트 총량 보존·zero-sum 검증은
// `ROADMAP.md` Task 029(3팀, FR-EC-* 포인트 원장)가 담당한다(13일차 2팀 지적).
// 실제 케이스는 Task 029 구현 이후 3팀 또는 담당팀이 채운다.
//
// 최종 디렉터리 구조는 15일차 H-03(3단 머지 게이트 스크립트화)에서 확정한다.
import { describe, it } from 'vitest';

describe('__suites__/accounting', () => {
  it.todo('회계 항등식 — 포인트 총량 보존, zero-sum 검증 (Task 029 포인트 원장 대상)');
});
