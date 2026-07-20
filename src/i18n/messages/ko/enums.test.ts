/**
 * enums ko/en 표시명 — 키 대칭 테스트. Task 029 / 23일차 산출물.
 *
 * `en/enums.ts`가 `EnumsMessages`(ko에서 유도) 타입으로 선언돼 있어 그룹·키 누락은
 * 이미 tsc가 컴파일 타임에 강제하지만(누락 시 "missing property", 초과 시 "excess
 * property" 에러), 팀장 지시로 런타임 테스트로도 고정한다 — 이후 로케일이 늘거나
 * 타입 경유 없이 값을 조립하는 경로가 생겨도 이 테스트가 계속 대조한다.
 */

import { describe, expect, it } from 'vitest';
import { enums as enumsEn } from '../en/enums';
import { enums as enumsKo } from './enums';

type GroupKey = keyof typeof enumsKo;

const groups = Object.keys(enumsKo) as GroupKey[];

describe('enums ko/en 표시명 — 키 대칭(H-10 7그룹 70리터럴)', () => {
  it('ko/en 그룹 이름 집합이 동일하다', () => {
    expect(Object.keys(enumsEn).sort()).toEqual(groups.slice().sort());
  });

  it.each(groups)('"%s" 그룹의 코드 키 집합이 ko/en에서 동일하다', (group) => {
    const koKeys = Object.keys(enumsKo[group]).sort();
    const enKeys = Object.keys(enumsEn[group]).sort();
    expect(enKeys).toEqual(koKeys);
  });

  // H-10 문서는 "7그룹(+AwardScope 별도 절)=70리터럴"이지만, 4팀 Task 011 골격에
  // `AwardScope`(4종) 그룹 자체가 없어(이슈 후보로 팀장 보고 완료) 현재 스캐폴드
  // 카운트는 66이다. AwardScope가 추가되면 이 상수도 70으로 갱신해야 한다.
  const EXPECTED_LITERAL_COUNT = 66;

  it(`7그룹 ${EXPECTED_LITERAL_COUNT}개 코드 리터럴 전부가 ko/en 양쪽에서 빈 문자열 없이 채워져 있다`, () => {
    let total = 0;
    for (const group of groups) {
      const koValues = Object.values(enumsKo[group]) as string[];
      const enValues = Object.values(enumsEn[group]) as string[];
      total += koValues.length;
      koValues.forEach((value) => expect(value).not.toBe(''));
      enValues.forEach((value) => expect(value).not.toBe(''));
    }
    expect(total).toBe(EXPECTED_LITERAL_COUNT);
  });
});
