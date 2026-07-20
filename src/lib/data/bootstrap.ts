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
 * ## 왜 정적 import가 아니라 변수 경유 동적 import인가 (`bootstrapDataSource` 한정)
 * `./mock`·`./supabase`는 오늘 시점에 실존하지 않는 디렉터리다(3팀 Task 007은 13~19일차,
 * 6팀 Task 034는 그 이후). 정적 `import`문이나 문자열 리터럴을 인자로 받는 동적
 * `import('./mock')`는 TypeScript가 컴파일 시점에 모듈 해석을 시도해 `tsc`가 즉시 실패한다.
 * 반면 `import(modulePath)`처럼 인자가 **변수(비리터럴 표현식)**이면 TypeScript는 정적 모듈
 * 해석을 시도하지 않고 해당 `import()` 호출의 타입을 `any`로 취급한다 — 그래서 대상 모듈이
 * 아직 없어도 `tsc`가 통과한다(이 파일 작성 직후 `npx tsc --noEmit`으로 실측 확인함). 두
 * 어댑터 디렉터리가 실제로 생기기 전까지 `bootstrapDataSource()`를 **호출**하면 런타임에
 * "모듈을 찾을 수 없음" 에러가 나지만, 오늘은 이 함수를 호출하는 곳이 아직 없으므로 문제가
 * 되지 않는다. **4팀 1차 교차 점검 지적(`docs/ISSUES.md` I-75)**: 이 변수 경유 동적 import가
 * webpack 번들러에서도 문제없이 해석되는지는 아직 실제 `next dev --webpack` 컴파일로
 * 검증된 바 없다(오늘은 `tsc --noEmit`만 확인, WSL에서 `next build`가 별도로 실패하는
 * I-62 때문에 실컴파일 기회 자체가 제한적이다) — 13일차 배선 시 실컴파일 확인이 필요하다.
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
 * `DataSourceKind`/`getDataSourceKind`는 같은 디렉터리의 `./factory`에서 가져온다.
 * `installHardcodedFallback`은 3팀 소유 `@/lib/config/fallback`에서 **읽기 전용으로 소비**한다
 * (그 파일을 수정하지 않는다). `@/types` 도메인 타입은 이 파일과 무관하다(참조하지 않음).
 */

import { installHardcodedFallback } from '@/lib/config/fallback';

import { getDataSourceKind } from './factory';

let dataSourceBootstrapped = false;
let appBootstrapped = false;

/**
 * 현재 `NEXT_PUBLIC_DATA_SOURCE` 설정에 맞는 어댑터의 self-registration 모듈을 로드한다
 * (I-67, 어댑터 등록 전용 — 다른 레지스트리는 모른다). 이미 로드했으면(같은 프로세스 내
 * 재호출) 아무 것도 하지 않는다.
 */
export async function bootstrapDataSource(): Promise<void> {
  if (dataSourceBootstrapped) {
    return;
  }
  dataSourceBootstrapped = true;

  const kind = getDataSourceKind();
  const modulePath = kind === 'supabase' ? './supabase' : './mock';

  await import(modulePath);
}

/**
 * **앱 부트스트랩 단일 진입점**(I-72). 4팀이 13일차 이후 루트 레이아웃에서 호출해야 할
 * 유일한 함수 — 공통코드 하드코딩 폴백 등록(`installHardcodedFallback`)과 어댑터 등록
 * (`bootstrapDataSource`)을 이 함수 하나가 순서대로 수행한다. 이미 실행했으면 아무 것도
 * 하지 않는다. **새 초기화가 필요해지면 이 함수 본문에 한 줄만 추가할 것** — 4팀 레이아웃에
 * 새 호출을 늘리지 않는다(위 파일 헤더 "절충 설계" 절 참조).
 */
export async function bootstrapApp(): Promise<void> {
  if (appBootstrapped) {
    return;
  }
  appBootstrapped = true;

  installHardcodedFallback();
  await bootstrapDataSource();
}

/**
 * 부트스트랩 완료 플래그를 초기화한다. 테스트 간 격리 목적 — 일반 애플리케이션 코드
 * 경로에서는 호출하지 않는다(`factory.ts`의 `resetDataSourceCache`와 동일한 용도).
 * 공통코드 캐시 자체의 초기화는 `loader.ts`의 `invalidateConstants()`가 별도로 담당한다
 * (이 함수는 "다시 등록이 필요한가"라는 부트스트랩 플래그만 초기화한다).
 */
export function resetDataSourceBootstrap(): void {
  dataSourceBootstrapped = false;
  appBootstrapped = false;
}
