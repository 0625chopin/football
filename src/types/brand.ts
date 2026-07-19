/**
 * 식별자(ID) 타입 — **골격만** (3일차)
 *
 * 근거: `docs/devStep/02.타입스키마설계원칙.md` T2-b / 작업표 7일차
 *
 * ⚠️ 7일차(2026-07-29) Task 002에서 브랜드 타입(`TeamId`·`PlayerId` 혼용을 `tsc`가
 *    오류로 검출)으로 승격한다. 지금은 **별칭만** 두어 3~6일차 파일들이 참조할 수 있게 한다.
 *    각 파일에서 `string`을 직접 쓰면 7일차에 전 파일을 고쳐야 하므로, ID는 반드시
 *    이 파일의 별칭을 import 해서 사용한다.
 *
 * ⚠️ 시드 값 브랜드 타입도 7일차 소관이다(1팀 소유). 단, **시드 파생 로직**의 단일 소유는
 *    2팀 `src/lib/sim/rng/derive.ts`이며 여기서 재구현하지 않는다(T2-b, 체크리스트 C-8).
 */

/** E-01 World PK (uuid) — 단일 월드 전제(D-15)에서도 World 자신은 ID를 가진다 */
export type WorldId = string;
/** E-02 League PK (uuid) */
export type LeagueId = string;
/** E-03 Season PK (uuid) */
export type SeasonId = string;
/** E-04 Team PK (uuid) */
export type TeamId = string;
/** E-06 Manager PK (uuid) */
export type ManagerId = string;
/** E-07 Player PK (uuid) */
export type PlayerId = string;
/** E-44 SimConstantSnapshot PK (uuid) — 상수 스냅샷 타입 본체는 7일차 `config.ts` */
export type SnapshotId = string;

/** E-15 Fixture PK (uuid) — 4일차 추가 */
export type FixtureId = string;
/** E-16 MatchEvent PK (uuid) — 4일차 추가 */
export type MatchEventId = string;
/** E-24 Injury PK (uuid) — 엔티티 본체는 5일차 `ops.ts`. `PlayerState.activeInjuryId`가 선참조한다(4일차 추가) */
export type InjuryId = string;
/** E-12 Contract PK (uuid) — 4일차 추가 */
export type ContractId = string;
/** E-13 Transfer PK (uuid) — 4일차 추가 */
export type TransferId = string;
/** E-14 Loan PK (uuid) — 4일차 추가 */
export type LoanId = string;

/**
 * 시드 값 — 32비트 안전 정수(T2-a 확정).
 * `string`·`bigint`·53비트 초과 정수를 쓰지 않는다. 7일차에 브랜드를 씌운다.
 */
export type Seed = number;

/**
 * 포인트(게임 내 통화) — **정수 고정**(DC-08). 소수점 연산을 도입하지 않는다.
 * 7일차에 브랜드 타입으로 승격 예정.
 */
export type Points = number;

/** ISO-8601 타임스탬프 문자열. 표시 서식은 UI 계층 책임(T13) */
export type Timestamp = string;
