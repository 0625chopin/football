/**
 * 경기 도메인 타입 — **E-15 ~ E-18 완성** (4일차 2026-07-24, Task 002)
 *
 * 근거: `docs/require/05-data-requirements.md` 5.5절
 * ROADMAP.md:172 "E-09~E-20은 4일차"에 따라 3일차 자체 메모(당시 "5일차")보다 앞서 완성한다.
 * 3일차 변경요청 F(E-16 xG 정규 필드 승격)·G(E-17 positionMultiplier 규약 주석)를
 * 오늘 함께 반영했다(팀장 승인 (b) — 같은 파일을 이틀 연속 재작성하지 않기 위함).
 *
 * 착수 전 확인한 원칙 (`docs/devStep/02.타입스키마설계원칙.md`):
 * - **T18 (D-19)**: 경기 결과 타입은 승패 판정용 **승부차기 스코어를 별도 필드**로 보유한다.
 *   정규+연장 득점과 나란히 두어 합산 가능한 형태로 만들지 않는다. → `pkHome`/`pkAway` 분리.
 * - **T13 (D-18)**: 표시 서식이 아닌 원시값(타임스탬프·숫자)만 담는다.
 * - **C-23 (NFR-SEC-004)**: 종료 전 결과 필드는 **null 허용**이어야 서버가 미래 정보를
 *   비노출로 응답할 수 있다. 타입이 non-null을 강제하면 컷오프 구현이 불가능해진다.
 * - **미결 I-19**: 승부차기 브랜드 생성 책임(별도 브랜드로 `goals` 오사용 원천 차단) —
 *   `pkHome`/`pkAway`는 오늘은 평범한 `number | null`. **5일차 판단 대상으로 남긴다**
 *   (stat.ts의 집계 타입과 함께 결정해야 하므로 오늘 앞당기지 않는다).
 */

import type {
  CompetitionType,
  Formation,
  FixtureStatus,
  MatchEventType,
  Position,
  WeatherType,
} from './enums';
import type {
  FixtureId,
  LeagueId,
  MatchEventId,
  PlayerId,
  SeasonId,
  Seed,
  SnapshotId,
  TeamId,
  Timestamp,
} from './brand';

/**
 * **E-15 Fixture(Match)** — 경기.
 * `snapshotId`는 NOT NULL — 결정론 보장(FR-AD-014, DC-14). 종료 전 결과 필드는 전부
 * nullable이며, 서버가 경과 시간 기준으로 null/값을 결정한다(C-23, NFR-SEC-004).
 */
export interface Fixture {
  readonly id: FixtureId;
  readonly seasonId: SeasonId;
  readonly competitionType: CompetitionType;
  /** 컵은 null */
  readonly leagueId: LeagueId | null;
  /** 리그 라운드 또는 대회 라운드 */
  readonly round: number;
  /** "8강", "결승" 등 표시용 원시 라벨(번역 비대상, T13) */
  readonly roundLabel: string;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly isNeutral: boolean;
  readonly kickoffAt: Timestamp;
  readonly status: FixtureStatus;
  /** 종료 전 null (C-23) */
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  /** 전반 스코어. 종료 전 null */
  readonly htHomeScore: number | null;
  readonly htAwayScore: number | null;
  /** 연장 스코어(정규 득점에 합산되는 값, D-19 포함 대상). 연장 없었으면 null */
  readonly etHomeScore: number | null;
  readonly etAwayScore: number | null;
  /**
   * 승부차기 스코어 — **승패 판정 전용, 통산/득점왕 집계에 합산 금지**(T18, D-19).
   * 브랜드 분리 여부는 미결 I-19(5일차 판단).
   */
  readonly pkHome: number | null;
  readonly pkAway: number | null;
  readonly attendance: number | null;
  /** `hash(seasonSeed, fixtureId)` — 파생 로직은 2팀 `derive.ts` 단일 소유(T2-b) */
  readonly matchSeed: Seed;
  /** NOT NULL — 결정론의 필수 축(FR-AD-014, DC-14) */
  readonly snapshotId: SnapshotId;
  /** 실제 계산 시각. 미계산이면 null */
  readonly simulatedAt: Timestamp | null;
}

/**
 * **E-16 MatchEvent** — 경기 이벤트 로그. 스탯의 SSOT(R-03).
 *
 * **F(3일차 변경요청, 오늘 반영)**: `xG`는 026(36일차) 이벤트 로그 재계산(FR-ST-005)의
 * **입력**이라 `detail` jsonb 파싱에 의존하면 검증이 취약해진다 → 정규 숫자 필드로 승격.
 * `detail`에는 xG를 제외한 나머지(슛 위치, 부상 등급, 카드 사유 등)만 남는다.
 */
export interface MatchEvent {
  readonly id: MatchEventId;
  readonly matchId: FixtureId;
  /** 경기 내 순번 */
  readonly sequence: number;
  readonly minute: number;
  readonly addedTime: number;
  /** FR-MT-002 전 23종 — `enums.ts`의 `MatchEventType`으로 6일차 확정 완료 */
  readonly type: MatchEventType;
  readonly teamId: TeamId | null;
  readonly primaryPlayerId: PlayerId | null;
  /**
   * 이벤트 타입별로 의미가 달라지는 범용 보조 참조(예: `SUBSTITUTION`의 교체 아웃 선수).
   * 해당 타입에 보조 선수 개념이 없으면 null.
   *
   * **`GOAL`에서는 사용하지 않는다(6일차 팀장 지시로 확정, `relatedEventSequence`와의
   * 역할 경계)** — 어시스트 제공 선수는 이 필드에 중복 표기하지 않는다. 근거:
   * ① `PlayerStatCoreValues.assists` 집계가 **`ASSIST` 이벤트의 `primaryPlayerId` 단일
   * 출처**로 정확히 계산되는 것이 이미 I-37 판정의 전제였다 — `GOAL.secondaryPlayerId`에도
   * 같은 값을 중복 기입하면 두 출처가 어긋날 경우(생성기 버그·수동 보정) 스탯 SSOT
   * 원칙(FR-MT-003, AS-10)이 깨진다. ② `ASSIST`가 FR-MT-002에서 `GOAL`과 **별개의
   * 23종 이벤트 타입**으로 이미 존재하므로, 어시스트 제공자는 그 `ASSIST` 이벤트 자신의
   * `primaryPlayerId`가 유일한 출처다. `GOAL` 쪽에서 "이 골의 어시스트가 누구인지"는
   * `relatedEventSequence`로 연결된 `ASSIST` 이벤트를 조회해서 얻는다(중계 타임라인
   * 표시 전용, 통계 재계산 입력 아님) — 이중 표기가 아니라 **단일 링크**다.
   */
  readonly secondaryPlayerId: PlayerId | null;
  /**
   * 기대 득점(Expected Goals) — **F: 정규 숫자 필드로 승격**(jsonb 파싱 의존 제거).
   * 슛 이벤트가 아니면 null.
   */
  readonly xg: number | null;
  /**
   * **I-37 (6일차 반영)** — 이 이벤트가 참조하는 같은 경기(`matchId`) 내 다른 `MatchEvent`의
   * `sequence`. 확정된 참조 방향은 **ASSIST → GOAL**(04 문서 D3 · 2팀 W-24) — `ASSIST` 이벤트가
   * 자신이 만들어낸 `GOAL` 이벤트의 `sequence`를 가리킨다. 해당 없는 이벤트(대부분)는 null.
   * 별도 브랜드 타입을 두지 않은 이유는 I-19(PSO 스코어) 판정과 동일 — 값이 같은 배열
   * 내부에서만 소비되는 단일 지점 참조라 브랜드가 필요할 만큼의 오용 리스크가 없다.
   * `PlayerStatCoreValues.assists` 집계는 이 필드 없이도 `primaryPlayerId`만으로 정확하므로,
   * 이 필드는 통계 재계산의 입력이 아니라 **중계 타임라인 표시 전용**이다(FR-MT-002 수용기준③).
   * `secondaryPlayerId`와의 역할 경계: 어시스트 제공자를 `GOAL.secondaryPlayerId`에
   * 중복 기입하지 않고, 오직 이 필드를 통해 `ASSIST` 이벤트(그 자신의 `primaryPlayerId`가
   * 어시스트 제공자)로 링크한다 — 자세한 근거는 `secondaryPlayerId` 필드 주석 참조.
   */
  readonly relatedEventSequence: number | null;
  /** xG를 제외한 나머지 상세(슛 위치, 부상 등급, 카드 사유 등). 구체 스키마는 소비 시점 확정 */
  readonly detail: Readonly<Record<string, unknown>>;
}

/**
 * **E-17 MatchLineup** — 라인업. 복합 키(`matchId` + `teamId` + `playerId`).
 *
 * **G(3일차 변경요청, 오늘 반영)**: `positionMultiplier`는 저장 정밀도(numeric(4,3), 3자리)가
 * 엔진 내부 계산 정밀도(6자리)보다 낮다. **감사·표시 전용이며 재계산 입력으로 사용 금지** —
 * 능력치 보정 체인(FR-MT-004) 재계산은 항상 엔진이 그 시점에 다시 산출한 배율을 쓴다.
 */
export interface MatchLineup {
  readonly matchId: FixtureId;
  readonly teamId: TeamId;
  readonly playerId: PlayerId;
  readonly formation: Formation;
  /** 11군 중 이 경기에서 실제로 배치된 포지션 */
  readonly positionSlot: Position;
  readonly isStarter: boolean;
  /** 교체 투입/아웃 분. 해당 없으면 null */
  readonly minuteOn: number | null;
  readonly minuteOff: number | null;
  /**
   * 이 경기에 적용된 `M_position` 배율(FR-PL-006) 사본.
   * **감사·표시 전용 — 재계산 입력 금지(G)**. numeric(4,3) vs 엔진 정밀도 6자리(2팀 `precision.ts`).
   */
  readonly positionMultiplier: number;
}

/** **E-18 Weather** — 경기당 날씨. `matchId` PK(1:1, FK) */
export interface Weather {
  readonly matchId: FixtureId;
  /** 9종 — 값 확정(FR-MT-006, enums.ts) */
  readonly type: WeatherType;
  readonly temperature: number;
  readonly windSpeed: number;
  /** 이 경기에 적용된 계수 사본(jsonb) — 구체 스키마는 소비 시점 확정 */
  readonly effectModifiers: Readonly<Record<string, unknown>>;
}
