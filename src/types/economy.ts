/**
 * 경제 도메인 타입 — **골격만** (3일차 2026-07-23)
 *
 * 채울 범위: **E-31 Sponsor / E-32 SponsorContract / E-33 PointTransaction** — **5일차(07-27)**
 * (계약·이동 E-12~E-14, 명예 E-29~E-30의 배치는 5일차에 이 파일/`person.ts` 중 확정)
 *
 * 착수 전 확인할 원칙:
 * - **DC-08**: 포인트는 **정수 고정**(`Points`, `brand.ts`). 소수점 연산을 도입하지 않는다.
 * - `Team.balance`는 원장(`PointTransaction`)의 **파생 캐시**이며 원장이 단일 근거다.
 * - **T13**: 금액은 숫자로 두고 로케일 서식은 UI 계층 책임이다.
 */

export {};
