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
  /** FR-MT-002 전 23종 — 값 목록은 6일차 확정(enums.ts 소관), 오늘은 `string` */
  readonly type: MatchEventType;
  readonly teamId: TeamId | null;
  readonly primaryPlayerId: PlayerId | null;
  readonly secondaryPlayerId: PlayerId | null;
  /**
   * 기대 득점(Expected Goals) — **F: 정규 숫자 필드로 승격**(jsonb 파싱 의존 제거).
   * 슛 이벤트가 아니면 null.
   */
  readonly xg: number | null;
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
