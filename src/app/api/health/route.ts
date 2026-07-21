/**
 * 헬스 체크 엔드포인트 — **46일차(2026-09-22), Task 033**, 6팀 DB·인프라팀 소유
 * (`src/app/api/health/**`, `CLAUDE.md`/`docs/team-schedule/06-DB인프라팀.md` §1)
 *
 * 근거: NFR-OB-004 — "헬스 체크 엔드포인트 — 스케줄러 생존, 마지막 크론 실행, 다음 예정
 * 킥오프, 밀린 Fixture 수. `/api/health`가 200과 4개 상태 필드를 반환. 크론 중단 시 상태가
 * `degraded`로 표시"(`docs/require/04-non-functional-requirements.md:176`).
 *
 * ## `computeSystemHealth` — 새로 만들지 않고 3팀 계약을 그대로 배선한다
 * 크론 정지 판정 로직(`isCronStalled`/`computeSystemHealth`/`CronHeartbeat`)은 이미
 * `src/lib/obs/alert.ts`(3팀 소유, 42일차 Task 043)에 계약과 구현이 모두 있다. 그 파일
 * 헤더가 명시적으로 "`6팀 /api/health`: `computeSystemHealth().status`를 그대로 노출 —
 * 계약만 정의하고 라우트 배선은 6팀 소관(팀장 지시, 오늘 배선하지 않음)"이라고 인계해
 * 뒀다 — 오늘이 그 배선 시점이다. 임계값 수식(`INTERVAL_MIN × GAP_DETECT_MULTIPLIER`)을
 * 이 파일에서 다시 구현하지 않는다(중복 구현은 두 곳이 따로 표류할 위험만 늘린다).
 *
 * ## service-role 클라이언트를 직접 만드는 이유
 * `cron_run`/`cron_gap`은 관리자 전용 테이블이라 공개 SELECT 정책이 없다(§1 "소유 경로"
 * 절 — "1차(54~59일차)는 service-role 서버 전용 경로로 조회, 운영자 RLS는 037 이후 2차").
 * 그래서 `getDataSource()`(anon 계약)를 쓰지 않고, 이 라우트 전용으로
 * `createSupabaseRestQueryClient({ apiKey: SUPABASE_SERVICE_ROLE_KEY })`로 만든
 * `SupabaseDataSource` 인스턴스를 직접 생성한다. `DataSource` 인터페이스(1팀 소유,
 * `src/lib/data/DataSource.ts`)는 건드리지 않는다 — 여기서 쓰는 4개 메서드
 * (`getLatestCronRun`/`getCronRuns`/`getNextKickoff`/`getCommonCodes`)는 전부 22일차
 * `SupabaseDataSource.ts`에 이미 구현돼 있다(재사용, 신규 구현 없음).
 *
 * ## "마지막 성공 실행" 판정 — `tick_run()`과 동일 기준
 * `cron_gap` 감지 SQL(`supabase/migrations/20260721133219_tick_run_gap_detect.sql`)과
 * 동일하게 `SUCCESS`/`PARTIAL`만 "성공"으로 취급한다(`NOOP`/`FAILED`는 기준 갱신에서
 * 제외 — 재시도 소진이 반복되는 동안에도 계속 `degraded`로 보여야 하기 때문). `getCronRuns`가
 * 이미 `started_at DESC`로 정렬해 주므로, SUCCESS 1건과 PARTIAL 1건을 각각 가져와 더 최근
 * 쪽을 고른다.
 *
 * ## "밀린 Fixture 수" — `DataSource`를 확장하지 않고 이 라우트 안에서 직접 조회
 * `cron_run`/`cron_gap`과 달리 이건 실시간 집계(현재 시각 기준 `SCHEDULED` && `kickoff_at
 * <= now()`)라 `DataSource`에 대응 메서드가 없다. 새 메서드를 추가하려면 1팀 소유
 * `DataSource.ts`를 고쳐야 해서(I-188 위반) 대신 같은 `SupabaseQueryClient`로 `fixture`
 * 테이블을 직접 조회한다. **47일차(I-234)부터 `client.ts`가 `Prefer: count=exact` +
 * `lte()`를 지원**하므로 `head: true`(본문 없이 총건수만) 요청 한 번으로 정확한 건수를
 * 받는다 — 이전의 `BACKLOG_SCAN_LIMIT` 스캔·근사 로직은 제거됐다.
 * `backlogFixtureCountApprox`는 계약 안정성을 위해 필드는 유지하되 이제 항상 `false`다
 * (5팀 021 소비 시점인 56일차 이전이라 필드 삭제도 가능했지만, 값 의미가 "이제 항상 정확"으로
 * 좁혀지는 것도 하위호환 방향이라 필드는 남겨 둔다).
 *
 * ## 항상 200 — `status` 필드로 이상 여부를 표현한다
 * NFR-OB-004 원문·`computeSystemHealth`의 계약 모두 "크론 중단 시 상태가 degraded로
 * 표시"라고만 하지 HTTP 상태코드 변경은 요구하지 않는다. 환경변수 누락·조회 실패 등
 * 핸들러 내부 예외도 500이 아니라 200 + `status: 'degraded'` + `error`로 응답한다 — 이
 * 엔드포인트 자체(Next.js 서버 프로세스)가 응답한다는 사실 자체가 "헬스 체크 200" 수락
 * 기준의 핵심이고, 하위 컴포넌트 상태는 본문으로 구분한다(`api/live/matches/route.ts`의
 * "진단용 원문은 사용자 대면 문구가 아니다" 원칙과 동일하게 `error`는 진단용 원문).
 *
 * ## I-214 — 크론 점등 금지
 * 이 파일은 조회만 한다. `pg_cron`/Supabase Cron 스케줄 등록은 하지 않는다.
 */

import { createSupabaseRestQueryClient } from "@/lib/data/supabase/client";
import { SupabaseDataSource } from "@/lib/data/supabase/SupabaseDataSource";
import { computeSystemHealth, type CronHeartbeat } from "@/lib/obs/alert";
import type { CronRun } from "@/types";

export const dynamic = "force-dynamic";

/** `CRON_PARAM` 미적재 시 폴백값 — `tick_run()` SQL의 `COALESCE` 폴백과 동일 수치. */
const FALLBACK_INTERVAL_MIN = 1;
const FALLBACK_GAP_DETECT_MULTIPLIER = 3;

interface HealthLastCronRun {
  readonly id: string;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly status: string;
  readonly durationMs: number;
  readonly isCatchUp: boolean;
}

interface HealthResponseBody {
  readonly status: "ok" | "degraded";
  readonly checkedAt: string;
  /** 상태 필드 ① — 스케줄러 생존(NFR-OB-004). */
  readonly schedulerAlive: boolean;
  /** 상태 필드 ② — 마지막 크론 실행. 실행 기록이 전무하면 `null`(no-op도 포함되므로, 이 값이
   *  `null`이면 크론이 한 번도 호출된 적이 없다는 뜻이다 — 41일차부터 no-op도 항상 기록됨). */
  readonly lastCronRun: HealthLastCronRun | null;
  /** 상태 필드 ③ — 다음 예정 킥오프. 예정된 경기가 없으면 `null`. */
  readonly nextKickoffAt: string | null;
  /** 상태 필드 ④ — 밀린 Fixture 수(`SCHEDULED` && `kickoff_at <= now`). */
  readonly backlogFixtureCount: number;
  /** 47일차(I-234)부터 `count=exact`로 항상 정확히 집계되어 이제 항상 `false`(계약 안정성을
   *  위해 필드는 유지, 파일 헤더 "밀린 Fixture 수" 절 참조). */
  readonly backlogFixtureCountApprox: boolean;
  /** `computeSystemHealth`가 `degraded` 판정 사유를 그대로 전달(비어 있으면 `status`는 항상 `ok`). */
  readonly reasons: readonly string[];
  /** 핸들러 내부 예외 발생 시에만 값(진단용 원문, 번역 비대상 — `error_message`와 동일 원칙). */
  readonly error?: string;
}

function toLastCronRun(run: CronRun): HealthLastCronRun {
  return {
    id: run.id,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    status: run.status,
    durationMs: run.durationMs,
    isCatchUp: run.isCatchUp,
  };
}

/** SUCCESS/PARTIAL 중 더 최근에 끝난(`finishedAt` 기준) 실행을 고른다 — 없으면 `null`. */
function pickLastSuccessfulRun(candidates: readonly CronRun[]): CronRun | null {
  let latest: CronRun | null = null;
  for (const run of candidates) {
    const finishedAtMs = Date.parse(run.finishedAt ?? run.startedAt);
    const latestMs = latest === null ? -Infinity : Date.parse(latest.finishedAt ?? latest.startedAt);
    if (finishedAtMs > latestMs) {
      latest = run;
    }
  }
  return latest;
}

function degradedResponse(error: string): Response {
  const checkedAt = new Date().toISOString();
  const body: HealthResponseBody = {
    status: "degraded",
    checkedAt,
    schedulerAlive: false,
    lastCronRun: null,
    nextKickoffAt: null,
    backlogFixtureCount: 0,
    backlogFixtureCountApprox: false,
    reasons: [error],
    error,
  };
  return Response.json(body, { status: 200 });
}

export async function GET(): Promise<Response> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl === undefined || serviceRoleKey === undefined) {
    return degradedResponse("missing_env: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY");
  }

  try {
    const client = createSupabaseRestQueryClient({ supabaseUrl, apiKey: serviceRoleKey });
    const dataSource = new SupabaseDataSource(client);
    const nowIso = new Date().toISOString();

    const [latestRun, successRuns, partialRuns, cronParams, nextKickoff, backlogCount] =
      await Promise.all([
        dataSource.getLatestCronRun(),
        dataSource.getCronRuns({ status: "SUCCESS", limit: 1 }),
        dataSource.getCronRuns({ status: "PARTIAL", limit: 1 }),
        dataSource.getCommonCodes("CRON_PARAM"),
        dataSource.getNextKickoff(),
        client
          .from("fixture")
          .select("id", { count: "exact", head: true })
          .eq("status", "SCHEDULED")
          .lte("kickoff_at", nowIso),
      ]);

    const lastSuccessfulRun = pickLastSuccessfulRun([...successRuns, ...partialRuns]);

    const intervalMinCode = cronParams.find((code) => code.code === "INTERVAL_MIN");
    const gapMultiplierCode = cronParams.find((code) => code.code === "GAP_DETECT_MULTIPLIER");

    const heartbeat: CronHeartbeat = {
      lastSuccessAt: lastSuccessfulRun?.finishedAt ?? lastSuccessfulRun?.startedAt ?? null,
      now: nowIso,
      expectedIntervalMin: intervalMinCode?.valueNum ?? FALLBACK_INTERVAL_MIN,
      gapMultiplier: gapMultiplierCode?.valueNum ?? FALLBACK_GAP_DETECT_MULTIPLIER,
    };

    const health = computeSystemHealth({ cronHeartbeat: heartbeat });

    const body: HealthResponseBody = {
      status: health.status,
      checkedAt: health.checkedAt,
      schedulerAlive: health.status === "ok",
      lastCronRun: latestRun === null ? null : toLastCronRun(latestRun),
      nextKickoffAt: nextKickoff?.kickoffAt ?? null,
      backlogFixtureCount: backlogCount.count ?? 0,
      backlogFixtureCountApprox: false,
      reasons: health.reasons,
    };
    return Response.json(body, { status: 200 });
  } catch (cause) {
    // 진단용 원문 — 사용자 대면 문구가 아니다(파일 헤더 "항상 200" 절 참조).
    console.error("[src/app/api/health/route.ts] 헬스 체크 조회 실패", cause);
    return degradedResponse(cause instanceof Error ? cause.message : String(cause));
  }
}
