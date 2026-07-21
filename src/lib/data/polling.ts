'use client';

/**
 * 폴링 추상화 훅 계약 — **Task 004, 11일차(2026-08-04)**, 1팀 코어·품질팀 소유, **H-02**
 *
 * 근거: `ROADMAP.md` Task 004(9~11일차) 구현사항 "폴링 추상화 훅 계약 정의(기본 5초 /
 * 라이브 3초, 주기는 공통코드, 탭 비활성 시 중단)" / `docs/team-schedule/01-코어품질팀.md`
 * 11일차 행(산출물 `src/lib/data/polling.ts`, 수락 기준 "Task 007(Mock)·034(Supabase)가
 * 각각 독립 구현 가능") / `docs/wireframe/00-공통규약.md` R-8("폴링 훅 계약=1팀 H-02, 화면은
 * 소비만", "탭 비활성 시 중단=훅 계약의 책임") / `docs/wireframe/01-홈-라이브센터.md` I-1 /
 * FR-UI-022.
 *
 * ## 오늘 스코프 (오늘 하는 것 / 안 하는 것)
 * - **오늘**: (1) 폴링 주기를 공통코드에서 읽되 미가용 시 안전 기본값으로 폴백하는
 *   `resolvePollIntervalMs`, (2) 화면이 `setInterval`을 재구현하지 않도록 캡슐화한
 *   클라이언트 훅 `usePolling`/`usePollingList` — 탭 비활성 시 자동 중단·복귀 시 즉시
 *   재조회.
 * - **오늘 하지 않는 것**: `DataSource.ts`(9일차) 시그니처 변경 — 아래 "I-61" 절 참조.
 *   실제 Mock/Supabase 어댑터 구현(3팀 Task 007, 6팀 Task 034), 공통코드 `UI_PARAM` 그룹의
 *   실제 키 이름 확정(3팀 H-05 — 아래 "폴링 주기 값" 절 참조).
 *
 * ## 파일 분리 이력 (팀장 2차 검증, `docs/ISSUES.md` I-74)
 * 이 파일은 원래 `Promise → Result<T>` 변환 헬퍼(`fetchResult`/`fetchListResult`)까지
 * 함께 담고 있었으나, **4팀 11일차 1차 교차 점검에서 구조 결함**으로 지적됐다 — 이 파일
 * 전체가 `'use client'`이므로 RSC 번들러가 이 파일의 **모든 export**를 client
 * reference로 치환한다. 그 결과 `fetchResult`/`fetchListResult`가 React 미의존 순수
 * `async` 함수여도 서버 컴포넌트에서 직접 `await`할 수 없어, "단발 조회(RSC)·폴링 훅이
 * 동일 헬퍼를 공유해야 한다"는 I-61 요구를 실제로는 충족하지 못하고 있었다. 그 두 함수는
 * `'use client'`가 없는 `./fetch-result`로 옮겼다 — 이 파일은 그 함수들을 **재사용만**
 * 한다(아래 import 참조). `'use client'`는 Next.js 공식 문서(`use-client.md`)가 명시한
 * 대로 이 파일의 **진짜 첫 줄**(모든 주석·import보다 앞)에 둔다.
 *
 * **44일차(I-222) — 같은 이유로 `resolvePollIntervalMs`/`PollMode`도 떼어냈다.** 44일차에
 * "서버가 주기를 해석해 props로 내려준다"로 설계를 바꾸면서 서버 컴포넌트(`[lang]/page.tsx`)가
 * 이 파일에서 `resolvePollIntervalMs`를 import했더니, 위와 정확히 같은 client reference 치환
 * 때문에 홈이 *"Attempted to call resolvePollIntervalMs() from the server"*로 에러 바운더리에
 * 떨어졌다(실측). 그 함수는 `'use client'`가 없는 `./poll-interval`로 옮겼고 이 파일은 그것을
 * **재사용만** 한다 — 아래 "44일차 정정" 절 참조. `'use client'` 파일에 순수 유틸을 두면 서버가
 * 못 쓴다는 이 함정은 이제 이 파일에서 두 번 재발했다. **새 export를 추가하기 전에 "서버도
 * 부를 수 있어야 하는가"를 먼저 따지고, 그렇다면 별도 모듈에 두세요.**
 *
 * ## I-61 — `Result<T>` 적용 위치 (팀장 확정, `docs/ISSUES.md` 참조)
 * `DataSource.ts`는 오늘도 수정하지 않는다 — 모든 메서드가 여전히 평범한 `Promise<T>`
 * (단일 엔티티: `T | null`, 컬렉션: `readonly T[]`)를 반환한다(3팀 Task 007 반환 타입에
 * 영향 없음, I-61 분기 ①). `Result<T>` 변환은 `./fetch-result`의 `fetchResult`/
 * `fetchListResult` **공용 헬퍼**가 담당한다(그 파일 헤더 참조). 4팀 요구사항(팀장
 * 채택) — "단발성 조회(서버 컴포넌트의 1회성 `await`)와 폴링 훅이 동일 헬퍼를 공유해야
 * 한다"를 만족하기 위해, 그 두 함수는 React를 import하지 않고 `'use client'`도 없는
 * 별도 모듈에 둔다(위 "파일 분리 이력" 절 참조). 이 파일의 `usePolling`/`usePollingList`는
 * 내부에서 그 함수들을 재사용할 뿐이다. 예:
 * ```ts
 * // 서버 컴포넌트(1회성 await) — './fetch-result'에서 직접 호출
 * import { fetchResult } from '@/lib/data/fetch-result';
 * const result = await fetchResult(() => getDataSource().getFixture(fixtureId));
 *
 * // 클라이언트 컴포넌트(폴링) — 이 파일의 usePolling이 내부에서 동일한 fetchResult를 재사용
 * import { usePolling } from '@/lib/data/polling';
 * const result = usePolling(() => getDataSource().getFixture(fixtureId), { mode: 'live' });
 * ```
 *
 * ## I-65 — EMPTY 상태의 이중 의미
 * `usePollingList`가 내부에서 쓰는 `./fetch-result`의 `fetchListResult`는 "컬렉션이
 * 정상적으로 비어 있음"과 "구조적으로 채워져 있어야 하는데 비었음(잠재 버그)"을 구분하지
 * 않는다 — 가이드 전문은 `./fetch-result` 파일 헤더 "I-65" 절 참조. 근본 해결은 2팀이
 * 16일차 전까지 검토하기로 확정됐다(팀장 판정, `docs/ISSUES.md` I-65).
 *
 * ## 폴링 주기 값 — 공통코드 경유, 하드코딩 금지 (`docs/wireframe/00-공통규약.md` R-8)
 * 주기의 **값**은 3팀 H-05(공통코드 `UI_PARAM` 그룹)가 출처이고, 이 파일은 그 값을
 * `@/lib/config/loader`의 `loadConstants('UI_PARAM')`으로 조회할 뿐 리터럴을 직접 정의하지
 * 않는다. `UI_PARAM` 그룹 내부의 코드(키) 이름은 3팀이 `POLL_INTERVAL_MS`/`POLL_LIVE_MS`/
 * `LEADERBOARD_MIN_APPEARANCE_PCT`(UPPER_SNAKE)로 공식 확정했다(3팀 11일차, dot-notation
 * 제안은 폐기 — `docs/wireframe/00-공통규약.md` C-03a 해소). 아래 `resolvePollIntervalMs`가
 * 그 확정된 키를 그대로 쓴다.
 *
 * 또한 오늘(11일차) 시점에는 `loadConstants`의 값 소스(전역 기본값·하드코딩 폴백)가 실제로
 * 등록돼 있지 않으면 `ConstantSourceUnavailableError`를 던질 수 있다(`loader.ts` 10일차
 * 설계, fail-fast) — 하드코딩 폴백 소스(`@/lib/config/fallback`의 `installHardcodedFallback`)
 * 등록은 `src/lib/data/bootstrap.ts`의 **앱 부트스트랩 단일 진입점** `bootstrapApp()`이
 * 어댑터 등록(`bootstrapDataSource()`)과 함께 수행한다(팀장 2차 판정, `docs/ISSUES.md`
 * I-72). 이 훅이 그 예외를 그대로 흘려보내면 화면이 깨지므로(AS-13/NFR-CFG-005 "공통코드
 * 미등록에도 시스템 미정지" 정신 위반), `resolvePollIntervalMs`는 예외를 흡수하고 **최후
 * 안전망**만 폴백한다.
 *
 * **⚠️ 이 안전망 폴백값은 ROADMAP Task 004 원문의 "기본 5초 / 라이브 3초"가 아니다**
 * (사용자 판정, 11일차, `docs/ISSUES.md` I-77 — 6팀 1차 교차 점검이 비용 충돌을 발견했다).
 * `docs/business/03-budget-plan.md` §2.5 실측표 기준 케이스 A(일 평균 동시 125명)에서
 * 폴링 주기별 월 비용은 5초=$133.7, 15초=$23.2, 30초=$1.6이다(3초는 5초보다 요청 수가
 * 많아 더 비쌈) — 이 폴백이 "공통코드 조회 실패(장애)" 상황에서만 쓰이는데, 정상값(5초/
 * 3초) 그대로 폴백하면 **장애 상황이 오히려 가장 비싼 설정으로 귀결**되는 역전 구조가
 * 된다. 그래서 안전망만 30초/15초로 낮췄다 — "정상 운영값을 바꾸는 것"이 아니라 "장애
 * 시 비용 폭증을 막는 것"이 목적이다(`@/lib/config/fallback`의 `SAFE_DEFAULT_VALUES.
 * UI_PARAM`과 동일한 논조·수치로 맞췄다 — 두 값이 어긋나면 안 된다). **정상값(5초/3초)은
 * 이 안전망이 아니라, 6팀이 `common_code` 실데이터를 적재(031a, 36일차)한 뒤 전역 기본값
 * 소스(`loader.ts`의 `setGlobalDefaultSource`)가 공급한다** — 전역 기본값이 항상 이
 * 하드코딩 폴백보다 우선하므로(해석 우선순위, `loader.ts`), 그 시점부터는 아래
 * `DEFAULT_POLL_INTERVAL_MS`/`DEFAULT_POLL_LIVE_MS`가 아니라 정상값이 쓰인다.
 *
 * ### ⚠️ 44일차 정정 — 클라이언트에서는 `loadConstants`가 **항상** 실패한다 (I-222)
 * 위 문단이 전제한 "전역 기본값 소스가 정상값을 공급한다"는 **서버 런타임에서만** 성립한다.
 * `loader.ts`의 `globalDefaultSource`/`fallbackSource`는 모듈 스코프 싱글턴이고, 그 둘을
 * 채우는 `bootstrapApp()`(`installHardcodedFallback()` + `setGlobalDefaultSource()`)은
 * 서버 컴포넌트에서만 `await`된다 — **브라우저 번들의 `loader.ts`는 별도 인스턴스라 두 소스가
 * 영원히 `null`**이다. 그래서 `usePolling*`이 브라우저에서 `resolvePollIntervalMs`를 부르면
 * 100% `ConstantSourceUnavailableError`로 떨어져 안전망 값(30초/15초)만 쓰이고, 공통코드
 * 경유(R-8) 설계가 클라이언트에서 사실상 죽는다(홈 라이브 그리드에서 실제로 발생 — 매 마운트
 * WARN + 주기 30초 고정).
 *
 * **해소 방식**: 서버 컴포넌트가 `resolvePollIntervalMs(mode)`를 호출해(이 시점은
 * `bootstrapApp()` 이후라 정상값이 나온다) 그 ms를 props로 내려주고, 화면이
 * `PollingOptions.intervalMs`에 넣는다. 클라이언트는 조회를 아예 시도하지 않는다. 설정 소유를
 * 서버에 두는 이 방향은 I-182 해소(폴링 fetcher의 Route Handler 경유)와 동일한 원칙이다.
 * **클라이언트에서 `installHardcodedFallback()`을 부르는 대안은 택하지 않았다** — 예외와 WARN은
 * 사라지지만 얻는 값이 안전망(30초/15초)이라 정상값은 여전히 도달 불가라 근본 해결이 아니다.
 * `intervalMs`를 생략했을 때의 `resolvePollIntervalMs` 폴백 경로는 그대로 남겨 둔다(서버에서
 * 값을 못 내려주는 화면도 무정지로 동작해야 하므로 — AS-13).
 *
 * ## 탭 비활성 시 중단 (`docs/wireframe/00-공통규약.md` R-8, "훅 계약의 책임으로 확정")
 * `usePolling`/`usePollingList`는 `document.visibilitychange`를 구독해 탭이 숨겨지면
 * 타이머를 멈추고, 다시 보이면 즉시 1회 재조회 후 타이머를 재개한다. 화면(4·5팀)은 이
 * 동작을 별도로 구현하지 않는다 — 훅을 소비만 한다.
 *
 * ## I-67 — 어댑터 등록 부트스트랩 지점
 * 이 파일과는 별도로 `src/lib/data/bootstrap.ts`가 "`registerDataSource` 등록 모듈을
 * 앱의 어느 진입 지점에서 최초 1회 로드하는가"를 명시적으로 지정한다(`docs/ISSUES.md`
 * I-67, I-72). 이 폴링 훅 자체는 `getDataSource()`를 호출하지 않는다 — 아래 "설계 원칙" 참조.
 *
 * ## 설계 원칙 — 이 훅은 `DataSource`를 모른다
 * `usePolling`/`usePollingList`는 `fetcher: () => Promise<T>` 형태의 콜백만 받고,
 * `getDataSource()`를 내부에서 호출하지 않는다. "무엇을 조회하는가"는 화면 레벨 훅의 책임,
 * "어떻게 주기적으로 조회해 `Result`로 감싸는가"는 이 파일의 책임으로 나눈다
 * (`docs/wireframe/00-공통규약.md` R-10 "페칭은 화면(page) 레벨 훅 → dataSource 어댑터
 * 경유"). 이 분리 덕분에 이 계약은 특정 어댑터 구현을 몰라도 되고, Mock(3팀)·Supabase
 * (6팀) 어느 쪽이 연결되어 있어도 그대로 동작한다 — team-schedule 11일차 수락 기준
 * "Task 007·034가 각각 독립 구현 가능"의 근거.
 *
 * ## import 규약
 * `@/types` 도메인 타입을 import하지 않는다(이 파일은 범용 유틸이라 `result.ts`와 동일한
 * 원칙). `Result<T>` 타입은 같은 디렉터리의 `./result`에서, 변환 헬퍼는 `./fetch-result`
 * 에서, 폴링 주기 해석은 `./poll-interval`에서 각각 재사용한다. 공통코드 로더
 * (`@/lib/config/loader`, 3팀 소유)를 이 파일이 **직접** import하지 않는 것이 44일차 분리의
 * 핵심이다 — 그 조회는 전부 `./poll-interval`을 경유한다.
 */

import { useEffect, useRef, useState } from 'react';

import { fetchListResult, fetchResult } from './fetch-result';
import { resolvePollIntervalMs, type PollMode } from './poll-interval';
import { loadingResult, type Result } from './result';

/**
 * 44일차 이전 이 파일이 소유하던 타입 — 이제 `./poll-interval`이 단일 소스다. 타입은
 * 컴파일 시점에 소거돼 client reference 치환 대상이 아니므로 재노출해도 안전하다(기존
 * `import type { PollMode } from '@/lib/data/polling'`을 깨지 않기 위한 호환 re-export).
 * **값** `resolvePollIntervalMs`는 여기서 re-export하지 않는다 — 그러면 `'use client'`
 * 경계에 다시 걸려 서버에서 호출할 수 없게 되어 분리한 의미가 사라진다.
 */
export type { PollMode };

/* ────────────────────────────────────────────────────────────────────────
 * 클라이언트 폴링 훅 — 화면은 이 훅을 소비만 한다(setInterval 자체 구현 금지)
 * ──────────────────────────────────────────────────────────────────────── */

export interface PollingOptions {
  /** 기본(5초) 또는 라이브(3초) 주기 중 선택 — 실제 ms 값은 `resolvePollIntervalMs` 경유 */
  readonly mode: PollMode;
  /** `false`면 폴링을 시작하지 않는다(예: 경기가 아직 시작 전). 기본값 `true`. */
  readonly enabled?: boolean;
  /**
   * **서버(RSC)에서 해석한 주기(ms)를 직접 주입한다 — 클라이언트 화면은 이 값을 넘기는 것을
   * 기본으로 한다**(44일차, I-222). 생략하면 훅이 브라우저에서 `resolvePollIntervalMs(mode)`를
   * 부르는데, `loadConstants`의 값 소스(`loader.ts`)는 **모듈 스코프 싱글턴이라 서버/브라우저가
   * 각자 별도 인스턴스를 갖고**, `installHardcodedFallback()`/`setGlobalDefaultSource()`의
   * 호출처인 `bootstrapApp()`은 서버 컴포넌트에서만 `await`된다. 즉 **브라우저 런타임에는 두
   * 소스가 영원히 비어 있어** 조회가 100% 실패하고 안전망 값(30000/15000ms)만 쓰이게 된다 —
   * 공통코드 경유(`docs/wireframe/00-공통규약.md` R-8)로 정상값(5초/3초)을 공급하려던 설계가
   * 클라이언트에서 도달 불가능해진다.
   *
   * 서버 컴포넌트는 `bootstrapApp()` 이후이므로 `resolvePollIntervalMs(mode)`가 전역 기본값
   * 소스(DB)의 정상값을 정확히 돌려준다. 그 값을 props로 내려 이 옵션에 넣으면 클라이언트는
   * 조회를 아예 시도하지 않는다(설정 소유는 서버, 클라이언트는 소비만 — I-182 해소 때 정한
   * 방향과 동일). 유한한 양수가 아니면 무시하고 조회 경로로 되돌아간다.
   */
  readonly intervalMs?: number;
}

/**
 * 반복 조회 → `Result` 상태 갱신 → 탭 비활성 시 중단 → 언마운트 정리까지 캡슐화하는
 * 공통 구현. `usePolling`/`usePollingList`가 각각 `./fetch-result`의 `fetchResult`/
 * `fetchListResult`를 얹어 재사용한다(단일/컬렉션 모두 여기 한 곳에서만 타이머·가시성
 * 로직을 구현).
 *
 * `poll`(매 tick의 조회 함수)은 렌더마다 새 클로저로 전달돼도 무방하다 — 최신 참조를
 * `ref`로 들고 있어, 타이머 자체는 `mode`/`enabled`가 바뀔 때만 재설정한다(그렇지 않으면
 * 화면이 `fetcher`를 메모이제이션하지 않는 한 매 렌더마다 폴링이 리셋된다).
 */
function usePollingState<R>(poll: () => Promise<R>, options: PollingOptions, initial: R): R {
  const enabled = options.enabled ?? true;
  const [state, setState] = useState<R>(initial);

  const pollRef = useRef(poll);
  useEffect(() => {
    pollRef.current = poll;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let alive = true;
    // 서버가 해석해 내려준 값을 최우선으로 쓴다(위 `PollingOptions.intervalMs` JSDoc — 이 훅은
    // 브라우저에서만 실행되므로 `loadConstants` 경로는 소스가 비어 있어 안전망 값밖에 못 준다).
    const injected = options.intervalMs;
    const intervalMs =
      typeof injected === 'number' && Number.isFinite(injected) && injected > 0
        ? injected
        : resolvePollIntervalMs(options.mode);
    let timerId: ReturnType<typeof setInterval> | undefined;

    function stopTimer(): void {
      if (timerId !== undefined) {
        clearInterval(timerId);
        timerId = undefined;
      }
    }

    function startTimer(): void {
      stopTimer();
      timerId = setInterval(() => {
        void tick();
      }, intervalMs);
    }

    async function tick(): Promise<void> {
      const result = await pollRef.current();
      if (alive) {
        setState(result);
      }
    }

    function handleVisibilityChange(): void {
      if (document.hidden) {
        stopTimer();
      } else {
        void tick();
        startTimer();
      }
    }

    void tick();
    if (!document.hidden) {
      startTimer();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      alive = false;
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, options.mode, options.intervalMs]);

  return state;
}

/**
 * 단일 엔티티를 주기적으로 재조회하는 훅. `fetcher`는 화면 레벨에서 `dataSource`를
 * 호출하는 클로저(예: `() => getDataSource().getFixture(fixtureId)`)를 넘긴다.
 */
export function usePolling<T>(
  fetcher: () => Promise<T | null>,
  options: PollingOptions,
): Result<T> {
  return usePollingState(() => fetchResult(fetcher), options, loadingResult());
}

/**
 * 컬렉션을 주기적으로 재조회하는 훅. I-65 가이드(`./fetch-result` 파일 헤더 참조)는 이
 * 훅에도 동일하게 적용된다.
 */
export function usePollingList<T>(
  fetcher: () => Promise<readonly T[]>,
  options: PollingOptions,
): Result<readonly T[]> {
  return usePollingState(() => fetchListResult(fetcher), options, loadingResult());
}
