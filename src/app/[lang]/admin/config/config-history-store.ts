import type { CommonCodeHistory } from "@/types";

/**
 * H4 변경 이력 diff용 화면 로컬 append-only 오버레이 — Task 021(57일차).
 *
 * `DataSource.getCommonCodeHistory(commonCodeId)`(1팀 계약)는 읽기 전용이고, 이 화면(H3)에서
 * 발생한 저장은 그 기저 저장소에 반영되지 않는다 — `config-override-store.ts`(코드 현재값
 * 오버레이)와 동일한 "얹어서 반환" 위임 구조를 이력에도 그대로 적용한다.
 *
 * **`../audit-log-store.ts`(G6 감사 로그)를 재사용하지 않는다** — 코드값 변경 이력은
 * 별도 엔티티(E-43 `CommonCodeHistory`)이며 월드 리셋 감사 로그(`AuditLog`)와 저장소·스키마가
 * 다르다(56일차 팀장 지시, `./actions.ts` 헤더 참조).
 *
 * ## 한계
 * `config-override-store.ts`와 동일 — 서버 재시작·다중 인스턴스·`resetDataSourceCache()`
 * 호출에도 유지되지 않는다. 실제 append-only 영속화는 6팀 Supabase 쓰기 경로가 붙어야 한다.
 */

const localEntries: CommonCodeHistory[] = [];

/** H3 저장 성공 시 호출 — append-only(NFR-SEC-010, 수정·삭제 메서드를 두지 않는다). */
export function recordConfigHistoryEntry(entry: CommonCodeHistory): void {
  localEntries.unshift(entry);
}

/** 특정 코드의 로컬 오버레이 이력만 최신순으로 반환한다. */
export function getLocalConfigHistory(groupCode: string, code: string): readonly CommonCodeHistory[] {
  return localEntries.filter((entry) => entry.groupCode === groupCode && entry.code === code);
}

/**
 * 기저 `getCommonCodeHistory()` 결과와 로컬 오버레이를 합쳐 최신순(`changedAt` 내림차순)으로
 * 정렬한다 — `audit-log-store.mergeAuditLogs()`와 동일한 병합 패턴.
 */
export function mergeConfigHistory(
  base: readonly CommonCodeHistory[],
  groupCode: string,
  code: string,
): readonly CommonCodeHistory[] {
  const local = getLocalConfigHistory(groupCode, code);
  return [...local, ...base].sort((a, b) => (a.changedAt < b.changedAt ? 1 : a.changedAt > b.changedAt ? -1 : 0));
}

/** 테스트 간 격리용 — 오버레이를 비운다. */
export function resetConfigHistoryStore(): void {
  localEntries.length = 0;
}
