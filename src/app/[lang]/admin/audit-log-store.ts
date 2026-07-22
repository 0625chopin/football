import type { AuditActorType, AuditLog } from "@/types";

/**
 * G6 로그 뷰어용 화면 로컬 감사 로그 오버레이 — Task 021(55일차),
 * `docs/wireframe/07-어드민-운영콘솔.md` G6 / I-6 / RS-3.
 *
 * ## 왜 필요한가
 * `DataSource.getAuditLogs()`(1팀 계약, `src/lib/data/DataSource.ts`)는 읽기 전용이고, 3팀
 * `MockDataSource`는 아직 감사 로그 생성기가 없어 **항상 빈 배열**을 반환한다(파일 헤더
 * "크론·감사 로그: 실행 이력 자체가 발생한 적이 없다" 참조 — 3팀 소관, 이 팀이 대신 채우지
 * 않는다). G5 월드 리셋 요청(`confirmWorldReset`, `./actions.ts`)만은 이 화면 자체의 조작
 * 이력이라 `world-override-store.ts`와 동일한 module-level in-memory 오버레이로 남긴다.
 *
 * ## 한계 (이슈 후보로 보고, 55일차)
 * - `world-override-store.ts`와 같은 한계 — 서버 재시작·다중 인스턴스·`resetDataSourceCache()`
 *   호출에도 유지되지 않는다. 실제 append-only 영속화는 6팀 Supabase 쓰기 경로가 붙어야 한다.
 * - **G2/G3(배속 변경·정지/재개) 조작은 이 오버레이에 기록하지 않는다.** 와이어프레임 I-1은
 *   "G2·G3 조작도 actor_type=HUMAN으로 이 목록에 함께 기록되어야 한다"고 명시하지만, 그
 *   배선은 54일차에 이미 완료된 `applySpeedMultiplier`/`toggleWorldPause`(`./actions.ts`)를
 *   건드려야 하고 55일차 배정 범위(G5·G6)를 벗어난다 — 이슈로 보고하고 이 커밋에서는
 *   손대지 않는다.
 */

const localEntries: AuditLog[] = [];

/** 오버레이에 항목 1건을 최신순으로 추가한다(append-only, 수정 메서드 없음 — NFR-SEC-010). */
export function recordLocalAuditLog(entry: AuditLog): void {
  localEntries.unshift(entry);
}

/** 테스트 간 격리용 — 오버레이를 비운다. */
export function resetAuditLogStore(): void {
  localEntries.length = 0;
}

function matchesActorType(entry: AuditLog, actorType?: AuditActorType): boolean {
  return !actorType || entry.actorType === actorType;
}

function matchesSearch(entry: AuditLog, search?: string): boolean {
  if (!search) return true;
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return (
    entry.action.toLowerCase().includes(needle) ||
    entry.targetType.toLowerCase().includes(needle) ||
    entry.targetId.toLowerCase().includes(needle)
  );
}

/**
 * 오버레이 항목과 `DataSource.getAuditLogs()` 기저 결과를 합쳐 같은 필터·정렬을 적용한다.
 * 로컬 오버레이는 기저 조회의 `params`를 통과하지 않았으므로(별도 저장소) 여기서 동일하게
 * 다시 필터링한다 — `world-override-store.applyWorldOverride()`와 같은 "얹어서 반환" 패턴.
 */
export function mergeAuditLogs(
  base: readonly AuditLog[],
  params?: { readonly actorType?: AuditActorType; readonly search?: string; readonly limit?: number },
): readonly AuditLog[] {
  const merged = [...localEntries, ...base]
    .filter((entry) => matchesActorType(entry, params?.actorType))
    .filter((entry) => matchesSearch(entry, params?.search))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

  return params?.limit ? merged.slice(0, params.limit) : merged;
}
