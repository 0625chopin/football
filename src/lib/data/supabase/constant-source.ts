/**
 * `ConstantSource` Supabase 구현체 — **42일차(2026-09-16) 추가**, 6팀 DB·인프라팀 소유
 * (I-206 해소: 1팀이 오늘 `factory.ts`의 `registerConstantSource`/`bootstrap.ts`의 승격
 * 배선을 완성했으나, 실제로 `common_code`를 읽는 `ConstantSource` 구현체가 없어 no-op이던
 * 것을 채운다).
 *
 * ## 왜 별도 클래스인가 — `getGroupConstants`는 동기 계약이다
 * `@/lib/config/loader`(3팀 소유, 수정 대상 아님)의 `ConstantSource.getGroupConstants`는
 * **동기 함수**다(`ConstantGroupValues<...> | undefined`를 즉시 반환). 그런데 이 어댑터가
 * 값을 읽는 `SupabaseDataSource.getCommonCodeGroups`/`getCommonCodes`는 REST 호출이라
 * **비동기**다 — 동기 계약 안에서 네트워크 I/O를 할 수 없다. 그래서 이 클래스는 실제
 * HTTP 조회를 인스턴스 생성 시점(`load()`, 아래)에 **한 번에 전부 선행 완료**해 두고,
 * `getGroupConstants`는 그 결과로 채워진 메모리 맵만 동기로 읽는다.
 *
 * `load()`의 호출자(`./index.ts`)가 모듈 최상위 `await`로 이 프라미스를 끝까지 기다린
 * 뒤에야 `registerConstantSource`를 호출하므로, `bootstrap.ts`의 `bootstrapApp()`이
 * `await bootstrapDataSource()`(= `await import('./supabase')`) 이후 동기적으로 호출하는
 * `getRegisteredConstantSource()` 시점에는 이미 전 그룹 값이 메모리에 있다 — 등록된
 * 프로바이더가 항상 "이미 다 채워진" 인스턴스만 반환하므로 사용 시점의 경합(값이 아직
 * 없어 `undefined`를 반환해 하드코딩 폴백이 잘못 캐시되는 경쟁 조건)이 생기지 않는다.
 *
 * ## D-15(단일 월드) 전제 — `world_id` 필터 없음
 * `SupabaseDataSource.getCommonCodes`가 이미 `world_id`로 필터링하지 않는다(D-15, 단일
 * 월드라 전 쿼리에 스코핑 컬럼을 넣지 않는다는 프로젝트 전제 — `tick_run()` DB 함수의
 * `CRON_PARAM` 조회만 예외적으로 `world_id IS NULL`을 명시하는 것과 달리, 이 어댑터
 * 메서드는 애초에 필터 자체가 없다). 이 클래스도 그 기존 관례를 그대로 따른다 — 별도
 * 필터를 새로 만들지 않는다. 월드별 오버라이드가 실제로 도입되면(D-15 해제 시) 이 지점도
 * 함께 손봐야 한다(이슈 후보로 남긴다).
 *
 * ## 값 변환 — D-26 `value`/`valueNum`/`valueJson` → 그룹 `valueType`별 스칼라
 * `CommonCode.value`가 실 조정 축(D-26)이고, `valueNum`/`valueJson`은 그 파생 컬럼이다.
 * 그룹의 `valueType`(E-41)에 따라 다음 우선순위로 변환한다 — 파생 컬럼이 이미 파싱된
 * 값이면 그것을 신뢰하고, 없으면 `value` 원시 문자열을 그 자리에서 파싱한다:
 * - `INT`/`DECIMAL` → `valueNum` 우선, 없으면 `Number(value)`
 * - `BOOL` → `value === 'true'`
 * - `JSON` → `valueJson` 우선, 없으면 `JSON.parse(value)`
 * - `STRING` → `value` 그대로
 * 비활성 코드(`isActive === false`)는 값 맵에서 제외한다 — 활성 코드만 "현재 유효값"이다.
 *
 * ## import 규약
 * `ConstantSource`/`ConstantGroupValues`는 3팀 소유 `@/lib/config/loader`에서, 그룹코드
 * 유니온은 3팀 소유 `@/lib/config/catalog`에서 각각 **읽기 전용으로 소비**한다(두 파일
 * 다 수정하지 않는다). `DataSource`는 같은 6팀 소유 `../DataSource`에서 타입만 참조한다.
 */

import type { ConstantGroupValues, ConstantSource } from '@/lib/config/loader';
import type { CommonCodeGroupCode } from '@/lib/config/catalog';
import type { CommonCode, CommonCodeGroup, CommonCodeValueType } from '@/types';

import type { DataSource } from '../DataSource';

/** 이 클래스가 실제로 필요로 하는 `DataSource` 메서드만 좁힌 타입(테스트에서 목 구성 최소화) */
type CommonCodeReadable = Pick<DataSource, 'getCommonCodeGroups' | 'getCommonCodes'>;

/**
 * `CommonCode` 1건을 그룹 `valueType`에 맞는 TS 스칼라로 변환한다(위 파일 헤더 "값 변환" 절).
 * `constant-source.test.ts`가 직접 단위 테스트하도록 export한다 — 38개 카탈로그 그룹 중
 * 현재 `BOOL`/`STRING`을 쓰는 그룹이 없어(전부 `INT`/`DECIMAL`/`JSON`), `getGroupConstants`
 * 경유만으로는 그 두 분기를 실제 그룹코드로 검증할 방법이 없다.
 */
export function parseCommonCodeValue(code: CommonCode, valueType: CommonCodeValueType): unknown {
  switch (valueType) {
    case 'INT':
    case 'DECIMAL':
      return code.valueNum ?? Number(code.value);
    case 'BOOL':
      return code.value === 'true';
    case 'JSON':
      return code.valueJson ?? (JSON.parse(code.value) as Readonly<Record<string, unknown>>);
    case 'STRING':
    default:
      return code.value;
  }
}

export class SupabaseConstantSource implements ConstantSource {
  readonly name = 'supabase';

  private constructor(
    private readonly cache: ReadonlyMap<string, ConstantGroupValues<CommonCodeGroupCode>>,
  ) {}

  /** 동기 계약(위 파일 헤더 참조) — `load()`가 미리 채워 둔 메모리 맵만 읽는다. */
  getGroupConstants(group: CommonCodeGroupCode): ConstantGroupValues<CommonCodeGroupCode> | undefined {
    return this.cache.get(group);
  }

  /**
   * 전 그룹의 `common_code`를 1회 프리페치해 동기 조회 가능한 인스턴스를 만든다.
   * `./index.ts`가 모듈 최상위 `await`로 호출해, 등록 시점에는 항상 완료된 인스턴스만
   * 넘긴다(위 파일 헤더 "왜 별도 클래스인가" 절).
   */
  static async load(dataSource: CommonCodeReadable): Promise<SupabaseConstantSource> {
    const groups = await dataSource.getCommonCodeGroups();

    const entries = await Promise.all(
      groups.map(async (group: CommonCodeGroup) => {
        const codes = await dataSource.getCommonCodes(group.groupCode);
        const values: Record<string, unknown> = {};
        for (const code of codes) {
          if (!code.isActive) {
            continue;
          }
          values[code.code] = parseCommonCodeValue(code, group.valueType);
        }
        return [group.groupCode, values as ConstantGroupValues<CommonCodeGroupCode>] as const;
      }),
    );

    return new SupabaseConstantSource(new Map(entries));
  }
}
