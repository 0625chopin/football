/**
 * G5 월드 리셋 2단계 확인 게이트 — 순수 검증 함수만 모은다(`docs/wireframe/07-어드민-운영콘솔.md`
 * G5 상세 RS-2, I-13). UI(`DangerConfirmDialog`/`WorldResetPanel`)와 서버 액션
 * (`confirmWorldReset`, `./actions.ts`)이 **동일한 함수**를 호출해 클라이언트 버튼 비활성화와
 * 서버 재검증이 어긋나지 않게 한다(팀장 지시 — Server Action은 페이지/버튼 상태를 신뢰하지
 * 않고 스스로 재검증, I-270과 동일 원칙을 입력값 검증에도 적용).
 *
 * 사유 미입력 또는 확인 문구 불일치면 `[리셋 확정]`이 비활성화된다(RS-2, RS-1 "오타 방지
 * 타이핑 확인"). 대소문자·공백을 정확히 맞춰야 하며 임의로 완화하지 않는다 — 완화하면
 * "오조작 방지 강도를 명확히 다르게" 두려는 RS-1 취지가 옅어진다.
 */
export const WORLD_RESET_CONFIRMATION_WORD = "RESET";

export function isWorldResetConfirmValid(reason: string, confirmText: string): boolean {
  return reason.trim().length > 0 && confirmText === WORLD_RESET_CONFIRMATION_WORD;
}
