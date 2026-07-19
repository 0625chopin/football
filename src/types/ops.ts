/**
 * 운영 도메인 타입 — **골격만** (3일차 2026-07-23)
 *
 * 채울 범위: **E-24 Injury / E-25 YouthProspect / E-26 NewsFeedItem / E-27 Sanction**(사건) 및
 * **E-45 CronRun / E-46 CronGap / E-47 AuditLog**(운영) — 배치는 **5일차** 확정,
 * 잔여 E-41~E-47은 5~7일차에 걸쳐 정의한다.
 *
 * 착수 전 확인할 원칙:
 * - 부상 4등급은 enum성 값이므로 `enums.ts` 단일 선언(**6일차**, T8).
 * - **T6 (D-16)**: 타입에 `Date`·난수 기반 암묵 기본값을 두지 않는다. 시각은 명시 필드로.
 */

export {};
