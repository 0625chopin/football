/**
 * 도메인 타입 공개 진입점 — 1팀 코어·품질팀 소유 (`src/types/**`, 타 팀 읽기 전용)
 *
 * 전 팀은 도메인 타입을 **`@/types`에서만** import 한다. 각 팀 코드에서 로컬 재정의를 두지
 * 않는다(코드 리뷰 체크리스트 C-5·C-6).
 *
 * 진행 상태 (Task 002):
 * | 일차 | 범위 | 상태 |
 * |---|---|---|
 * | 3일차 07-23 | 파일 분할 + **E-01~E-08** (`world.ts`, `person.ts` 초안) | ✅ |
 * | 4일차 07-24 | E-09~E-20 + 34속성 → `person.ts` 완성, `match.ts`·`stat.ts` 완성(E-15~20), `economy.ts`에 E-12~14 추가 | ✅ |
 * | 5일차 07-27 | E-21~E-32 + E-33~E-40 선정의 (`match`/`stat`/`economy`/`betting`) | ⏳ |
 * | 6일차 07-28 | enum성 값 단일 선언 (`enums.ts` 전량) | ⏳ |
 * | 7일차 07-29 | 브랜드 타입·포인트 정수·시드 계층·상수 스냅샷 (`brand.ts`, `config.ts`) | ⏳ |
 * | 8일차 07-30 | 타입↔엔티티 매핑표 + 타입 레벨 테스트 → **H-01 동결** | ⏳ |
 *
 * ⚠️ 8일차 H-01 동결 이후 `src/types/`의 변경은 **이슈 등록 → 주 1회 배치 반영**만 허용된다(C-7).
 */

export * from './brand';
export * from './enums';
export * from './world';
export * from './person';
export * from './match';
export * from './stat';
export * from './economy';
export * from './betting';
export * from './config';
export * from './ops';
