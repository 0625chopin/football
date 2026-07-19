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

/** E-25 YouthProspect PK (uuid) — 5일차 추가 */
export type YouthProspectId = string;
/** E-26 NewsFeedItem PK (uuid) — 5일차 추가 */
export type NewsFeedItemId = string;
/** E-27 Sanction PK (uuid) — 5일차 추가 */
export type SanctionId = string;
/** E-28 Sponsor PK (uuid) — 5일차 추가 */
export type SponsorId = string;
/** E-29 SponsorContract PK (uuid) — 5일차 추가 */
export type SponsorContractId = string;
/** E-30 PointTransaction PK (uuid) — 5일차 추가 */
export type PointTransactionId = string;
/** E-31 Award PK (uuid) — 5일차 추가 */
export type AwardId = string;
/** E-32 Trophy PK (uuid) — 5일차 추가 */
export type TrophyId = string;
/** E-33 BetMarket PK (uuid) — 5일차 추가(2차 선정의) */
export type BetMarketId = string;
/** E-34 BetSelection PK (uuid) — 5일차 추가(2차 선정의) */
export type BetSelectionId = string;
/** E-35 Odds PK (uuid) — 5일차 추가(2차 선정의) */
export type OddsId = string;
/** E-36 Bet PK (uuid) — 5일차 추가(2차 선정의) */
export type BetId = string;
/** E-38 User PK (uuid, `auth.users` 참조) — 5일차 추가(2차 선정의) */
export type UserId = string;
/** E-40 WalletTransaction PK (uuid) — 5일차 추가(2차 선정의) */
export type WalletTransactionId = string;

/**
 * 시드 값 — **53비트 안전 정수**(`Number.MAX_SAFE_INTEGER`, D-28 / 구 I-32, 5일차 확정).
 * 기존 32비트 규약은 2팀 시드 파생 네임스페이스 태그 예약으로 실효 payload가 30비트뿐이라
 * 생일 충돌이 시즌당 수백 건 발생해 53비트로 완화했다(근거: `docs/require/06-prioritization-and-risks.md` D-28).
 * `string`·`bigint`는 쓰지 않는다(PRNG 32비트 워드 연산·JSON 직렬화·핫패스 성능 — D-28 `bigint` 기각 사유).
 * 7일차에 브랜드를 씌운다.
 */
export type Seed = number;

/**
 * 포인트(게임 내 통화) — **정수 고정**(DC-08). 소수점 연산을 도입하지 않는다.
 * 7일차에 브랜드 타입으로 승격 예정.
 */
export type Points = number;

/** ISO-8601 타임스탬프 문자열. 표시 서식은 UI 계층 책임(T13) */
export type Timestamp = string;
