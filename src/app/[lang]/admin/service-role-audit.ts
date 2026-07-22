import { getDataSource, getDataSourceKind } from "@/lib/data/factory";
import { createSupabaseRestQueryClient } from "@/lib/data/supabase/client";
import { mapAuditLogRow, mapCommonCodeHistoryRow } from "@/lib/data/supabase/mapper";
import type { AuditActorType, AuditLog, CommonCodeHistory, CommonCodeId } from "@/types";

/**
 * I-283 대응 — 감사류 SELECT(`audit_log`/`common_code_history`)를 service_role 경유로
 * 전환한다. Task 021(59일차, 5팀).
 *
 * ## 문제
 * `SupabaseDataSource.getAuditLogs()`/`getCommonCodeHistory()`(6팀 소유)는
 * `getDataSource()`가 내부에서 만드는 공유 클라이언트를 쓰는데, 그 클라이언트는
 * `createSupabaseRestQueryClient()`(6팀 소유, `src/lib/data/supabase/client.ts`)가
 * 기본값으로 anon 발행키(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)를 문다. 이 프로젝트의
 * PostgREST는 응답 없이 빈 배열을 돌려주는 방식으로 RLS를 표현하므로(에러가 아니다),
 * 6팀이 원격에 "감사 SELECT는 service_role 전용" 마이그레이션을 적용하는 순간 이
 * 화면들의 감사 조회가 **조용히 0행**이 된다 — 화면은 정상 렌더되고 그냥 "기록 없음"으로
 * 보인다(59일차 팀장 지시로 선제 정리, 마이그레이션 적용 자체는 6팀 소관·별개 일정).
 *
 * ## 해법 — 같은 REST 브리지를 service_role 키로 재사용
 * `createSupabaseRestQueryClient()`는 `apiKey`를 옵션으로 주입받게 이미 설계돼 있다
 * (`client.ts` 파일 헤더 "createSupabaseRestQueryClient" 절 참조 — 테스트 목적으로 보이나
 * 이 주입 지점 자체는 범용이다). `SUPABASE_SERVICE_ROLE_KEY`(서버 전용, `.env.local`에
 * 이미 존재 — `CLAUDE.md` "아직 도입되지 않은 것" 절)로 같은 클라이언트를 한 번 더 만들어
 * `audit_log`/`common_code_history` 두 테이블만 이 클라이언트로 조회한다. 나머지
 * `DataSource` 메서드(선수·경기·리그 등)는 건드리지 않는다 — 이 화면이 읽는 감사류
 * 두 테이블 한정이다. `SupabaseDataSource`(6팀 소유) 자체는 수정하지 않는다.
 *
 * Mock 모드(`getDataSourceKind() === 'mock'`, 로컬 기본값)에서는 서비스 키 클라이언트를
 * 만들 이유가 없다(RLS 자체가 없다) — 기존과 동일하게 `getDataSource()`로 위임한다.
 *
 * ## Fail-open 예외 — 이 두 함수만
 * `SUPABASE_SERVICE_ROLE_KEY`가 없으면(로컬에 아직 안 채운 환경 등) 기존 anon 클라이언트
 * 경로로 폴백한다 — 이 파일이 다루는 건 "이미 있는 조회를 더 안전한 키로 바꾸는 것"이지
 * 새로운 접근 제어가 아니다(그건 `console-flag.ts`/`assertAdminSession()` 몫). 서비스
 * 키가 없다고 화면을 통째로 던지면 이 정리 자체가 새 장애점이 된다.
 */

function tryCreateServiceRoleClient(): ReturnType<typeof createSupabaseRestQueryClient> | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) return null;
  return createSupabaseRestQueryClient({ supabaseUrl, apiKey: serviceRoleKey });
}

export async function fetchAuditLogsForAdminConsole(params?: {
  readonly actorType?: AuditActorType;
  readonly search?: string;
  readonly limit?: number;
}): Promise<readonly AuditLog[]> {
  if (getDataSourceKind() === "mock") {
    return getDataSource().getAuditLogs(params);
  }

  const client = tryCreateServiceRoleClient();
  if (!client) {
    return getDataSource().getAuditLogs(params);
  }

  const DEFAULT_LIMIT = 50;
  const SEARCH_POOL_SIZE = 500;
  const limit = params?.limit ?? DEFAULT_LIMIT;

  let query = client.from("audit_log").select("*");
  if (params?.actorType !== undefined) {
    query = query.eq("actor_type", params.actorType);
  }
  query = query
    .order("created_at", { ascending: false })
    .limit(params?.search !== undefined ? SEARCH_POOL_SIZE : limit);

  const { data, error } = await query;
  if (error !== null || data === null) return [];

  const logs = data.map(mapAuditLogRow);
  if (params?.search === undefined) return logs;

  const needle = params.search.toLowerCase();
  return logs
    .filter((log) => log.action.toLowerCase().includes(needle) || log.targetType.toLowerCase().includes(needle))
    .slice(0, limit);
}

export async function fetchCommonCodeHistoryForAdminConsole(
  commonCodeId: CommonCodeId,
): Promise<readonly CommonCodeHistory[]> {
  if (getDataSourceKind() === "mock") {
    return getDataSource().getCommonCodeHistory(commonCodeId);
  }

  const client = tryCreateServiceRoleClient();
  if (!client) {
    return getDataSource().getCommonCodeHistory(commonCodeId);
  }

  const { data, error } = await client
    .from("common_code_history")
    .select("*")
    .eq("common_code_id", commonCodeId)
    .order("changed_at", { ascending: false });
  if (error !== null || data === null) return [];

  return data.map(mapCommonCodeHistoryRow);
}
