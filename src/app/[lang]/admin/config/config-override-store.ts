import type { CommonCode } from "@/types";

/**
 * `/[lang]/admin/config` H3 저장 결과를 얹는 화면 로컬 오버레이 — Task 021(56일차).
 *
 * `DataSource.getCommonCodes()`(1팀 계약)는 읽기 전용이고, 실제 값 변경(UPDATE)은
 * `src/lib/config/**`(3팀) 계약 범위 밖이다("어드민 콘솔이 화면 소유 팀 경로에서 구현" —
 * `../world-override-store.ts`와 동일 위임 구조). 그래서 `MockDataSource`/`SupabaseDataSource`
 * 내부 상태는 건드리지 않고 module-level in-memory 오버레이만 얹는다.
 *
 * ## 한계
 * `world-override-store.ts`와 동일 — 서버 재시작·다중 인스턴스에도 유지되지 않는다.
 * 실제 영속화(UPDATE + `CommonCodeHistory` append)는 6팀 Supabase 쓰기 경로가 붙어야 한다.
 * 변경 이력(H4, `CommonCodeHistory`)은 57일차 스코프라 이 파일도 기록하지 않는다.
 */

interface ConfigOverridePatch {
  readonly value: string;
  readonly valueNum: number | null;
  readonly valueJson: Readonly<Record<string, unknown>> | null;
  readonly updatedAt: string;
}

const overrides = new Map<string, ConfigOverridePatch>();

function overrideKey(groupCode: string, code: string): string {
  return `${groupCode}::${code}`;
}

/** H3 저장 성공 시 호출 — 이후 `applyConfigOverrides` 호출부에 반영된다. */
export function setConfigOverride(groupCode: string, code: string, patch: ConfigOverridePatch): void {
  overrides.set(overrideKey(groupCode, code), patch);
}

/** H2 조회 시 기저 `getCommonCodes()` 결과 위에 오버레이를 얹는다. */
export function applyConfigOverrides(codes: readonly CommonCode[]): readonly CommonCode[] {
  return codes.map((entry) => {
    const patch = overrides.get(overrideKey(entry.groupCode, entry.code));
    if (!patch) return entry;
    return {
      ...entry,
      value: patch.value,
      valueNum: patch.valueNum,
      valueJson: patch.valueJson,
      updatedAt: patch.updatedAt,
    };
  });
}

/** 테스트 간 격리용 — 오버레이를 비운다. */
export function resetConfigOverrideStore(): void {
  overrides.clear();
}
