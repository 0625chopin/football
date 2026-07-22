"use server";

import { revalidatePath } from "next/cache";

import { assertAdminSession } from "@/app/api/admin/auth";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { getDataSource } from "@/lib/data/factory";
import type { CommonCodeGroupCode } from "@/lib/config/catalog";
import { CommonCodeValidationError, validateCommonCodeValue } from "@/lib/config/schema";
import type { CommonCodeHistoryId, UserId } from "@/types";
import { applyConfigOverrides, setConfigOverride } from "./config-override-store";
import { recordConfigHistoryEntry } from "./config-history-store";

// Task 021(56~57일차) — H3 편집 폼 저장 서버 액션. `../actions.ts`(G2~G6)와 동일하게
// 인가 재검증을 첫 줄에서 수행한다(Next.js 16 공식 문서 경고, `../actions.ts` 파일 헤더
// 참조 — 페이지 레벨 인증 검사가 Server Action까지 확장되지 않는다).
//
// ## 값 검증 — 3팀 `src/lib/config/schema.ts`를 그대로 재사용
// NFR-CFG-004(저장 전 거부)의 실제 판정 로직(숫자 범위·JSON 스키마)은 3팀이 이미
// `validateCommonCodeValue`로 구현해 뒀다 — 이 화면이 재구현하지 않는다. 실패 시
// `CommonCodeValidationError.message`(3팀이 이미 한국어로 조립한 문구)를 그대로 노출한다.
// 이는 `description`/`error_message`와 같은 "운영자용 데이터 텍스트" 취급(D-18 예외와
// 동일 원칙)이라 번역 카탈로그를 거치지 않는다. **57일차**: 클라이언트(`ConfigEditForm`)가
// `@/lib/config/schema`의 `getNumericRange`로 저장 전 1차(실시간) 검증을 하지만, 여기 서버
// 검증은 그와 무관하게 항상 그대로 유지한다 — 클라이언트 검증은 UX일 뿐 신뢰 경계가 아니다.
//
// ## 발효 시점(`effectiveFromSeason`) 지정 — 57일차 신규
// `apply_policy=NEXT_SEASON`인 그룹은 저장 시점의 `World.currentSeasonNumber + 1`을
// `effectiveFromSeason`으로 계산해 오버레이에 함께 기록한다(H3-p는 그대로 "표시만" —
// 운영자가 이 값 자체를 입력하지 않는다, 08문서 H3-p "정책은 그룹마다 고정" 원칙 유지).
// `IMMEDIATE`/`NEXT_MARKET`은 시즌 개념이 없으므로 `null`을 유지한다(`config.ts` E-42
// `effectiveFromSeason` 필드 주석 "NEXT_SEASON 정책용, 해당 없으면 null"과 동일).
//
// ## 변경 이력(H4) 기록 — 57일차 신규
// 저장 성공 시 `CommonCodeHistory` 1건을 `./config-history-store.ts`(화면 로컬 append-only
// 오버레이, `audit-log-store.ts`와 별개 저장소)에 append한다. `changedBy`는 `UserId`
// 비-null 필드지만 `assertAdminSession()`은 인가 여부만 반환하고 호출자 식별자를 내려주지
// 않는다(`../actions.ts`의 `confirmWorldReset` `actorId: null`과 동일 계약 한계 — 다만
// `CommonCodeHistory.changedBy`는 `null`을 허용하지 않아 대신 상수 자리표시자를 쓴다).
// 사용자 식별이 필요해지면 이슈로 등재한다.
const UNKNOWN_ADMIN_ACTOR = "unknown-admin" as UserId;

export type UpdateCommonCodeValueInput = {
  readonly groupCode: string;
  readonly code: string;
  readonly reason: string;
  readonly value:
    | { readonly kind: "NUMBER"; readonly raw: number }
    | { readonly kind: "JSON"; readonly raw: string };
};

export type UpdateCommonCodeValueResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

export async function updateCommonCodeValue(
  lang: string,
  input: UpdateCommonCodeValueInput,
): Promise<UpdateCommonCodeValueResult> {
  await assertAdminSession();

  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;
  const reason = input.reason.trim();
  if (!reason) {
    return { ok: false, message: t(locale, "admin.config.edit.reasonRequired") };
  }

  let valueNum: number | null = null;
  let valueJson: Readonly<Record<string, unknown>> | null = null;
  let serialized: string;

  if (input.value.kind === "NUMBER") {
    if (!Number.isFinite(input.value.raw)) {
      return { ok: false, message: t(locale, "admin.config.edit.invalidNumber") };
    }
    valueNum = input.value.raw;
    serialized = String(valueNum);
  } else {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input.value.raw);
    } catch {
      return { ok: false, message: t(locale, "admin.config.edit.invalidJson") };
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, message: t(locale, "admin.config.edit.invalidJson") };
    }
    valueJson = parsed as Readonly<Record<string, unknown>>;
    serialized = JSON.stringify(valueJson);
  }

  try {
    validateCommonCodeValue({
      groupCode: input.groupCode as CommonCodeGroupCode,
      code: input.code,
      valueNum,
      valueJson,
    });
  } catch (error) {
    if (error instanceof CommonCodeValidationError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  const dataSource = getDataSource();
  const [groups, existingCodes, world] = await Promise.all([
    dataSource.getCommonCodeGroups(),
    dataSource.getCommonCodes(input.groupCode),
    dataSource.getWorldStatus(),
  ]);
  const group = groups.find((entry) => entry.groupCode === input.groupCode);
  const previous = applyConfigOverrides(existingCodes).find((entry) => entry.code === input.code);
  const effectiveFromSeason = group?.applyPolicy === "NEXT_SEASON" ? world.currentSeasonNumber + 1 : null;
  const updatedAt = new Date().toISOString();

  setConfigOverride(input.groupCode, input.code, {
    value: serialized,
    valueNum,
    valueJson,
    effectiveFromSeason,
    updatedAt,
  });

  if (previous) {
    recordConfigHistoryEntry({
      id: crypto.randomUUID() as CommonCodeHistoryId,
      commonCodeId: previous.id,
      groupCode: input.groupCode,
      code: input.code,
      action: "UPDATE",
      oldValue: previous.value,
      newValue: serialized,
      oldEffectiveFromSeason: previous.effectiveFromSeason,
      newEffectiveFromSeason: effectiveFromSeason,
      changedBy: UNKNOWN_ADMIN_ACTOR,
      changedAt: updatedAt,
      reason,
    });
  }

  revalidatePath(`/${lang}/admin/config`);
  return { ok: true };
}
