import type { World } from "@/types";

/**
 * G2/G3 화면 로컬 오버레이 저장소 — Task 021(54일차), `docs/wireframe/07-어드민-운영콘솔.md`
 * I-3(배속 적용)·I-4(정지/재개 토글).
 *
 * ## 왜 필요한가
 * `DataSource`(1팀 계약, `src/lib/data/DataSource.ts` 파일 헤더 "9일차 스코프")는 어드민
 * 조회를 **읽기 전용**으로 못박았다 — "배속 변경·정지/재개·월드 리셋·공통코드 저장 등
 * 쓰기 조작은 이 계약 범위 밖"이며, 같은 문서가 "위 조작들은 화면 소유 팀(5팀)이 **별도
 * 경로(Server Action 등)로 구현**한다"고 명시적으로 위임했다. 이 파일이 그 별도 경로다.
 *
 * ## 한계 (이슈 후보로 보고, 54일차)
 * - **3팀 소유 `MockDataSource`의 내부 상태를 건드리지 않는다** — 같은 프로세스 내
 *   module-level in-memory 오버레이만 유지하고, `applyWorldOverride()`가
 *   `getDataSource().getWorldStatus()` 위에 얹어 반환한다. 서버 재시작·다중 인스턴스
 *   배포·`resetDataSourceCache()` 호출에도 유지되지 않는다.
 * - **정지 구간 오프셋의 정확한 산출(H-24 ③, 2팀 소관)을 재구현하지 않는다.** `isPaused`/
 *   `pausedAt`만 최소로 갱신해 G1·G3 표시가 조작에 즉시 반응하게 하는 데모 수준이며,
 *   실제 스케줄 지연 계산은 아니다.
 * - 실제 엔진·DB 영속화(설계상 올바른 배속 변경)는 2팀 H-24 계약과 6팀 Supabase 쓰기
 *   경로가 붙어야 완성된다 — 그 전까지 이 오버레이는 "화면 인터랙션이 동작한다"는 54일차
 *   수락 기준(① 배속 변경 동작)만 충족한다.
 */
export type WorldOverride = Pick<
  World,
  | "speedMultiplier"
  | "isPaused"
  | "pausedTotalMinutes"
  | "speedChangedAt"
  | "worldMinutesAtSpeedChange"
  | "pausedAt"
  | "clockRevision"
>;

let override: WorldOverride | null = null;

export function getWorldOverride(): WorldOverride | null {
  return override;
}

export function setWorldOverride(next: WorldOverride): void {
  override = next;
}

/** 테스트 간 격리용 — 오버레이를 지워 기저 `World`만 반환되게 한다. */
export function resetWorldOverride(): void {
  override = null;
}

/** 오버레이가 있으면 기저 `World` 위에 덮어써 반환하고, 없으면 기저 값을 그대로 반환한다. */
export function applyWorldOverride(base: World): World {
  return override ? { ...base, ...override } : base;
}
