"use server";

import { revalidatePath } from "next/cache";

import { assertAdminSession } from "@/app/api/admin/auth";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import type { CommonCodeGroupCode } from "@/lib/config/catalog";
import { CommonCodeValidationError, validateCommonCodeValue } from "@/lib/config/schema";
import { setConfigOverride } from "./config-override-store";

// Task 021(56일차) — H3 편집 폼 저장 서버 액션. `../actions.ts`(G2~G6)와 동일하게
// 인가 재검증을 첫 줄에서 수행한다(Next.js 16 공식 문서 경고, `../actions.ts` 파일 헤더
// 참조 — 페이지 레벨 인증 검사가 Server Action까지 확장되지 않는다).
//
// ## 값 검증 — 3팀 `src/lib/config/schema.ts`를 그대로 재사용
// NFR-CFG-004(저장 전 거부)의 실제 판정 로직(숫자 범위·JSON 스키마)은 3팀이 이미
// `validateCommonCodeValue`로 구현해 뒀다 — 이 화면이 재구현하지 않는다. **56일차 스코프는
// "범위 검증 인라인 에러"(필드별 허용 범위 실시간 표시)를 만들지 않는 것**이지 서버 검증
// 자체를 생략하는 것이 아니다 — 실패 시 `CommonCodeValidationError.message`(3팀이 이미
// 한국어로 조립한 문구)를 그대로 노출한다. 이는 `description`/`error_message`와 같은
// "운영자용 데이터 텍스트" 취급(D-18 예외와 동일 원칙)이라 번역 카탈로그를 거치지 않는다.
//
// ## 발효 시점(`effectiveFromSeason`) 미지정
// 이 액션은 값만 갱신하고 `effectiveFromSeason`을 채우지 않는다 — "발효 시점 지정"은
// 57일차 스코프다(팀장 지시). 정책 배지(H3-p)는 표시만 하고 이 액션은 그 값을 다루지 않는다.
//
// ## 변경 이력(H4) 미기록
// `CommonCodeHistory` append는 57일차 스코프라 이 액션이 기록하지 않는다 — 저장 성공은
// `config-override-store.ts` 오버레이에만 반영된다(월드 리셋의 감사 로그와 달리, 코드값
// 변경은 별도 이력 테이블(E-43) 소관이라 `audit-log-store.ts`를 재사용하지 않는다).

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

  setConfigOverride(input.groupCode, input.code, {
    value: serialized,
    valueNum,
    valueJson,
    updatedAt: new Date().toISOString(),
  });

  revalidatePath(`/${lang}/admin/config`);
  return { ok: true };
}
