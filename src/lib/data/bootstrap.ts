/**
 * 앱 부트스트랩 — **Task 004, 11일차(2026-08-04)**, 1팀 코어·품질팀 소유, **I-67·I-72 해소**
 *
 * 근거: `docs/ISSUES.md` I-67 — `factory.ts`(10일차)의 self-registration 레지스트리는
 * `src/lib/data/mock/**`(3팀 Task 007)·`src/lib/data/supabase/**`(6팀 Task 034)가 각자
 * 진입 파일에서 `registerDataSource(kind, provider)`를 호출해야 동작하지만, "그 등록
 * 모듈을 앱의 어느 진입 지점에서 최초 1회 import하는가"를 아무 팀도 소유하지 않는 문제가
 * 있었다. `docs/ISSUES.md` I-72 — 3팀 `fallback.ts`의 `installHardcodedFallback()`도 같은
 * 유형의 갭(모듈 로드만으로는 등록되지 않고, 앱 부트스트랩 시점에 명시적으로 호출돼야 함)을
 * 스스로 지적했다.
 *
 * ## 절충 설계 (팀장 2차 판정 — I-67과 I-72 통합안 재조정)
 * 1차 반영에서는 `bootstrapDataSource()`가 두 초기화를 모두 떠맡았으나, 팀장이 "I-67·I-72는
 * 같은 버그(등록 함수를 만들었는데 아무도 호출하지 않아 기능이 죽는다)가 반복된 것 — 호출처를
 * 4팀 레이아웃에 여러 개 늘리면 세 번째 레지스트리가 생겼을 때 같은 누락이 또 난다"고 지적해
 * **아래 두 층으로 분리**했다:
 * - **`bootstrapDataSource()`** — 원래 의미 그대로 **어댑터 등록 전용**(I-67). 다른 레지스트리를
 *   모른다 — 결합도를 올리지 않는다.
 * - **`bootstrapApp()`** — **앱 부트스트랩 단일 진입점**(I-72). 이 함수 안에서
 *   `bootstrapDataSource()`와 3팀 `installHardcodedFallback()`을 나란히 호출한다. **4팀은
 *   13일차 이후 루트 레이아웃에서 이 함수 하나만 호출**하면 된다 — 두 함수를 각각 호출하게
 *   하지 않는다(그러면 I-67·I-72가 반복된 것과 같은 누락 위험이 재현된다).
 *
 * **향후 레지스트리가 늘어나면(예: 39일차 `obs/logger.ts`, 또 다른 self-registration 모듈)
 * `bootstrapApp()` 본문에 초기화 호출 한 줄만 추가**한다 — 새 부트스트랩 호출처를 4팀
 * 레이아웃에 또 늘리지 않는다. 이 파일이 "앱 시작 시 무엇이 초기화돼야 하는가"의 유일한
 * 목록이 되도록 유지하는 것이 이 절충안의 핵심이다.
 *
 * ## 22일차 갱신 — 리터럴 분기 동적 import로 전환 (I-75 확정·해소)
 * 11일차 원안은 `import(modulePath)`처럼 인자를 변수로 넘겨 `./mock`·`./supabase`가 아직
 * 없어도 `tsc`가 통과하도록 했다(TypeScript는 비리터럴 `import()` 인자를 정적 해석하지
 * 않고 `any`로 취급한다). 그런데 **webpack은 반대로 정적 해석이 안 되는 동적 import를
 * 다루지 못한다** — `next dev --webpack`으로 실컴파일하면
 * `Critical dependency: the request of a dependency is an expression` 경고와 함께
 * `Cannot find module './mock'`(`MODULE_NOT_FOUND`)로 첫 요청이 500이 난다(4팀 13일차
 * 배선 지연분이 22일차에 배선되며 팀장이 격리 포트로 재현·확정, I-75). 두 어댑터 디렉터리가
 * 이제 실존하므로(3팀 Task 007 19일차, 6팀 Task 034) 변수 경유로 tsc를 우회할 필요가
 * 없어졌다 — **`kind` 값을 리터럴 두 갈래로 분기**해 각 분기의 `import('./mock')`/
 * `import('./supabase')`가 리터럴 문자열이 되도록 바꿨다. webpack이 두 갈래 모두 정적으로
 * 분석해 번들에 포함시키므로 경고와 500이 사라진다(리터럴이라 `tsc`도 당연히 통과).
 *
 * ## 22일차 갱신 — 부트스트랩 플래그가 실패를 은폐하던 결함 해소(4팀 발견, 팀장 재현 확정)
 * 원안은 `xBootstrapped = true`를 `await`/등록 **이전에 동기 세팅**했다. 그래서 최초 호출이
 * reject해도 플래그는 true로 남아, 다음 호출부터는 재시도 없이 그대로 resolve했다 —
 * "부트스트랩이 성공한 것처럼" 조용히 통과하는 것이다(1차 500 → 2차부터 200이 그대로
 * 재현됨). **성공했을 때만** 완료로 간주해야 재시도가 가능하다. 불리언 플래그 대신
 * in-flight `Promise`를 캐시하는 방식으로 바꿨다 — 동시 호출은 같은 프라미스를 공유해
 * 등록이 중복 실행되지 않고(경쟁 조건 방지), 그 프라미스가 reject하면 캐시를 비워 다음
 * 호출이 처음부터 다시 시도하며, resolve하면 캐시를 그대로 유지해 이후 호출은 재실행 없이
 * 캐시된 결과를 재사용한다.
 *
 * ## 호출 시점 (인계 대상)
 * `bootstrapApp()`은 `getDataSource()`(`factory.ts`)·`loadConstants()`(`loader.ts`)를 처음
 * 호출하기 전에 **반드시 먼저 완료**돼야 한다. 가장 이른 공통 렌더 지점은 루트
 * 레이아웃(`src/app/[lang]/layout.tsx`, 4팀 소유)이므로, 4팀이 13일차 이후(3팀 Mock 어댑터
 * 착수 시점과 맞물려) 루트 레이아웃에서 `await bootstrapApp()` **한 줄만** 호출하는 것을
 * 전제로 설계했다 — 이 팀은 `src/app/**`를 소유하지 않으므로 레이아웃 파일 자체는 수정하지
 * 않는다.
 *
 * ## import 규약
 * `DataSourceKind`/`getDataSourceKind`/`getRegisteredConstantSource`는 같은 디렉터리의
 * `./factory`에서 가져온다. `installHardcodedFallback`은 3팀 소유 `@/lib/config/fallback`에서,
 * `setGlobalDefaultSource`는 3팀 소유 `@/lib/config/loader`에서 각각 **읽기 전용으로
 * 소비**한다(두 파일 다 수정하지 않는다). `@/types` 도메인 타입은 이 파일과 무관하다(참조하지 않음).
 */

import { installHardcodedFallback } from '@/lib/config/fallback';
import { setGlobalDefaultSource } from '@/lib/config/loader';

import { getDataSourceKind, getRegisteredConstantSource } from './factory';

let dataSourceBootstrapPromise: Promise<void> | null = null;
let appBootstrapPromise: Promise<void> | null = null;

/**
 * 현재 `NEXT_PUBLIC_DATA_SOURCE` 설정에 맞는 어댑터의 self-registration 모듈을 로드한다
 * (I-67, 어댑터 등록 전용 — 다른 레지스트리는 모른다). 로드에 **성공**했으면(같은 프로세스
 * 내 재호출) 캐시된 결과를 그대로 재사용해 재등록하지 않는다. **실패**하면 캐시를 비워
 * 다음 호출이 처음부터 다시 시도한다(22일차, 부트스트랩 플래그가 실패를 은폐하던 결함 해소
 * — 위 파일 헤더 참조). `kind`별로 리터럴 분기해야 webpack이 두 갈래를 정적으로 분석해
 * 번들에 포함시킨다(I-75, 변수 경유 동적 import는 webpack이 해석하지 못한다).
 */
export async function bootstrapDataSource(): Promise<void> {
  if (!dataSourceBootstrapPromise) {
    const kind = getDataSourceKind();

    dataSourceBootstrapPromise = (kind === 'supabase' ? import('./supabase') : import('./mock'))
      .then(() => undefined)
      .catch((error: unknown) => {
        dataSourceBootstrapPromise = null;
        throw error;
      });
  }

  return dataSourceBootstrapPromise;
}

/**
 * **앱 부트스트랩 단일 진입점**(I-72). 4팀이 13일차 이후 루트 레이아웃에서 호출해야 할
 * 유일한 함수 — 공통코드 하드코딩 폴백 등록(`installHardcodedFallback`)과 어댑터 등록
 * (`bootstrapDataSource`)을 이 함수 하나가 순서대로 수행한다. **성공**했으면 이후 호출은
 * 캐시된 결과를 재사용하고, **실패**하면 캐시를 비워 다음 호출이 다시 시도한다(22일차,
 * 위 파일 헤더 참조). **새 초기화가 필요해지면 이 함수 본문에 한 줄만 추가할 것** — 4팀
 * 레이아웃에 새 호출을 늘리지 않는다(위 파일 헤더 "절충 설계" 절 참조).
 *
 * **42일차 추가 — 공통코드 전역 기본값 소스 등록(I-206)**: `bootstrapDataSource()`가
 * 어댑터 모듈(`./mock` 또는 `./supabase`)을 로드해 `kind`가 확정된 직후, `factory.ts`의
 * `getRegisteredConstantSource(kind)`로 그 어댑터가 등록해 둔 `ConstantSource`가 있는지
 * 조회해 있으면 `setGlobalDefaultSource`로 승격한다. **미등록(현재 두 어댑터 다 미등록)이면
 * `undefined`를 그대로 `setGlobalDefaultSource(undefined)`로 넘기지 않고 호출 자체를
 * 건너뛴다** — `null`을 넘기면 `loader.ts`가 무조건 캐시를 전체 무효화하므로, 실제로 등록할
 * 소스가 없는 매 부트스트랩마다 불필요한 무효화가 반복되는 것을 막기 위함이다. 실제
 * `ConstantSource` 구현체(supabase=6팀, mock=3팀)가 아직 없어 오늘은 이 줄이 사실상
 * no-op이다 — `factory.ts`의 `registerConstantSource` JSDoc 참조. 설치 순서는
 * `installHardcodedFallback()`(항상 먼저, 안전망 확보) → `bootstrapDataSource()`(어댑터
 * 등록) → 전역 기본값 소스 승격(있으면) 순으로, 전역 기본값 소스 조회가 실패하거나 비어
 * 있어도 폴백은 이미 준비돼 있어 `loadConstants`가 항상 값을 반환할 수 있다.
 */
export async function bootstrapApp(): Promise<void> {
  if (!appBootstrapPromise) {
    appBootstrapPromise = (async () => {
      installHardcodedFallback();
      await bootstrapDataSource();

      const constantSource = getRegisteredConstantSource(getDataSourceKind());
      if (constantSource) {
        setGlobalDefaultSource(constantSource);
      }
    })().catch((error: unknown) => {
      appBootstrapPromise = null;
      throw error;
    });
  }

  return appBootstrapPromise;
}

/**
 * 부트스트랩 완료 캐시를 초기화한다. 테스트 간 격리 목적 — 일반 애플리케이션 코드
 * 경로에서는 호출하지 않는다(`factory.ts`의 `resetDataSourceCache`와 동일한 용도).
 * 공통코드 캐시 자체의 초기화는 `loader.ts`의 `invalidateConstants()`가 별도로 담당한다
 * (이 함수는 "다시 등록이 필요한가"라는 부트스트랩 캐시만 초기화한다).
 */
export function resetDataSourceBootstrap(): void {
  dataSourceBootstrapPromise = null;
  appBootstrapPromise = null;
}
