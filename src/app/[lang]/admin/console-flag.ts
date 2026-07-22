/**
 * NFR-SEC-007 1차 방어 — 비공개 경로 + 환경 플래그. Task 021(59일차, 5팀), 와이어프레임
 * `docs/wireframe/07-어드민-운영콘솔.md` 파일 헤더 및 W-45("환경 플래그 실제 변수명·검증
 * 위치 확정 필요")의 변수명 예시(`ADMIN_CONSOLE_ENABLED`)를 그대로 채택한다.
 *
 * ## 왜 인증(2차)과 별개로 이게 필요한가
 * `src/app/api/admin/auth.ts`의 `assertAdminSession()`/`isAuthorizedAdminToken()`(6팀
 * 소유)이 54일차에 이미 "인증·역할 확인"(NFR-SEC-007 2차)을 붙였다 — 그런데 1차인 "환경
 * 플래그" 자체는 W-45가 미결로 남긴 채 지금까지 구현된 적이 없었다. 이 플래그는 인증
 * 로직의 정확성과 무관하게 콘솔 전체를 끌 수 있는 킬스위치다 — 코드 배포 없이 값만
 * 바꿔 세 콘솔을 통째로 숨긴다. 인증을 대체하지 않고 그 앞단에 얹는다.
 *
 * ## 기본값 — 미설정 시 비활성(secure by default)
 * "꺼지면 접근 불가"가 기준이므로 반대로 "설정하지 않으면 켜짐"이면 배포 환경에서 깜빡
 * 잊고 값을 넣지 않았을 때 그대로 노출된다. 그래서 정확히 문자열 `"true"`일 때만 활성으로
 * 판정하고, 그 외(미설정 포함) 전부 비활성으로 fail-closed한다 — `isAuthorizedAdminToken`의
 * fail-closed 원칙과 동일하다. 로컬 개발/시연은 `.env.local`에 명시적으로 켜 둔다.
 *
 * ## 페이지와 Server Action 양쪽에서 검증 (Next.js 16 공식 문서 경고, 기존 계약과 동일 이유)
 * `admin/actions.ts`/`admin/config/actions.ts` 파일 헤더가 인용하는 것과 같은 경고 —
 * "페이지 레벨 검사는 그 안의 Server Action에 이어지지 않는다" — 가 이 플래그에도 그대로
 * 적용된다. 페이지는 `isAdminConsoleEnabled()` + `notFound()`로 "비공개 경로"(존재하지
 * 않는 라우트처럼 404)를 구현하고, Server Action은 `assertAdminConsoleEnabled()`로 같은
 * 판정을 던지는 형태로 재검증한다.
 */

export const ADMIN_CONSOLE_ENABLED_ENV_VAR = "ADMIN_CONSOLE_ENABLED";

/** 정확히 `"true"`일 때만 활성 — 그 외(미설정·오타·`"1"`·`"false"` 등) 전부 비활성. */
export function isAdminConsoleEnabled(): boolean {
  return process.env[ADMIN_CONSOLE_ENABLED_ENV_VAR] === "true";
}

/** Server Action 전용 재검증 — 비활성이면 throw(`assertAdminSession()`과 동일한 호출 관례,
 * 항상 이 함수를 먼저 호출한 뒤 `assertAdminSession()`을 호출한다). */
export function assertAdminConsoleEnabled(): void {
  if (!isAdminConsoleEnabled()) {
    throw new Error(
      `[admin/console-flag] admin console disabled: ${ADMIN_CONSOLE_ENABLED_ENV_VAR} is not "true"`,
    );
  }
}
