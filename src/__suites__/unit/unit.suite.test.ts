// D-03 ① 엔진 순수 함수 단위 테스트 스위트 골격 (docs/require/06-prioritization-and-risks.md).
// 커버리지 목표: src/lib/sim/ 라인 80% / 브랜치 70%, 핵심 9개 함수 100%.
//
// 이 디렉터리(src/__suites__/)는 D-03이 근거인 H-03(3단 머지 게이트)의 6종 분류 골격이며,
// D-03 자체가 프로젝트 전역 게이트라 sim 전용이 아니다(13일차 1차 교차 점검, 2팀 지적으로
// src/lib/sim/__suites__/에서 이 위치로 이동 — 2팀 소유 경로(src/lib/sim/**)에서 빠져나옴).
//
// **이 스위트는 이미 다른 곳에서 실질적으로 채워져 있다** — 2팀이 구현 파일 옆에 테스트를
// co-locate하는 관행으로 아래 10개 파일이 "엔진 순수 함수 단위 테스트"를 담당 중이다:
// src/lib/sim/rng/{prng,derive,hash,precision,sort}.test.ts,
// src/lib/sim/match/{stats,substitution,tick,tier-b-resim-contract,penalty}.test.ts.
// 새 단위 테스트는 이 co-located 관행을 따르는 것이 우선이며, 이 파일의 it.todo는
// "① 카테고리가 비어있지 않다"는 것을 나타내는 placeholder일 뿐 실제 구현 위치가 아니다.
//
// 최종 디렉터리 구조(이 골격을 그대로 둘지, co-located 파일을 여기로 재배치할지 등)는
// 15일차 H-03(3단 머지 게이트 스크립트화)에서 확정한다.
import { describe, it } from 'vitest';

describe('__suites__/unit', () => {
  it.todo('엔진 순수 함수 단위 테스트 — 핵심 9개 함수 100% 커버리지 (실질 구현은 co-located *.test.ts 참조)');
});
