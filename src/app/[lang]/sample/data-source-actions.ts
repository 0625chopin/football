"use server";

import { revalidatePath } from "next/cache";

import {
  getDataSource,
  getDataSourceKind,
  resetDataSourceCache,
  type DataSourceKind,
} from "@/lib/data/factory";

/**
 * Task 014(37일차, 4팀) — 쇼케이스 전용 어댑터 토글(UC-602: "어댑터 플래그 변경만으로
 * 데이터 소스 교체, UI 무수정").
 *
 * ## 왜 서버 액션인가
 * `NEXT_PUBLIC_DATA_SOURCE`는 `factory.ts`(1팀 소유, 10일차 동결 계약)가 매 호출마다
 * `process.env`에서 읽는 값이고, `getDataSource()`의 결과만 모듈 전역에 캐시된다
 * (`cachedDataSource`). 그 캐시를 비우는 `resetDataSourceCache()`는 파일 헤더가 스스로
 * "런타임 중 어댑터 핫스왑" 용도를 명시해 두었다 — 이 액션은 그 문서화된 용도를 그대로
 * 쓴다. `factory.ts`/`bootstrap.ts` 자체는 건드리지 않는다.
 *
 * `bootstrapDataSource()`(`bootstrap.ts`)는 최초 성공 이후 재실행되지 않도록 캐시된
 * 프라미스를 재사용하므로, 프로세스가 `mock`으로 이미 부트스트랩된 뒤 `supabase`로
 * 전환하려 하면 그 레지스트리에 `supabase` 프로바이더가 아직 없을 수 있다. 그래서 이
 * 액션은 대상 어댑터 모듈을 직접 동적 import해 `registerDataSource`가 실행되도록
 * 보장한다(등록은 멱등 — 같은 kind로 재호출해도 마지막 등록이 덮어쓸 뿐이다).
 *
 * ## 안전장치 — 전환 후 헬스체크, 실패 시 자동 복귀
 * Supabase REST 브리지는 실제 프로젝트에 연결을 시도한다(`.env.local`의
 * `NEXT_PUBLIC_SUPABASE_URL` 등). 스키마 부재·네트워크 문제로 실패하면 `/sample`이
 * 데이터 조회 단계(컴포넌트 렌더 이전)에서 통째로 던져 라우트 전체가 `error.tsx`로
 * 떨어진다 — 개별 `ErrorBoundary`(37일차, 같은 스코프)가 감싸는 건 컴포넌트 렌더
 * 단계뿐이라 이 지점은 보호 대상이 아니다. 그래서 전환 직후 최소 헬스체크(`getLeagues()`
 * 1회 호출)를 거쳐, 실패하면 이전 kind로 되돌리고 실패를 알린다 — 쇼케이스가 깨진
 * 상태로 남지 않는다.
 *
 * ## 프로세스 전역 영향 + **dev 전용 가드(팀장 지적, 37일차 재조정)**
 * `process.env.NEXT_PUBLIC_DATA_SOURCE`를 바꾸는 것은 이 Node 프로세스 전체(동시 접속한
 * 모든 뷰어)에 적용된다 — 요청 단위 격리가 아니다.
 *
 * 최초 구현은 이 위험을 "`/sample`은 로컬 개발 쇼케이스 전용 라우트"라는 전제로만 눌러
 * 뒀는데, 그 전제가 **코드로 강제돼 있지 않았다.** `"use server"` 액션은 UI에서만 호출되는
 * 게 아니라 빌드가 발급하는 액션 ID로 누구나 직접 POST할 수 있고(Server Actions 보안 모델,
 * `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` "Security" 절 —
 * "Treat every action as an untrusted entry point"), `/sample`은 프로덕션 빌드에도 그대로
 * 포함되는 일반 라우트라 라우트 그룹으로 배제돼 있지 않다. 즉 배포 후에는 **인증 없이 서버
 * 프로세스 전체의 데이터 소스를 외부에서 뒤집을 수 있는 엔드포인트**가 될 수 있었다.
 * 헬스체크·자동복귀는 "전환 실패"만 막지 "전환 자체"를 막지 않는다.
 *
 * 그래서 액션 본문 최상단에서 `process.env.NODE_ENV !== 'development'`이면 상태를 전혀
 * 건드리지 않고 즉시 거부한다(아래 `setDataSourceKindAction` 첫 줄). `DataSourceToggle`을
 * 렌더하는 쪽(`page.tsx`)도 같은 조건으로 프로덕션에서 토글 UI 자체를 그리지 않는데, 이건
 * 사용자 경험상의 보조 장치일 뿐 — **실제 방어선은 이 서버 측 조기 반환**이다(UI를 숨겨도
 * 액션 ID 직접 호출은 막지 못한다).
 */

export interface DataSourceToggleResult {
  readonly ok: boolean;
  readonly kind: DataSourceKind;
}

async function ensureAdapterRegistered(kind: DataSourceKind): Promise<void> {
  if (kind === "supabase") {
    await import("@/lib/data/supabase");
  } else {
    await import("@/lib/data/mock");
  }
}

function applyEnv(kind: DataSourceKind | undefined): void {
  if (kind === undefined) {
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  } else {
    process.env.NEXT_PUBLIC_DATA_SOURCE = kind;
  }
}

export async function setDataSourceKindAction(kind: DataSourceKind): Promise<DataSourceToggleResult> {
  if (process.env.NODE_ENV !== "development") {
    console.error(
      `[data-source-actions] 프로덕션 환경에서 어댑터 전환 액션이 호출되어 거부했습니다(kind="${kind}").`,
    );
    return { ok: false, kind: getDataSourceKind() };
  }

  const previousRawEnv = process.env.NEXT_PUBLIC_DATA_SOURCE;
  const previousKind = getDataSourceKind();

  if (previousKind === kind) {
    return { ok: true, kind };
  }

  applyEnv(kind);
  resetDataSourceCache();

  try {
    await ensureAdapterRegistered(kind);
    await getDataSource().getLeagues();
  } catch (error) {
    console.error(`[data-source-actions] "${kind}" 전환 실패, "${previousKind}"로 복귀합니다.`, error);
    applyEnv(previousRawEnv as DataSourceKind | undefined);
    resetDataSourceCache();
    await ensureAdapterRegistered(previousKind);
    revalidatePath("/[lang]/sample", "page");
    return { ok: false, kind: previousKind };
  }

  revalidatePath("/[lang]/sample", "page");
  return { ok: true, kind };
}
