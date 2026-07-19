/**
 * 인물 도메인 타입 — **E-06 ~ E-11 완성** (4일차 2026-07-24, Task 002)
 *
 * 근거: `docs/require/05-data-requirements.md` 5.3절, FR-PL-002(34속성)
 * 원칙: `docs/devStep/02.타입스키마설계원칙.md` P-16(T4~T6), P-17(T8~T10), P-20(T19~T22)
 *
 * 4일차 변경: `PlayerAttributeValues` 34속성 전건 채움 + E-09 PlayerAttributeHistory /
 * E-10 PlayerPosition / E-11 PlayerState 추가. 인물 도메인(E-06~E-11, 6종) 전건 완성.
 * E-11에는 3일차 교차 점검이 못박은 `condition`·`fitness`·`familiarity_seasons`·
 * `yellow_accumulated_league`/`_cup`가 024(능력치 보정 체인) 입력으로 전부 포함되어 있다.
 *
 * ## 적용 원칙
 * - **D-15**: 하위 엔티티에 `worldId`를 두지 않는다.
 * - **D-16**: 외부(FM 등) 데이터 스키마를 모사한 임포트 DTO 타입을 만들지 않는다(T4).
 *   능력치는 **1~30 정수 스케일**을 따른다(T5).
 *
 *   **T5 최종 결정(8일차, 2026-07-30, 1팀 판정)**: **브랜드 타입을 도입하지 않는다.**
 *   `PlayerAttributeValues`(34필드)·`Manager.tacticalSkill`·`Player.pa` 등 "1~30 스케일"
 *   필드는 전부 `number`로 유지한다. 근거:
 *   ① 이 값들은 2팀 엔진(FR-MT-004 능력치 보정 계수 체인)에서 34개 필드가 동시에 산술
 *   연산(가중합·평균·배율 적용)의 피연산자로 광범위하게 쓰인다. 브랜드화하면 연산마다
 *   unwrap 캐스트가 필요해져 시뮬레이션 코드 전반(2팀)·Mock 생성기(3팀)에 마찰이 크다.
 *   ② ID 브랜드(`TeamId`/`PlayerId` 등)는 "다른 엔티티의 PK를 잘못된 자리에 전달"하는
 *   실수가 실제 참조 무결성 버그로 이어지기 때문에 값어치가 있다. 반면 능력치 필드는
 *   서로 뒤바뀌어도(예: `finishing`↔`passing`) 필드명이 이미 의미를 구분하며, 공유
 *   브랜드 1종(예: `SkillValue`)으로는 그런 혼용조차 막지 못해 방어 실효성이 낮다.
 *   ③ 이미 `Points`(`brand.ts`)가 세운 선례와 일관: "정수 보장은 생성 지점의 런타임
 *   책임이며, 브랜드 자체가 값 제약을 컴파일 타임에 강제하지 않는다"는 원칙이 여기도
 *   적용된다 — nominal 식별이 필요한(다른 개념과 섞일 위험이 실재하는) 값에만 브랜드를
 *   쓴다는 기준으로 보면 능력치는 해당하지 않는다.
 *   **범위(1~30) 검증은 값 생성 지점의 런타임 책임으로 위임한다** — 3팀 Task 007(Mock
 *   팩토리)·6팀 Task 032(Supabase 마이그레이션의 범위 CHECK 제약, 13~18일차)가 담당.
 *   **9일차 정정**: 이 줄이 최초 "Task 034(Supabase 어댑터/DB 제약)"로 적혀 있었으나
 *   실제 범위 CHECK는 Task 032(스키마 마이그레이션) 소관이고 Task 034는 어댑터 코드
 *   작성(DB 제약과 무관)이다 — 6팀 `docs/db/schema-design.md`(9일차 신규) 교차 검토 중
 *   1팀이 발견해 정정했다(주석 정정, C-7 배치 불필요). 타입 레벨 검증은 하지 않으므로
 *   이 결정이 `src/lib/sim/**` 결정론 규칙(NFR-DT-001)에 영향을 주지 않는다. 판정 상세는
 *   `docs/ISSUES.md` I-47.
 * - **D-17**: 국적은 `NationalityCode`(단일 선언, `enums.ts`)를 쓴다. 이름 생성 로직은
 *   3팀 공유 생성기(Task 007) 단일 소유이며 여기서 생성 계약을 재정의하지 않는다(T10).
 * - **D-18**: 선수·감독 이름은 **번역 비대상**(고유명사)이다(T14). 표시 문자열을 담지 않는다.
 * - **D-20**: 감독은 팀 속성이 아닌 **독립 엔티티**이며 팀과 N:1이다(T19). 공석 허용(T21).
 *   협상·계약·이적료 타입은 감독에 대해 만들지 않는다(T22).
 */

import type {
  Formation,
  ManagerStyle,
  NationalityCode,
  Position,
  PreferredFoot,
  TasteTag,
} from './enums';
import type { InjuryId, ManagerId, PlayerId, Points, TeamId } from './brand';

/**
 * **E-06 Manager** — 감독. 팀과 N:1(교체 이력 추적 가능, T19).
 * `teamId`가 null이면 공석이며, 이때 전술 폴백은 `BALANCED`다(T21 / D-23은 3팀 Task 030 소관).
 *
 * **`isActing` 8일차 추가(3팀 SP-1 지적, `docs/ISSUES.md` I-49)** — D-23(공석 즉시 대행
 * 자동 선임, 대행 상한 1시즌 초과 시 강제 정식 선임)을 판정하려면 대행/정식 구분이
 * 필요한데 `tenureSeasons`만으로는 유도할 수 없었다(재직 기간이지 임명 유형이 아님).
 * 2팀·4팀이 오늘 제기한 다른 항목들과 달리 **파생 계산으로 대체할 수 없는** 유일한
 * 지점이라 동결 전 반영으로 판정했다 — 값 목록이 불확실해 보류한 `CardReason`(I-41)과
 * 달리 이 필드는 D-23이 이미 형태(boolean)까지 확정해 둔 상태였다.
 */
export interface Manager {
  readonly id: ManagerId;
  /** null = 공석 */
  readonly teamId: TeamId | null;
  /** 고유명사 — 번역 대상 아님(T14) */
  readonly name: string;
  readonly age: number;
  readonly style: ManagerStyle;
  /** 1~30 정수 스케일(T5) */
  readonly tacticalSkill: number;
  readonly preferredFormation: Formation;
  /**
   * **D-23 대행 여부(I-49, 8일차)** — true = 공석 시 자동 선임된 대행(`BALANCED`,
   * 숙련도 50%). false = 정식 선임. 대행 상한 1시즌 판정은 `isActing && tenureSeasons`의
   * 조합으로 3팀 Task 030(54일차 이후)이 수행한다(생성·전이 로직은 여기서 정의하지 않음).
   */
  readonly isActing: boolean;
  /** 0~100 */
  readonly reputation: number;
  readonly contractUntilSeason: number;
  readonly tenureSeasons: number;
}

/**
 * **E-07 Player** — 선수.
 * 이름·능력치·국적은 전량 시드 기반 절차적 생성 결과다(D-16). 생성 함수 계약은 시드를
 * 명시 인자로 받으며(T6), 타입에 `Date`·난수 기반 암묵 기본값을 두지 않는다.
 */
export interface Player {
  readonly id: PlayerId;
  /** 고유명사 — 번역 대상 아님(T14) */
  readonly name: string;
  /** 국적 코드 — 표시명은 번역 대상이나 코드값 자체는 단일 선언(T8·T14) */
  readonly nationality: NationalityCode;
  readonly birthSeason: number;
  readonly age: number;
  readonly preferredFoot: PreferredFoot;
  /** 11군 중 1 */
  readonly preferredPosition: Position;
  /**
   * 잠재 능력치 1~30. **공개 API 미노출 필드** —
   * 조회 계층(Task 004)에서 공개 응답 타입에 포함하지 않는다.
   */
  readonly pa: number;
  /** 0~100 */
  readonly reputation: number;
  readonly marketValue: Points;
  /** 1~2개 */
  readonly tasteTags: readonly TasteTag[];
  /** 은퇴 시즌. 현역이면 null */
  readonly retiredAtSeason: number | null;
}

/**
 * 34속성 값 블록 (FR-PL-002) — 기술 10 / 정신 10 / 신체 8 / GK 6, 각 1~30 정수.
 *
 * **4일차 완성.** `PlayerAttribute`(E-08)와 `PlayerAttributeHistory`(E-09)가 이 블록을
 * 함께 참조하여 34개 필드가 두 곳에 중복 선언되지 않는다(단일 선언 원칙 / 체크리스트 C-6).
 * 범위(1~30)는 브랜드 타입으로 강제하지 않는다 — **T5 8일차 최종 결정(파일 헤더 참조)**.
 * 생성 지점(Task 007/034)의 런타임 검증 책임으로 위임.
 */
export interface PlayerAttributeValues {
  // 기술 10
  readonly finishing: number;
  readonly passing: number;
  readonly crossing: number;
  readonly dribbling: number;
  readonly firstTouch: number;
  readonly tackling: number;
  readonly marking: number;
  readonly heading: number;
  readonly longShots: number;
  readonly setPieces: number;
  // 정신 10
  readonly composure: number;
  readonly decisions: number;
  readonly vision: number;
  readonly positioning: number;
  readonly workRate: number;
  readonly aggression: number;
  readonly leadership: number;
  readonly teamwork: number;
  readonly anticipation: number;
  readonly determination: number;
  // 신체 8
  readonly pace: number;
  readonly acceleration: number;
  readonly stamina: number;
  readonly strength: number;
  readonly agility: number;
  readonly balance: number;
  readonly jumping: number;
  readonly naturalFitness: number;
  // GK 6
  readonly reflexes: number;
  readonly handling: number;
  readonly oneOnOnes: number;
  readonly aerialReach: number;
  readonly kicking: number;
  readonly commandOfArea: number;
}

/** **E-08 PlayerAttribute** — 선수 능력치 현재값. Player와 1:1 */
export interface PlayerAttribute extends PlayerAttributeValues {
  readonly playerId: PlayerId;
  /** 선호 포지션 기준 파생 캐시 */
  readonly ovrCached: number;
  readonly updatedAtSeason: number;
}

/**
 * **E-09 PlayerAttributeHistory** — 시즌 종료 시점 능력치 스냅샷(성장 곡선용).
 * 복합 키(`playerId` + `seasonNumber`). `PlayerAttributeValues`를 그대로 재사용해
 * `PlayerAttribute`와 필드 중복 선언을 만들지 않는다(C-6).
 */
export interface PlayerAttributeHistory extends PlayerAttributeValues {
  readonly playerId: PlayerId;
  readonly seasonNumber: number;
  /** 시즌 종료 시점 OVR */
  readonly ovr: number;
}

/**
 * **E-10 PlayerPosition** — 선수가 소화 가능한 포지션과 숙련도.
 * 복합 키(`playerId` + `position`). FR-PL-005(선호 1개 + 소화 가능 다수)의 소화 가능 축.
 */
export interface PlayerPosition {
  readonly playerId: PlayerId;
  /** 11군 중 1 (`Position`은 6일차 `enums.ts`에서 11개 리터럴 유니온으로 확정) */
  readonly position: Position;
  /** 1~5. 5 = Natural(선호 포지션과 동일) — FR-PL-006 5단계 숙련도 */
  readonly proficiency: number;
}

/**
 * **E-11 PlayerState** — 선수의 가변 상태(라운드마다 갱신). `Player`와 1:1이지만
 * 갱신 빈도가 매우 높아 분리했다(R-13, 쓰기 경합·캐시 무효화 범위 축소).
 *
 * ⚠️ 3일차 교차 점검 못박음 — 누락 시 024 착수가 막히는 4축을 전부 포함했다:
 * `condition`·`fitness`·`familiaritySeasons`는 능력치 보정 체인(FR-MT-004)의
 * `M_condition`·`M_fitness`·`M_familiarity` 계수 **직접 입력**이고,
 * `yellowAccumulatedLeague`/`_Cup`는 능력치 보정과는 무관하게 **카드 누적 정지**
 * (024, 22일차, 공통코드 `CARD_PARAM.SUSPENSION_THRESHOLD`=5) 판정의 직접 입력이다.
 */
export interface PlayerState {
  readonly playerId: PlayerId;
  /** 계약 팀. FA면 null (R-02: 실제 출전 팀 결정은 Contract/Loan이 담당) */
  readonly teamId: TeamId | null;
  /** 임대 중 실제 출전 팀. 임대 아니면 null */
  readonly onLoanTeamId: TeamId | null;
  /** 팀 내 유일 등번호 */
  readonly squadNumber: number;
  /** 컨디션 1.0 ~ 10.0 (FR-PL-008, FR-MT-008 계수 입력) */
  readonly condition: number;
  /** 피로도 0 ~ 100 (FR-MT-007 계수 입력) */
  readonly fitness: number;
  /** 연속 재직 시즌 — 팀 캐미 계수 입력(FR-PL-010) */
  readonly familiaritySeasons: number;
  /**
   * 리그 누적 경고. **왜 리그/컵을 분리했나(합치지 말 것)**: 옐로카드 5장 누적 시
   * 출장정지(024, 공통코드 `CARD_PARAM.SUSPENSION_THRESHOLD`=5)가 걸리는데, 이 누적은
   * **대회별로 독립 판정**된다(E-20 `PlayerSeasonStat`의 대회 구분 축과 동일 이유) — 리그
   * 누적이 5장이어도 컵 출전에는 영향이 없고 그 반대도 마찬가지다. 두 필드를 하나로
   * 합치면 리그 카드 때문에 컵에서도 정지되는 오류가 생긴다.
   */
  readonly yellowAccumulatedLeague: number;
  /** 컵 누적 경고 — 리그와 독립 판정(위 `yellowAccumulatedLeague` 주석 참조) */
  readonly yellowAccumulatedCup: number;
  /** 리그 잔여 출장정지 */
  readonly suspensionRemainingLeague: number;
  /** 컵 잔여 출장정지 */
  readonly suspensionRemainingCup: number;
  /** 진행 중인 부상. 없으면 null. 엔티티 본체(E-24 Injury)는 5일차 `ops.ts` */
  readonly activeInjuryId: InjuryId | null;
}
