/**
 * `constant-source.ts` 테스트 — 42일차(2026-09-16) 추가, I-206 supabase 쪽 회귀 커버리지.
 *
 * 실 DB 호출 없이 `Pick<DataSource, 'getCommonCodeGroups' | 'getCommonCodes'>`를 인메모리
 * 페이크로 구현해 검증한다(`SupabaseDataSource.test.ts`의 페이크 클라이언트 패턴과 같은
 * 취지 — 이 파일은 그보다 더 좁은 인터페이스만 필요해 `SupabaseQueryClient` 전체를
 * 흉내 내지 않고 두 메서드만 직접 스텁한다).
 *
 * 두 계층으로 나눠 검증한다:
 * ① `parseCommonCodeValue` 단위 테스트 — `value`/`valueNum`/`valueJson` → 그룹 `valueType`별
 *    D-26 매핑을 **5종 전부**(`INT`/`DECIMAL`/`STRING`/`BOOL`/`JSON`) 직접 검증한다.
 *    카탈로그(`catalog.ts`) 38개 그룹 중 `BOOL`/`STRING`을 쓰는 그룹이 현재 하나도 없어
 *    (전부 `INT`/`DECIMAL`/`JSON`), ②의 `getGroupConstants` 경유만으로는 그 두 분기를
 *    실제 그룹코드로 검증할 수 없기 때문이다(`constant-source.ts`가 이 이유로 함수를
 *    별도 export함).
 * ② `SupabaseConstantSource.load()`/`getGroupConstants` 통합 테스트 — 실제 카탈로그
 *    그룹코드(`UI_PARAM`=INT, `CUP_PARAM`=JSON)로 비활성 코드 제외·동기 즉시 반환·
 *    미등록 그룹 `undefined`·소스 이름을 검증한다.
 */

import { describe, expect, it } from 'vitest';

import type { CommonCode, CommonCodeGroup } from '@/types';

import { parseCommonCodeValue, SupabaseConstantSource } from './constant-source';

const BASE_GROUP_FIELDS = {
  groupName: 'Test Group',
  description: 'test',
  applyPolicy: 'IMMEDIATE',
  relatedFr: [],
  isActive: true,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as const;

const BASE_CODE_FIELDS = {
  id: 'cc-1',
  worldId: null,
  minValue: null,
  maxValue: null,
  jsonSchema: null,
  description: 'test code',
  unit: null,
  sortOrder: 0,
  isActive: true,
  effectiveFromSeason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  updatedBy: null,
} as const;

function group(groupCode: CommonCodeGroup['groupCode'], valueType: CommonCodeGroup['valueType']): CommonCodeGroup {
  return { ...BASE_GROUP_FIELDS, groupCode, valueType };
}

function code(
  overrides: Partial<CommonCode> & Pick<CommonCode, 'groupCode' | 'code' | 'value'>,
): CommonCode {
  return {
    ...BASE_CODE_FIELDS,
    valueNum: null,
    valueJson: null,
    defaultValue: overrides.value,
    ...overrides,
  } as CommonCode;
}

/* ────────────────────────────────────────────────────────────────────────
 * ① parseCommonCodeValue — D-26 값 변환 5종
 * ──────────────────────────────────────────────────────────────────────── */

describe('parseCommonCodeValue — 그룹 valueType별 D-26 매핑', () => {
  it('INT — valueNum이 있으면 그것을 쓴다', () => {
    const c = code({ groupCode: 'G', code: 'X', value: '5000', valueNum: 5000 });
    expect(parseCommonCodeValue(c, 'INT')).toBe(5000);
  });

  it('INT — valueNum이 없으면 value 문자열을 파싱한다', () => {
    const c = code({ groupCode: 'G', code: 'X', value: '42', valueNum: null });
    expect(parseCommonCodeValue(c, 'INT')).toBe(42);
  });

  it('DECIMAL도 INT와 동일하게 valueNum 우선, 없으면 value 파싱이다', () => {
    const withNum = code({ groupCode: 'G', code: 'X', value: '1.06', valueNum: 1.06 });
    const withoutNum = code({ groupCode: 'G', code: 'Y', value: '1.06', valueNum: null });
    expect(parseCommonCodeValue(withNum, 'DECIMAL')).toBe(1.06);
    expect(parseCommonCodeValue(withoutNum, 'DECIMAL')).toBe(1.06);
  });

  it('STRING — value를 그대로 쓴다', () => {
    const c = code({ groupCode: 'G', code: 'X', value: 'hello' });
    expect(parseCommonCodeValue(c, 'STRING')).toBe('hello');
  });

  it('BOOL — value 문자열 "true"/"false"를 boolean으로 변환한다', () => {
    const on = code({ groupCode: 'G', code: 'X', value: 'true' });
    const off = code({ groupCode: 'G', code: 'Y', value: 'false' });
    expect(parseCommonCodeValue(on, 'BOOL')).toBe(true);
    expect(parseCommonCodeValue(off, 'BOOL')).toBe(false);
  });

  it('JSON — valueJson이 있으면 그것을 쓴다', () => {
    const c = code({ groupCode: 'G', code: 'X', value: '{"ignored":true}', valueJson: { a: 1 } });
    expect(parseCommonCodeValue(c, 'JSON')).toEqual({ a: 1 });
  });

  it('JSON — valueJson이 없으면 value를 JSON.parse한다', () => {
    const c = code({ groupCode: 'G', code: 'X', value: '{"b":2}', valueJson: null });
    expect(parseCommonCodeValue(c, 'JSON')).toEqual({ b: 2 });
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * ② SupabaseConstantSource.load() / getGroupConstants — 실 카탈로그 그룹코드로 통합 검증
 * ──────────────────────────────────────────────────────────────────────── */

function fakeDataSource(
  groups: readonly CommonCodeGroup[],
  codesByGroup: Record<string, readonly CommonCode[]>,
) {
  return {
    getCommonCodeGroups: async () => groups,
    getCommonCodes: async (groupCode: string) => codesByGroup[groupCode] ?? [],
  };
}

describe('SupabaseConstantSource', () => {
  it('비활성 코드(isActive=false)는 값 맵에서 제외된다', async () => {
    const source = await SupabaseConstantSource.load(
      fakeDataSource([group('UI_PARAM', 'INT')], {
        UI_PARAM: [
          code({ groupCode: 'UI_PARAM', code: 'POLL_INTERVAL_MS', value: '5000', valueNum: 5000, isActive: true }),
          code({ groupCode: 'UI_PARAM', code: 'POLL_LIVE_MS', value: '3000', valueNum: 3000, isActive: false }),
        ],
      }),
    );

    expect(source.getGroupConstants('UI_PARAM')).toEqual({ POLL_INTERVAL_MS: 5000 });
  });

  it('JSON 그룹(CUP_PARAM)도 동일 경로로 채워진다', async () => {
    const source = await SupabaseConstantSource.load(
      fakeDataSource([group('CUP_PARAM', 'JSON')], {
        CUP_PARAM: [code({ groupCode: 'CUP_PARAM', code: 'BYE_COUNT', value: '{"value":4}', valueJson: { value: 4 } })],
      }),
    );

    expect(source.getGroupConstants('CUP_PARAM')).toEqual({ BYE_COUNT: { value: 4 } });
  });

  it('load()에 넘기지 않은(미등록) 그룹은 undefined다', async () => {
    const source = await SupabaseConstantSource.load(fakeDataSource([], {}));

    expect(source.getGroupConstants('CARD_PARAM')).toBeUndefined();
  });

  it('getGroupConstants는 load() 완료 후 동기 즉시 반환한다(추가 await 불필요)', async () => {
    const source = await SupabaseConstantSource.load(
      fakeDataSource([group('UI_PARAM', 'INT')], {
        UI_PARAM: [code({ groupCode: 'UI_PARAM', code: 'POLL_INTERVAL_MS', value: '5000', valueNum: 5000 })],
      }),
    );

    // await 없이 바로 값을 읽을 수 있어야 ConstantSource의 동기 계약을 만족한다.
    const result = source.getGroupConstants('UI_PARAM');
    expect(result).toEqual({ POLL_INTERVAL_MS: 5000 });
  });

  it("소스 이름이 'supabase'다", async () => {
    const source = await SupabaseConstantSource.load(fakeDataSource([], {}));
    expect(source.name).toBe('supabase');
  });
});
