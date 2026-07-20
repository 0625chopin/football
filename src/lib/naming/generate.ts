/**
 * 국적 기반 결정론적 이름 생성기 — **13일차(2026-08-06), Task 007 착수분**
 *
 * 근거: `docs/require/06-prioritization-and-risks.md` D-17(국적 기반 다국적 혼합 —
 * 선수의 `nationality`로 해당 국가 이름 풀에서 성·이름 생성, "Mock 팩토리와 실제
 * 생성기가 동일한 이름 생성 로직을 공유해야 한다") / D-16(전부 시드 기반 절차적 생성,
 * 결정론 필수) / `ROADMAP.md` Task 007 / `docs/team-schedule/03-데이터밸런싱배당팀.md`
 * 13일차. 소유: 3팀 데이터·밸런싱·배당팀(CLAUDE.md `src/lib/naming/**`).
 *
 * ## 단일 공유 구현
 * 이 파일이 이름 생성 로직의 **유일한 소유자**다. Mock 월드 팩토리(3팀 007, 15일차)와
 * 실제 엔진의 유소년·FA 생성(3팀 030, 60일차)이 이 함수를 그대로 import해 재사용한다
 * (D-17 파급 ⑤ "Mock 팩토리와 실제 생성기가 동일한 이름 생성 로직을 공유"). 다른 곳에서
 * 이름 조합 로직을 다시 구현하지 않는다.
 *
 * ## 순수 함수 계약 (NFR-DT-001, 2팀 `src/lib/sim/rng/prng.ts`와 동일 관례)
 * `generatePlayerName`은 `{ state, value }`를 반환하는 순수 함수다. 모듈 스코프
 * 가변 상태가 없고, `Math.random()`/`Date.now()`/`react`/`@supabase/*`를 쓰지 않는다.
 * 호출자가 반환된 `state`를 다음 호출로 반드시 이어받아야 동일 `world_seed` → 동일
 * 선수단이라는 결정론이 성립한다.
 *
 * ## 재추첨(블랙리스트 회피) 결정론
 * 블랙리스트와 충돌하면 같은 커서로 다음 PRNG 값을 뽑아 재시도한다 — 재시도 중에도
 * `state`를 계속 이어받으므로, 같은 시드는 같은 시도 횟수·같은 최종 결과를 재현한다.
 * `MAX_RETRY_ATTEMPTS`(20)는 블랙리스트 크기(수십 건, `blacklist.ts`)가 국가별 이름×성
 * 조합 수(최소 10×10=100)보다 훨씬 작다는 사실에 근거한 여유 있는 상한이다 — 정상
 * 데이터에서는 사실상 항상 처음 몇 번 안에 통과하고, 한도 초과는 데이터 결함(예: 어느
 * 국가의 풀 전체가 블랙리스트로만 채워짐)을 조기에 드러내기 위한 방어적 실패다.
 *
 * ## 국적 미지원 시 동작
 * `namePools.ts`의 `SUPPORTED_NATIONALITY_CODES` 밖의 국적을 넘기면 다른 국가 풀로
 * 조용히 대체하지 않고 즉시 `RangeError`를 던진다. 조용한 대체는 Task 007 수락 기준
 * "국적별 이름 풀 매칭 100%"를 깨뜨리므로, 호출자(Mock 월드 팩토리 등)가 지원 목록
 * 안에서만 국적을 배정하도록 강제하는 편이 옳다.
 */

import type { PrngResult, PrngState } from '@/lib/sim/rng/prng';
import { nextIntBelow } from '@/lib/sim/rng/prng';
import type { NationalityCode } from '@/types';
import { isBlacklistedFullName } from './blacklist';
import { formatFullName, NATIONALITY_NAME_POOLS } from './namePools';

/** 블랙리스트 회피 재추첨 최대 시도 횟수. 근거는 파일 상단 JSDoc 참조. */
const MAX_RETRY_ATTEMPTS = 20;

/** 생성된 선수 이름. `fullName`이 `Player.name`(단일 string 필드)에 그대로 대입된다. */
export interface GeneratedName {
  /** 국적별 표기 순서로 조합된 전체 성명 — `Player.name`에 대입할 값. */
  readonly fullName: string;
  readonly givenName: string;
  readonly familyName: string;
}

/**
 * 국적에 맞는 이름 풀에서 이름·성을 결정론적으로 추첨해 조합한다.
 *
 * @param state 2팀 `createState()`/이전 호출의 `state` — 반드시 호출자가 이어받는다.
 * @param nationality `namePools.ts`의 `SUPPORTED_NATIONALITY_CODES`에 속한 국적 코드.
 * @throws {RangeError} 지원하지 않는 국적이거나, 재추첨 한도 내에 블랙리스트를
 *   회피하는 조합을 찾지 못한 경우.
 */
export function generatePlayerName(
  state: PrngState,
  nationality: NationalityCode,
): PrngResult<GeneratedName> {
  const pool = NATIONALITY_NAME_POOLS[nationality];
  if (!pool) {
    throw new RangeError(
      `generatePlayerName: 지원하지 않는 국적 코드입니다 (${nationality}). ` +
        'namePools.ts의 SUPPORTED_NATIONALITY_CODES를 확인하세요.',
    );
  }

  let cursor = state;
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt += 1) {
    const givenStep = nextIntBelow(cursor, pool.givenNames.length);
    const familyStep = nextIntBelow(givenStep.state, pool.familyNames.length);
    cursor = familyStep.state;

    const givenName = pool.givenNames[givenStep.value];
    const familyName = pool.familyNames[familyStep.value];
    const fullName = formatFullName(pool, givenName, familyName);

    if (!isBlacklistedFullName(fullName)) {
      return { state: cursor, value: { fullName, givenName, familyName } };
    }
  }

  throw new RangeError(
    `generatePlayerName: 블랙리스트를 회피하는 조합을 ${MAX_RETRY_ATTEMPTS}회 시도 내에 ` +
      `찾지 못했습니다 (nationality=${nationality}). 해당 국적 이름 풀 데이터를 점검하세요.`,
  );
}
