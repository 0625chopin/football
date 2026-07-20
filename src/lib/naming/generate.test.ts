/**
 * generate.ts 자기검증 — Task 007 / 13일차 산출물.
 *
 * 13일차 수락 기준("국적별 이름 풀 매칭 100%")과 결정론(D-16/D-17)을 오늘 산출물
 * 수준에서 검증한다. 스쿼드 구조 불변식·등번호 중복 등 Mock 팩토리 전체 스위트는
 * 19일차(Task 007 종료)에 별도로 추가되며, 이 파일을 대체하지 않고 보강한다.
 *
 * `vitest.config.ts`(12일차, Task 008)가 `resolve.tsconfigPaths: true`로 `@/*` 별칭을
 * 해석하므로(CLAUDE.md), 이 신규 파일은 별칭 import를 사용한다.
 */

import { describe, expect, it } from 'vitest';
import { createState } from '@/lib/sim/rng/prng';
import type { NationalityCode } from '@/types';
import { generatePlayerName } from './generate';
import { NATIONALITY_NAME_POOLS, SUPPORTED_NATIONALITY_CODES } from './namePools';

describe('generatePlayerName', () => {
  it('동일 state로 호출하면 바이트 단위로 동일한 결과를 재현한다', () => {
    const state = createState(20260806);
    const nationality = SUPPORTED_NATIONALITY_CODES[0];

    const first = generatePlayerName(state, nationality);
    const second = generatePlayerName(state, nationality);

    expect(second).toEqual(first);
  });

  it('호출 후 state가 실제로 진행되어 입력 state와 달라진다', () => {
    const state = createState(42);
    const nationality = SUPPORTED_NATIONALITY_CODES[0];

    const result = generatePlayerName(state, nationality);

    expect(JSON.stringify(result.state)).not.toBe(JSON.stringify(state));
  });

  it.each(SUPPORTED_NATIONALITY_CODES)(
    '국적 %s — 50회 생성한 이름/성이 전부 해당 국적 풀에 속한다',
    (nationality) => {
      const pool = NATIONALITY_NAME_POOLS[nationality];
      let state = createState(hashSeedFor(nationality));

      for (let i = 0; i < 50; i += 1) {
        const step = generatePlayerName(state, nationality);
        state = step.state;

        expect(pool.givenNames).toContain(step.value.givenName);
        expect(pool.familyNames).toContain(step.value.familyName);
        expect(step.value.fullName).toContain(step.value.givenName);
        expect(step.value.fullName).toContain(step.value.familyName);
      }
    },
  );

  it('지원하지 않는 국적 코드는 조용히 대체하지 않고 RangeError를 던진다', () => {
    const state = createState(7);

    expect(() => generatePlayerName(state, 'ZZ' as NationalityCode)).toThrow(RangeError);
  });

  it('연속 호출 시 매번 다른 state를 이어받아 서로 다른 결과가 나올 수 있다', () => {
    const nationality = SUPPORTED_NATIONALITY_CODES[0];
    let state = createState(999);
    const seen = new Set<string>();

    for (let i = 0; i < 10; i += 1) {
      const step = generatePlayerName(state, nationality);
      state = step.state;
      seen.add(step.value.fullName);
    }

    expect(seen.size).toBeGreaterThan(1);
  });
});

/** 국적 코드 문자열을 테스트용 정수 시드로 접는다(암호학적 강도 불필요, 재현성만 필요). */
function hashSeedFor(nationality: NationalityCode): number {
  let hash = 0;
  for (let i = 0; i < nationality.length; i += 1) {
    hash = (hash * 31 + nationality.charCodeAt(i)) >>> 0;
  }
  return hash;
}
