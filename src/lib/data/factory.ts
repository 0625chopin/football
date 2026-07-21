/**
 * 어댑터 선택 팩토리 — **Task 004, 10일차(2026-08-03)**, 1팀 코어·품질팀 소유
 *
 * 근거: `ROADMAP.md` Task 004(9~11일차) 구현사항 "환경변수·플래그 기반 어댑터 선택
 * 팩토리(`NEXT_PUBLIC_DATA_SOURCE=mock|supabase`)" / `docs/team-schedule/01-코어품질팀.md`
 * 10일차 행 / NFR-MT-002(Mock↔실데이터 동일 TS 타입) / DC-01
 *
 * ## 오늘 스코프
 * `DataSource`(9일차 산출물, `./DataSource`) 구현체를 환경변수로 골라 반환하는 팩토리만
 * 정의한다. **Mock 구현체(3팀 Task 007, 13~19일차)와 Supabase 구현체(6팀 Task 034)는
 * 아직 존재하지 않으므로**, 이 파일이 `./mock`·`./supabase` 같은 하위 모듈을 정적으로
 * import하면 존재하지 않는 경로라 `tsc`/빌드가 즉시 깨진다. 따라서 **self-registration
 * 레지스트리 패턴**을 채택한다 — 이 파일은 "어떻게 등록·조회하는가"만 정의하고, 실제
 * 구현체는 각 팀이 자신의 하위 디렉터리(`src/lib/data/mock/**`, `src/lib/data/supabase/**`)에서
 * 이 파일을 import해 스스로 등록한다.
 *
 * ## 구현 팀 유의사항 (3팀·6팀)
 * - 각자의 어댑터 진입 파일(예: `src/lib/data/mock/index.ts`)에서
 *   `registerDataSource('mock', () => mockDataSourceImpl)`처럼 **부수효과로 1회 등록**하면 된다.
 * - 그 등록 모듈이 실제로 언제 import되어 실행되는가(앱 부트스트랩 시점, 최초
 *   `getDataSource()` 호출 이전에 반드시 로드돼야 함)는 11일차 폴링 훅 계약(`polling.ts`)
 *   설계 또는 각 팀 구현 시점에 확정한다 — 오늘은 등록·조회 계약만 못박는다.
 * - 미등록 상태에서 `getDataSource()`를 호출하면 어느 kind가 비었는지 담은 에러를
 *   던진다(조기 실패로 디버깅 시간 단축).
 *
 * ## 환경변수 기본값 근거
 * `NEXT_PUBLIC_DATA_SOURCE`가 없거나(`undefined`) `'mock'`/`'supabase'` 외의 값이면
 * **항상 `'mock'`으로 안전 폴백**한다 — `@supabase/*` 패키지 자체가 아직 미설치라
 * (`CLAUDE.md` "아직 도입되지 않은 것"), 잘못된 값으로 `supabase`를 시도하면 즉시
 * 런타임이 깨진다. 로컬 개발 기본값이 `mock`인 편이 훨씬 안전하다.
 *
 * ## import 규약
 * `DataSource`는 이 팀이 같은 디렉터리에 소유한 `./DataSource`에서 상대경로로 type-only
 * import한다(도메인 타입이 아니라 이 팀 소유 계약 파일 간 참조이므로 `@/types` 배럴
 * 규약과는 무관). 이 파일 자체는 `@/types`를 참조하지 않는다.
 */

import type { ConstantSource } from '@/lib/config/loader';

import type { DataSource } from './DataSource';

/** 지원하는 어댑터 종류 — Mock(3팀 Task 007) / Supabase(6팀 Task 034) */
export type DataSourceKind = 'mock' | 'supabase';

/**
 * `NEXT_PUBLIC_DATA_SOURCE` 환경변수를 순수하게 파싱만 한다(부수효과 없음, 테스트 용이).
 * 유효하지 않은 값은 전부 `'mock'`으로 폴백한다(위 파일 헤더 "환경변수 기본값 근거" 참조).
 */
export function getDataSourceKind(): DataSourceKind {
  const raw = process.env.NEXT_PUBLIC_DATA_SOURCE;
  return raw === 'supabase' ? 'supabase' : 'mock';
}

/** 어댑터 구현체를 생성해 반환하는 프로바이더 — 각 팀이 자신의 구현으로 등록 */
type DataSourceProvider = () => DataSource;

const registry = new Map<DataSourceKind, DataSourceProvider>();

/**
 * 특정 `kind`에 대한 `DataSource` 구현체 프로바이더를 등록한다. 3팀·6팀이 각자의
 * 어댑터 진입 파일에서 모듈 로드 시점에 1회 호출한다(위 "구현 팀 유의사항" 참조).
 * 같은 `kind`로 재호출하면 이전 등록을 덮어쓴다(핫스왑·테스트 목적 허용).
 */
export function registerDataSource(kind: DataSourceKind, provider: DataSourceProvider): void {
  registry.set(kind, provider);
}

/**
 * 공통코드 전역 기본값 소스(`@/lib/config/loader`의 `ConstantSource`) 프로바이더 레지스트리
 * — **I-206(42일차) 등록 지점**. `registerDataSource`와 같은 self-registration 패턴을
 * 그대로 따른다: `kind`별 `ConstantSource` 프로바이더를 등록만 하고, 실제로
 * `setGlobalDefaultSource`를 호출하는 시점은 `bootstrap.ts`의 `bootstrapApp()`이 결정한다
 * (이 파일은 등록·조회 계약만 소유 — `loadConstants`/`setGlobalDefaultSource` 자체는 3팀
 * 소유 `./config/loader`에서 그대로 가져다 쓴다, 재선언하지 않음).
 *
 * **오늘(42일차) 시점에는 어떤 팀도 이 함수를 호출하지 않는다** — `common_code`를 읽는
 * `ConstantSource` 구현체가 아직 없다(supabase 실데이터 어댑터=6팀, mock 쪽 판단=3팀 소관,
 * I-206). 이 레지스트리는 그 구현체가 생겼을 때 각자 소유 파일(`src/lib/data/supabase/index.ts`,
 * `src/lib/data/mock/index.ts`)에서 `registerDataSource(kind, ...)` 옆에 한 줄
 * `registerConstantSource(kind, () => new XxxConstantSource(...))`만 추가하면 되도록 만든
 * 확장 지점이다. **주의(mock 구현자용)**: `MockDataSource.getCommonCodes()`가 이미
 * `loadConstants()`를 호출해 값을 읽는 구조라, 그 값을 그대로 다시 `ConstantSource`로 감싸
 * 전역 기본값 소스로 등록하면 `loadConstants` → 전역 기본값 소스 → `loadConstants`로
 * 순환 호출(스택 오버플로)이 난다 — mock 쪽 구현체는 `loadConstants`를 경유하지 않는
 * 별도 값 테이블에서 직접 읽어야 한다.
 */
const constantSourceRegistry = new Map<DataSourceKind, () => ConstantSource>();

/**
 * 특정 `kind`에 대한 `ConstantSource` 프로바이더를 등록한다. 같은 `kind`로 재호출하면
 * 이전 등록을 덮어쓴다(`registerDataSource`와 동일한 핫스왑·테스트 허용 정책).
 */
export function registerConstantSource(kind: DataSourceKind, provider: () => ConstantSource): void {
  constantSourceRegistry.set(kind, provider);
}

/**
 * `kind`에 등록된 `ConstantSource` 프로바이더를 호출해 반환한다. 미등록이면 `undefined`
 * (에러를 던지지 않는다 — `registerDataSource`와 달리 이 소스는 선택적이다: 미등록이어도
 * `loader.ts`가 하드코딩 폴백으로 안전하게 떨어지므로 조기 실패시킬 이유가 없다).
 */
export function getRegisteredConstantSource(kind: DataSourceKind): ConstantSource | undefined {
  return constantSourceRegistry.get(kind)?.();
}

let cachedDataSource: DataSource | null = null;

/**
 * 현재 `NEXT_PUBLIC_DATA_SOURCE` 설정에 맞는 `DataSource` 구현체를 반환한다.
 * 최초 호출 시 레지스트리에서 조회해 캐시하고, 이후 호출은 캐시를 재사용한다.
 * 해당 `kind`가 아직 등록되지 않았으면(어댑터 모듈이 import되지 않은 경우) 에러를 던진다.
 */
export function getDataSource(): DataSource {
  if (cachedDataSource) {
    return cachedDataSource;
  }

  const kind = getDataSourceKind();
  const provider = registry.get(kind);

  if (!provider) {
    throw new Error(
      `[src/lib/data/factory.ts] DataSource 어댑터가 등록되지 않았습니다 (kind="${kind}"). ` +
        `NEXT_PUBLIC_DATA_SOURCE="${kind}"에 대응하는 어댑터 모듈이 아직 import되지 않았을 ` +
        `가능성이 높습니다 — mock은 src/lib/data/mock/**(3팀 Task 007), supabase는 ` +
        `src/lib/data/supabase/**(6팀 Task 034)가 registerDataSource("${kind}", ...)를 ` +
        `호출하도록 앱 진입 지점에서 해당 모듈을 import했는지 확인하세요.`,
    );
  }

  cachedDataSource = provider();
  return cachedDataSource;
}

/**
 * 캐시된 `DataSource` 인스턴스를 초기화한다. 테스트 간 격리 또는(드물게) 런타임 중
 * 어댑터 핫스왑이 필요할 때 사용한다 — 일반 애플리케이션 코드 경로에서는 호출하지 않는다.
 */
export function resetDataSourceCache(): void {
  cachedDataSource = null;
}
