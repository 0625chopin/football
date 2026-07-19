/**
 * 식별자(ID) / 시드 / 포인트 브랜드 타입 — **7일차(2026-07-29) Task 002 완성**
 *
 * 근거: `docs/devStep/02.타입스키마설계원칙.md` T2-a~T2-d(시드) / T5(능력치, 이번 파일 대상 아님)
 *       / `docs/ISSUES.md` I-16(시드 계층 타입 소유 경계, 해소) / 작업표 7일차
 *
 * ## 브랜드 기법
 * `Brand<T, TName>`은 원시 타입(`string`/`number`)에 리터럴 프로퍼티 하나를 얹어 **명목
 * 타입(nominal type)** 처럼 동작하게 만든다. 이미 `enums.ts`의 `NationalityCode`가
 * `string & { readonly __nationalityCode: true }` 관례로 브랜드를 쓰고 있었으므로, 그
 * 관례를 제네릭으로 일반화한 것뿐이다(새 패턴 도입 아님). `unique symbol` 키는 쓰지
 * 않는다 — 서로 다른 리터럴 문자열 프로퍼티만으로도 두 브랜드 간 상호 비대입성이 완전히
 * 성립하므로, symbol이 주는 추가 이점이 없다(불필요한 복잡도 회피).
 *
 * **생성은 이 파일 밖에서 하지 않는다.** 실제 UUID/시드 값을 만드는 단일 지점
 * (Mock 팩토리 Task 007, Supabase 어댑터 Task 034)에서 `rawValue as XxxId` 캐스트로
 * 1회만 부여한다. 여러 곳에서 캐스트하면 브랜드가 있으나 마나이므로, 소비 코드는 항상
 * 이미 브랜드된 값을 그대로 전달만 해야 한다(신규 생성 없이).
 *
 * ## 시드 계층 (T2-b·T2-d)
 * **파생 로직의 단일 소유는 2팀 `src/lib/sim/rng/derive.ts`다.** 여기서는 각 계층의
 * 시드 값에 **브랜드만 씌워** world/season/match/event 시드가 서로 뒤바뀌어 쓰이는
 * 실수를 `tsc`가 잡아내게 할 뿐, 파생 계산(`hash(...)`)을 재구현하지 않는다.
 * `derive.ts`는 지금까지 도메인 명칭 타입을 export하지 않고 원시 `number`로 다뤄왔으며
 * (I-16 해소 조건), 이 파일이 확정된 오늘부터 2팀이 자신의 타이밍에 이 타입들을
 * import해 교체한다.
 *
 * ## ID 혼용 방지
 * 아래 27종 ID는 전부 `Brand<string, 'Xxx'>`다. 예를 들어 `TeamId`를 `PlayerId`가
 * 필요한 자리에 넘기면 `tsc`가 오류로 잡는다(작업표 7일차 완료 판정). 이 타입들은 이미
 * `world.ts`/`person.ts`/`match.ts`/`economy.ts`/`betting.ts`/`ops.ts`/`stat.ts`가
 * `import type { XxxId } from './brand'` 형태로만 참조하고 있으므로, 이 파일 하나만
 * 바꿔도 나머지 파일은 재선언 없이 자동으로 안전해진다.
 */

/**
 * 명목 타입(브랜드) 유틸리티. `TName`은 브랜드 식별용 리터럴 문자열이며 런타임에는
 * 존재하지 않는다(`tsc`가 컴파일 시 소거하는 타입 전용 프로퍼티).
 */
export type Brand<T, TName extends string> = T & { readonly __brand: TName };

/** E-01 World PK (uuid) — 단일 월드 전제(D-15)에서도 World 자신은 ID를 가진다 */
export type WorldId = Brand<string, 'WorldId'>;
/** E-02 League PK (uuid) */
export type LeagueId = Brand<string, 'LeagueId'>;
/** E-03 Season PK (uuid) */
export type SeasonId = Brand<string, 'SeasonId'>;
/** E-04 Team PK (uuid) */
export type TeamId = Brand<string, 'TeamId'>;
/** E-06 Manager PK (uuid) */
export type ManagerId = Brand<string, 'ManagerId'>;
/** E-07 Player PK (uuid) */
export type PlayerId = Brand<string, 'PlayerId'>;
/** E-44 SimConstantSnapshot PK (uuid) — 엔티티 본체는 `config.ts` */
export type SnapshotId = Brand<string, 'SnapshotId'>;
/** E-42 CommonCode PK (uuid) — 엔티티 본체는 `config.ts`. `group_code`(E-41 PK)는 자연키라 별도 브랜드 없이 `string` */
export type CommonCodeId = Brand<string, 'CommonCodeId'>;
/** E-43 CommonCodeHistory PK (uuid) — 엔티티 본체는 `config.ts` */
export type CommonCodeHistoryId = Brand<string, 'CommonCodeHistoryId'>;

/** E-15 Fixture PK (uuid) */
export type FixtureId = Brand<string, 'FixtureId'>;
/** E-16 MatchEvent PK (uuid) */
export type MatchEventId = Brand<string, 'MatchEventId'>;
/** E-24 Injury PK (uuid) */
export type InjuryId = Brand<string, 'InjuryId'>;
/** E-12 Contract PK (uuid) */
export type ContractId = Brand<string, 'ContractId'>;
/** E-13 Transfer PK (uuid) */
export type TransferId = Brand<string, 'TransferId'>;
/** E-14 Loan PK (uuid) */
export type LoanId = Brand<string, 'LoanId'>;

/** E-25 YouthProspect PK (uuid) */
export type YouthProspectId = Brand<string, 'YouthProspectId'>;
/** E-26 NewsFeedItem PK (uuid) */
export type NewsFeedItemId = Brand<string, 'NewsFeedItemId'>;
/** E-27 Sanction PK (uuid) */
export type SanctionId = Brand<string, 'SanctionId'>;
/** E-28 Sponsor PK (uuid) */
export type SponsorId = Brand<string, 'SponsorId'>;
/** E-29 SponsorContract PK (uuid) */
export type SponsorContractId = Brand<string, 'SponsorContractId'>;
/** E-30 PointTransaction PK (uuid) */
export type PointTransactionId = Brand<string, 'PointTransactionId'>;
/** E-31 Award PK (uuid) */
export type AwardId = Brand<string, 'AwardId'>;
/** E-32 Trophy PK (uuid) */
export type TrophyId = Brand<string, 'TrophyId'>;
/** E-33 BetMarket PK (uuid) — 2차 선정의 */
export type BetMarketId = Brand<string, 'BetMarketId'>;
/** E-34 BetSelection PK (uuid) — 2차 선정의 */
export type BetSelectionId = Brand<string, 'BetSelectionId'>;
/** E-35 Odds PK (uuid) — 2차 선정의 */
export type OddsId = Brand<string, 'OddsId'>;
/** E-36 Bet PK (uuid) — 2차 선정의 */
export type BetId = Brand<string, 'BetId'>;
/** E-38 User PK (uuid, `auth.users` 참조) — 2차 선정의 */
export type UserId = Brand<string, 'UserId'>;
/** E-40 WalletTransaction PK (uuid) — 2차 선정의 */
export type WalletTransactionId = Brand<string, 'WalletTransactionId'>;

/**
 * 범용 시드 값 — **53비트 안전 정수**(`Number.MAX_SAFE_INTEGER`, D-28 / 구 I-32).
 * `string`·`bigint`는 쓰지 않는다(PRNG 32비트 워드 연산·JSON 직렬화·핫패스 성능 — D-28
 * `bigint` 기각 사유). world/season/match/event **계층에 속하지 않는** 절차적 생성용
 * 시드(예: `Team.crestSeed` 엠블럼 SVG 시드)에 쓴다. 계층 시드는 아래 4종을 쓴다.
 */
export type Seed = Brand<number, 'Seed'>;

/**
 * 시드 계층 (T2-b·T2-d, 파생 로직은 2팀 `src/lib/sim/rng/derive.ts` 단일 소유):
 * ```
 *   WorldSeed → deriveSeasonSeed → SeasonSeed → deriveMatchSeed → MatchSeed
 *     → deriveEventSeed → EventSeed
 * ```
 * 서로 다른 계층의 시드를 뒤바꿔 쓰면(예: `SeasonSeed` 자리에 `MatchSeed` 전달) `tsc`가
 * 오류로 잡는다. 값 자체의 폭·표현은 `Seed`와 동일(53비트 안전 정수)하며 계층 구분만
 * 브랜드로 표현한다 — 부모→자식 파생 관계 자체를 타입으로 인코딩하지 않는다(T2-b, 계산
 * 로직 재구현 금지).
 */
export type WorldSeed = Brand<number, 'WorldSeed'>;
/** 시즌 시드 — `hash(worldSeed, seasonNumber)` (파생은 2팀 `derive.ts` 단일 소유) */
export type SeasonSeed = Brand<number, 'SeasonSeed'>;
/** 경기 시드 — `hash(seasonSeed, fixtureId)` (파생은 2팀 `derive.ts` 단일 소유) */
export type MatchSeed = Brand<number, 'MatchSeed'>;
/**
 * 이벤트 시드 — `hash(matchSeed, tick, eventIndex)` (파생은 2팀 `derive.ts` 단일 소유).
 * **영속 필드로 쓰이는 곳이 없다** — 틱 단위 이벤트 생성 중 2팀 엔진 내부에서만
 * 소비되는 휘발성 값이라 `src/types/**` 어떤 엔티티에도 컬럼으로 저장되지 않는다(05
 * 문서 E-16 MatchEvent에 시드 컬럼 없음). 계층 대칭을 위해 export만 해 둔다.
 */
export type EventSeed = Brand<number, 'EventSeed'>;

/**
 * 포인트(게임 내 통화) — **정수 고정**(DC-08). 소수점 연산을 도입하지 않는다.
 * 물리 스키마의 `bigint` 컬럼과 대응하되, 안전 정수 범위(`Number.MAX_SAFE_INTEGER`)
 * 안에서 정수로만 다룬다는 전제는 `Seed`와 동일하다. 정수 보장은 생성 지점의 런타임
 * 책임이며(`Number.isInteger`), 이 타입 자체가 소수를 컴파일 타임에 막지는 않는다.
 */
export type Points = Brand<number, 'Points'>;

/** ISO-8601 타임스탬프 문자열. 표시 서식은 UI 계층 책임(T13) */
export type Timestamp = string;
