/**
 * 스탯 자연 누적 — 이벤트 로그가 SSOT, 사후 임의 배분 금지 (AS-10)
 *
 * Task 023 / 11일차(2026-08-04) 산출물. `docs/team-schedule/02-시뮬레이션엔진팀.md` 11일차 행:
 * "스탯 자연 누적 — 이벤트 로그가 SSOT, 사후 임의 배분 금지 (AS-10)". 완료 판정
 * "스탯이 전부 이벤트에서 파생"은 **이 파일이 실제로 값을 채우는 필드에 한해** 성립한다 —
 * 아래 "AS-10 부분 무효화와 Tier 분류" 절 참조.
 *
 * ## 이 파일의 책임 범위 — "자연 누적"의 의미
 * 10일차 `events.ts`가 만든 `MatchEventDraft[]`(이미 시간순 정렬, `sequence` 1부터 연속)를
 * **한 번 순회하며 세는 것**만 한다. 무작위성이 전혀 없다 — 순수 카운트 폴드이므로
 * `src/lib/sim/rng/**`(PRNG/시드 파생/정밀도 비교)를 이 파일이 import하지 않는 것이 정상이다
 * (틱 순회·이벤트 생성과 달리 "판정"이 아니라 "집계"만 하기 때문). 교체 로직(12일차
 * `substitution.ts`), 승부차기(13일차 `penalty.ts`), GK 대체(14일차 `gk-fallback.ts`)는
 * 전부 이 파일의 범위 밖이다.
 *
 * ## AS-10 부분 무효화와 Tier 분류 (I-34 3차 판정 반영)
 * `docs/ISSUES.md` AS-10은 "스탯은 이벤트 로그로부터 파생 가능하며 이벤트가 SSOT다"라고
 * 전제했으나, **9일차에 부분 무효화가 확정**됐다 — `PlayerStatCoreValues`(56필드) 중
 * `MatchEventType`(23종, 폐쇄 집합)에 대응 이벤트가 있는 필드(Tier A)만 이 전제가 유효하고,
 * 대응 이벤트가 없는 필드(Tier B — 패스·드리블·수비 세부 등)는 구조적으로 이벤트 폴드가
 * 불가능하다. **I-34 3차 판정이 채택한 대안은 `matchSeed` 재시뮬레이션**이다 — 이벤트
 * 로그가 아니라 `matchSeed`가 이 엔진의 결정론 SSOT(NFR-QA-003)이므로, 같은 시드로
 * Tier B 값을 별도 계산해도 AS-10이 실제로 금지하는 "사후 임의 배분"(무작위/재현 불가능한
 * 사후 보정)이 아니다. **그 재시뮬레이션 메커니즘 자체는 이 파일의 범위 밖**이다 — 여기서는
 * Tier B 필드에 0이나 다른 placeholder를 채우지 않는다(그 자체가 일종의 임의 배분이 되어
 * AS-10을 위반할 소지가 있다 — I-34가 이미 "0 자리표시자"안을 기각한 이유와 같은 논리).
 *
 * `docs/ISSUES.md` I-34는 "11일차 `stats.ts`에서 56필드 전량을 매핑표로 확정(2·5팀 동의)"을
 * 명시적으로 요구했다 — 아래 `PLAYER_STAT_FIELD_CLASSIFICATION`이 그 산출물이다. TS가
 * `Readonly<Record<keyof PlayerStatCoreValues, ...>>` 리터럴로 56개 키 전량의 존재를
 * 컴파일 타임에 강제한다(과잉/누락 키 모두 오류) — `events.ts`의 `MATCH_EVENT_TYPE_PRESENCE`
 * 관용구를 그대로 계승한다(신규 패턴 도입 아님).
 *
 * `accumulatePlayerMatchStats()`의 반환 타입(`PlayerMatchStatTierAFold`)은
 * `Pick<PlayerStatCoreValues, TierAStatField>`로 **구조적으로 Tier B 필드를 가질 수 없다** —
 * 컴파일러가 "Tier B 필드를 임의로 채우는" 실수 자체를 차단한다. `teamId`/`matchId`/
 * `matchRating`/`isMotm`도 이 파일 스코프 밖이라 반환 타입에 포함하지 않는다 — 그 값들은
 * 로스터·평점 산식(35일차 `standing/aggregate.ts`) 등 다른 계층의 책임이다.
 *
 * ## 미확정 가정 3건 — 2팀 판정(가정), 1팀 SSOT 승인 대기
 * 아래 판단은 확정된 결정(D-계열, I-계열 해소 항목)에 없어 이 파일이 자체적으로 내린 가정이다.
 * 틀렸다고 판명되면 이 파일만 고치면 된다(다른 계층이 이 가정에 의존하지 않는다).
 *
 * 1. **`foulsDrawn`의 귀속 대상 = `FOUL`/`PENALTY_AWARDED`의 `secondaryPlayerId`(피해자)**.
 *    `MatchEvent.secondaryPlayerId` 필드 헤더 주석은 "이벤트 타입별로 의미가 달라지는
 *    범용 보조 참조"라고만 정의하고 `FOUL`/`PENALTY_AWARDED`의 구체 의미는 명시하지 않는다
 *    (`SUBSTITUTION`의 "교체 아웃 선수"만 예시로 듦) — 그래서 "행위자=`primaryPlayerId`,
 *    상대방=`secondaryPlayerId`" 패턴(예: `PENALTY_MISSED`의 선방 GK)을 유추 적용했다.
 *    틀렸다면(예: 피해자가 아예 기록되지 않는 설계라면) `foulsDrawn`은 이 파일에서
 *    항상 0이 되어야 하며 Tier B로 재분류돼야 한다.
 * 2. **`yellowCards`에 `SECOND_YELLOW`를 폴드한다**(총 옐로 노출 수 = `YELLOW_CARD` +
 *    `SECOND_YELLOW`, `secondYellows`는 그중 퇴장으로 이어진 것만 별도 표시). I-43(`GOAL`+
 *    `PENALTY_SCORED`→`goals`)·I-60(`FOUL`+`PENALTY_AWARDED`→`foulsCommitted`/`foulsDrawn`)과
 *    동일한 "일반형+특수형 fold" 패턴을 유추 적용했으나, 카드에 대해서는 팀장/1팀의 별도
 *    확정이 없다. 틀렸다면(예: `yellowCards`가 `SECOND_YELLOW`를 포함하지 않는 설계라면)
 *    `yellowCards`의 `sourceEventTypes`에서 `SECOND_YELLOW`만 제거하면 된다.
 * 3. **`shots`/`shotsOnTarget`/`penaltiesTaken`은 상호 배타** — 페널티킥(`PENALTY_SCORED`/
 *    `PENALTY_MISSED`)은 `shots`/`shotsOnTarget`에 포함하지 않는다. `penaltiesTaken`이라는
 *    별도 필드가 이미 있어 두 카테고리에 중복 집계하면 "슛 20개 중 몇 개가 골"같은 파생
 *    비율(조회 시점 계산, `stat.ts` 헤더 원칙)이 왜곡될 여지가 있다고 판단했다. 실제 축구
 *    통계 관례는 프로젝트마다 다를 수 있어(페널티도 슛에 포함하는 경우가 흔함) 이것도
 *    확정 결정이 아니다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import 0건.
 * `src/types`는 배럴(`@/types`)로만 참조한다(서브경로 금지, 재선언 금지).
 */

import type { MatchEventType, PlayerId, PlayerStatCoreValues } from '@/types';
import type { MatchEventDraft } from './events';

/** Tier A = 오늘 이벤트 폴드로 계산. Tier B = 오늘은 계산하지 않음(미래 인계). */
export type PlayerStatFieldTier = 'A' | 'B';

/**
 * Tier B 필드가 "왜" 오늘 계산되지 않는지의 사유 분류 — 향후 담당(12~14일차 교체/GK대체,
 * 21일차 라인업 선정, 또는 detail 스키마 확정 시점)이 이 매핑표만 보고 "언제 Tier A로
 * 재분류될 수 있는지"를 바로 판단할 수 있게 한다.
 */
export type PlayerStatFieldBlockedReason =
  /** `MatchEventType`(23종, 폐쇄 집합) 안에 대응 이벤트 타입 자체가 없다. */
  | 'NO_EVENT_TYPE'
  /** 대응 이벤트 타입은 있으나, 값을 얻으려면 `detail`의 세부 스키마(오늘은 항상 빈
   * 객체, 10일차 `events.ts` `EMPTY_DETAIL`)가 확정돼야 한다. */
  | 'DETAIL_SCHEMA_UNDEFINED'
  /** 대응 이벤트 타입은 있으나(또는 이벤트만으로는 팀 귀속이 안 되어), 선발 라인업·
   * 교체 타임라인 같은 이벤트 로그 밖의 컨텍스트가 있어야 한다. */
  | 'NEEDS_ROSTER_CONTEXT';

export interface PlayerStatFieldClassification {
  readonly tier: PlayerStatFieldTier;
  /** Tier A일 때 폴드 소스 이벤트 타입 전량(우선순위 없이 전부 합산). Tier B면 빈 배열. */
  readonly sourceEventTypes: readonly MatchEventType[];
  /** Tier B일 때만 존재. */
  readonly blockedReason?: PlayerStatFieldBlockedReason;
  /** 분류 근거 한 줄(감사 추적용). */
  readonly note: string;
}

const NO_SOURCE_EVENTS: readonly MatchEventType[] = [];

/**
 * `PlayerStatCoreValues`(`@/types`, 56필드, 8일차 동결) 전량의 Tier A/B 분류 매핑표.
 * `docs/ISSUES.md` I-34 3차 판정이 "11일차 `stats.ts`에서 56필드 전량 매핑표로 확정"을
 * 요구한 산출물이다. 키가 하나라도 빠지거나 `PlayerStatCoreValues`에 없는 키가 섞이면
 * `npx tsc --noEmit`이 즉시 실패한다 — `events.ts` `MATCH_EVENT_TYPE_PRESENCE`와 같은
 * 취지(완전성 강제)의 관용구이되, 여기서는 `:` 명시적 타입 주석 대신 `satisfies`를 쓴다.
 * 아래 `TierAStatField`가 각 필드의 `tier`를 `'A'|'B'` 유니온이 아니라 필드별 리터럴로
 * 읽어야 하는데, `:` 주석은 값을 주석 타입으로 넓혀버려 리터럴 정보를 지운다 — `satisfies`는
 * 56키 완전성 검사는 그대로 하면서 각 필드의 리터럴 타입은 보존한다.
 */
export const PLAYER_STAT_FIELD_CLASSIFICATION = {
  // 출전 (4) — Tier B: 선발 명단·교체 타임라인은 이벤트 로그만으로 재구성할 컨텍스트가 없다.
  appearances: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'NEEDS_ROSTER_CONTEXT',
    note: '이 경기에 뛰었는가 자체가 라인업 데이터 — 21일차 라인업 선정 인계 후 재평가.',
  },
  starts: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'NEEDS_ROSTER_CONTEXT',
    note: '선발 11명 여부는 킥오프 이전 라인업 확정 데이터가 필요 — 이벤트 로그에 없음.',
  },
  subAppearances: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'NEEDS_ROSTER_CONTEXT',
    note: 'SUBSTITUTION 이벤트는 있으나 "선발 명단에 없었다"를 확정하려면 라인업이 필요 — 12일차 substitution.ts 인계 후 재평가.',
  },
  minutesPlayed: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'NEEDS_ROSTER_CONTEXT',
    note: 'SUBSTITUTION 교체 시각만으로는 출전 시작점(선발 vs 교체 투입)을 알 수 없음 — 라인업 필요.',
  },

  // 공격 (13)
  goals: {
    tier: 'A',
    sourceEventTypes: ['GOAL', 'PENALTY_SCORED'],
    note: 'I-43 확정: 정규·연장 PK 득점은 PENALTY_SCORED만 발생(GOAL 중복 없음) — 두 타입 폴드가 곧 총 득점. PENALTY_SHOOTOUT은 별도(D-19, Fixture.pkHome/pkAway).',
  },
  assists: {
    tier: 'A',
    sourceEventTypes: ['ASSIST'],
    note: 'match.ts 주석 확정: 어시스트는 ASSIST 이벤트의 primaryPlayerId가 유일 출처(GOAL.secondaryPlayerId는 미사용).',
  },
  shots: {
    tier: 'A',
    sourceEventTypes: ['SHOT_ON', 'SHOT_OFF', 'SHOT_BLOCKED', 'GOAL'],
    note: '전체 슛 시도 = 온타깃/오프타깃/블락/골 폴드. 페널티는 미포함(가정 3, penaltiesTaken이 별도 필드).',
  },
  shotsOnTarget: {
    tier: 'A',
    sourceEventTypes: ['SHOT_ON', 'GOAL'],
    note: '득점은 정의상 온타깃 — SHOT_ON과 폴드. 페널티는 미포함(가정 3).',
  },
  xg: {
    tier: 'A',
    sourceEventTypes: ['SHOT_ON', 'SHOT_OFF', 'SHOT_BLOCKED', 'GOAL', 'PENALTY_SCORED', 'PENALTY_MISSED'],
    note: 'events.ts XG_ELIGIBLE_TYPES와 동일 6종. event.xg가 null이면 0으로 합산(estimateXg 콜백 미제공 시 null 가능, events.ts 10일차 코드 확인).',
  },
  xa: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'DETAIL_SCHEMA_UNDEFINED',
    note: 'ASSIST 이벤트에는 xg류 기대값 필드가 없음(MatchEvent.xg는 슛 이벤트 전용) — xA 개념 자체가 스키마에 없다.',
  },
  bigChancesCreated: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'DETAIL_SCHEMA_UNDEFINED',
    note: '"빅찬스" 플래그를 실을 detail 스키마가 아직 없음(10일차 EMPTY_DETAIL) — 확정 시 Tier A 재평가.',
  },
  bigChancesMissed: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'DETAIL_SCHEMA_UNDEFINED',
    note: 'bigChancesCreated와 동일 사유.',
  },
  penaltiesTaken: {
    tier: 'A',
    sourceEventTypes: ['PENALTY_SCORED', 'PENALTY_MISSED'],
    note: '정규·연장 PK 키커 시도 = 성공+실패 폴드. 승부차기(PENALTY_SHOOTOUT)는 별도(D-19).',
  },
  penaltiesScored: {
    tier: 'A',
    sourceEventTypes: ['PENALTY_SCORED'],
    note: 'PENALTY_SCORED 단일 이벤트로 정상 계산 가능(I-43 확정 전제).',
  },
  freeKickGoals: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'DETAIL_SCHEMA_UNDEFINED',
    note: 'GOAL 자체는 있으나 "세트피스 여부"를 구분할 detail 필드가 아직 없음(10일차 EMPTY_DETAIL).',
  },
  headedGoals: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'DETAIL_SCHEMA_UNDEFINED',
    note: 'freeKickGoals와 동일 사유(신체 부위 detail 미정).',
  },
  ownGoals: {
    tier: 'A',
    sourceEventTypes: ['OWN_GOAL'],
    note: 'primaryPlayerId(득점자) 기준 집계. teamId는 수혜팀(I-53, 득점자 소속팀 아님)이라 팀 귀속은 이 파일 스코프 밖 — 반환 타입에 teamId를 포함하지 않는 이유.',
  },

  // 패스 (8) — Tier B: 23종 이벤트 카탈로그 어디에도 패스 관련 타입이 없다(폐쇄 집합).
  passesAttempted: passField('패스 시도'),
  passesCompleted: passField('패스 성공'),
  keyPasses: passField('키패스'),
  longBallsAttempted: passField('롱볼 시도'),
  longBallsCompleted: passField('롱볼 성공'),
  crossesAttempted: passField('크로스 시도'),
  crossesCompleted: passField('크로스 성공'),
  throughBalls: passField('스루패스'),

  // 드리블 (4) — Tier B: 동일 사유.
  dribblesAttempted: noEventField('드리블 시도'),
  dribblesCompleted: noEventField('드리블 성공'),
  dispossessed: noEventField('공 뺏김'),
  touches: noEventField('볼 터치'),

  // 수비 (11) — Tier B: 동일 사유.
  tacklesAttempted: noEventField('태클 시도'),
  tacklesWon: noEventField('태클 성공'),
  interceptions: noEventField('인터셉트'),
  clearances: noEventField('클리어링'),
  blocks: noEventField('블락(수비)'),
  aerialDuelsAttempted: noEventField('공중볼 경합 시도'),
  aerialDuelsWon: noEventField('공중볼 경합 승리'),
  groundDuelsAttempted: noEventField('지상볼 경합 시도'),
  groundDuelsWon: noEventField('지상볼 경합 승리'),
  errorsLeadingToShot: noEventField('실책→슛 유발'),
  errorsLeadingToGoal: noEventField('실책→실점 유발'),

  // 규율 (6)
  foulsCommitted: {
    tier: 'A',
    sourceEventTypes: ['FOUL', 'PENALTY_AWARDED'],
    note: 'I-60 확정: FOUL/PENALTY_AWARDED 폴드(이중집계 방지 + 박스 안 파울 언더카운트 방지).',
  },
  foulsDrawn: {
    tier: 'A',
    sourceEventTypes: ['FOUL', 'PENALTY_AWARDED'],
    note: 'I-60과 동일 폴드, 귀속 방향만 반대(피해자). secondaryPlayerId=피해자는 가정 1(미확정, 1팀 승인 대기).',
  },
  yellowCards: {
    tier: 'A',
    sourceEventTypes: ['YELLOW_CARD', 'SECOND_YELLOW'],
    note: 'I-43/I-60과 동일한 일반형+특수형 폴드를 유추 적용 — 가정 2(미확정, 1팀 승인 대기).',
  },
  secondYellows: {
    tier: 'A',
    sourceEventTypes: ['SECOND_YELLOW'],
    note: '단일 이벤트 카운트.',
  },
  redCards: {
    tier: 'A',
    sourceEventTypes: ['RED_CARD'],
    note: '단일 이벤트 카운트(2번째 옐로 퇴장은 SECOND_YELLOW로 별도 집계, 여기 미포함).',
  },
  offsides: {
    tier: 'A',
    sourceEventTypes: ['OFFSIDE'],
    note: '단일 이벤트 카운트.',
  },

  // GK (10)
  saves: {
    tier: 'A',
    sourceEventTypes: ['SAVE'],
    note: '단일 이벤트 카운트(primaryPlayerId=선방한 GK).',
  },
  shotsFaced: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'NEEDS_ROSTER_CONTEXT',
    note: '팀 단위 피슈팅은 이벤트에서 알 수 있으나, 그 시점에 어느 GK가 골문을 지켰는지(교체 이력)를 알아야 개인 스탯으로 귀속 가능 — 12일차 substitution.ts·14일차 gk-fallback.ts 인계 후 재평가.',
  },
  goalsConceded: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'NEEDS_ROSTER_CONTEXT',
    note: 'shotsFaced와 동일 사유(실점 시점의 GK 재임 여부 필요).',
  },
  cleanSheets: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'NEEDS_ROSTER_CONTEXT',
    note: 'goalsConceded의 파생(0실점 여부)이라 동일 사유로 대기.',
  },
  penaltiesFaced: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'NEEDS_ROSTER_CONTEXT',
    note: 'PENALTY_SCORED(막지 못함)에는 GK 참조 필드가 아예 없어 실점 PK는 이벤트만으로 GK를 특정할 수 없음 — 로스터 컨텍스트 필요.',
  },
  penaltiesSaved: {
    tier: 'A',
    sourceEventTypes: ['PENALTY_MISSED'],
    note: 'I-55 확정: PENALTY_MISSED.secondaryPlayerId = 선방한 GK(막았을 때만 non-null) — secondaryPlayerId 기준 집계.',
  },
  punches: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'NO_EVENT_TYPE',
    note: '23종 이벤트 카탈로그에 펀칭 전용 타입이 없음.',
  },
  catches: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'NO_EVENT_TYPE',
    note: 'punches와 동일 사유(캐칭 전용 타입 없음, SAVE와 구분되지 않음).',
  },
  sweeperActions: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'NO_EVENT_TYPE',
    note: 'punches와 동일 사유.',
  },
  xgPrevented: {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'NEEDS_ROSTER_CONTEXT',
    note: '상대 xg 총합 − 실제 실점을 GK 재임 구간별로 나눠야 해 shotsFaced/goalsConceded와 동일 사유로 대기.',
  },
} as const satisfies Readonly<Record<keyof PlayerStatCoreValues, PlayerStatFieldClassification>>;

/** 패스류 8필드 공통 분류(반복 축소용 — 여기서만 쓰는 파일 내부 헬퍼, export 없음). */
function passField(labelKo: string): PlayerStatFieldClassification {
  return {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'NO_EVENT_TYPE',
    note: `${labelKo}: MatchEventType(23종, 폐쇄 집합)에 패스 계열 이벤트 타입 자체가 없음.`,
  };
}

/** 드리블·수비류 15필드 공통 분류. */
function noEventField(labelKo: string): PlayerStatFieldClassification {
  return {
    tier: 'B',
    sourceEventTypes: NO_SOURCE_EVENTS,
    blockedReason: 'NO_EVENT_TYPE',
    note: `${labelKo}: MatchEventType(23종, 폐쇄 집합)에 대응 이벤트 타입 자체가 없음.`,
  };
}

/**
 * `PLAYER_STAT_FIELD_CLASSIFICATION`에서 `tier: 'A'`인 필드 이름만 뽑은 유니온.
 * `accumulatePlayerMatchStats()`의 반환 타입을 여기서 파생시켜, 매핑표와 집계 함수의
 * 필드 목록이 항상 같은 소스에서 나오게 한다(두 목록이 따로 놀며 어긋나는 것을 방지).
 */
export type TierAStatField = {
  [K in keyof PlayerStatCoreValues]: (typeof PLAYER_STAT_FIELD_CLASSIFICATION)[K]['tier'] extends 'A'
    ? K
    : never;
}[keyof PlayerStatCoreValues];

/** Tier A 필드만 담는 부분 스탯 — Tier B 필드는 이 타입에 구조적으로 존재할 수 없다. */
export type PlayerMatchStatTierAFold = Pick<PlayerStatCoreValues, TierAStatField>;

/** 런타임에서 0으로 초기화된 Tier A 행을 만들기 위한 필드 이름 배열(위 유니온과 반드시 동기화). */
const TIER_A_FIELD_NAMES: readonly TierAStatField[] = [
  'goals',
  'assists',
  'shots',
  'shotsOnTarget',
  'xg',
  'penaltiesTaken',
  'penaltiesScored',
  'ownGoals',
  'foulsCommitted',
  'foulsDrawn',
  'yellowCards',
  'secondYellows',
  'redCards',
  'offsides',
  'saves',
  'penaltiesSaved',
];

function zeroTierARow(): { -readonly [K in TierAStatField]: number } {
  const row = {} as { -readonly [K in TierAStatField]: number };
  for (const field of TIER_A_FIELD_NAMES) {
    row[field] = 0;
  }
  return row;
}

/**
 * `MatchEventDraft[]`(10일차 `events.ts` 산출물)를 순회하며 Tier A 필드만 폴드 집계한다.
 * 무작위성 없는 순수 카운트 — 같은 `events` 배열을 몇 번 넣어도 같은 결과가 나온다.
 *
 * `primaryPlayerId`/`secondaryPlayerId`가 `null`인 경우 해당 증분은 건너뛴다(참가자
 * 미배정 이벤트 — 10일차 `events.ts`가 `resolveParticipants` 미제공 시 항상 이 상태).
 */
export function accumulatePlayerMatchStats(
  events: readonly MatchEventDraft[],
): ReadonlyMap<PlayerId, PlayerMatchStatTierAFold> {
  const rows = new Map<PlayerId, { -readonly [K in TierAStatField]: number }>();

  const ensure = (playerId: PlayerId): { -readonly [K in TierAStatField]: number } => {
    const existing = rows.get(playerId);
    if (existing) {
      return existing;
    }
    const created = zeroTierARow();
    rows.set(playerId, created);
    return created;
  };

  for (const event of events) {
    const { type, primaryPlayerId, secondaryPlayerId, xg } = event;

    switch (type) {
      case 'GOAL': {
        if (primaryPlayerId) {
          const row = ensure(primaryPlayerId);
          row.goals += 1;
          row.shots += 1;
          row.shotsOnTarget += 1;
          row.xg += xg ?? 0;
        }
        break;
      }
      case 'PENALTY_SCORED': {
        if (primaryPlayerId) {
          const row = ensure(primaryPlayerId);
          row.goals += 1;
          row.penaltiesScored += 1;
          row.penaltiesTaken += 1;
          row.xg += xg ?? 0;
        }
        break;
      }
      case 'PENALTY_MISSED': {
        if (primaryPlayerId) {
          const row = ensure(primaryPlayerId);
          row.penaltiesTaken += 1;
          row.xg += xg ?? 0;
        }
        if (secondaryPlayerId) {
          // I-55: 선방한 GK(막았을 때만 non-null).
          ensure(secondaryPlayerId).penaltiesSaved += 1;
        }
        break;
      }
      case 'SHOT_ON': {
        if (primaryPlayerId) {
          const row = ensure(primaryPlayerId);
          row.shots += 1;
          row.shotsOnTarget += 1;
          row.xg += xg ?? 0;
        }
        break;
      }
      case 'SHOT_OFF':
      case 'SHOT_BLOCKED': {
        if (primaryPlayerId) {
          const row = ensure(primaryPlayerId);
          row.shots += 1;
          row.xg += xg ?? 0;
        }
        break;
      }
      case 'ASSIST': {
        if (primaryPlayerId) {
          ensure(primaryPlayerId).assists += 1;
        }
        break;
      }
      case 'OWN_GOAL': {
        // 득점자(primaryPlayerId) 기준 — teamId는 수혜팀이라 팀 귀속은 이 파일 스코프 밖(I-53).
        if (primaryPlayerId) {
          ensure(primaryPlayerId).ownGoals += 1;
        }
        break;
      }
      case 'FOUL':
      case 'PENALTY_AWARDED': {
        // I-60 확정 폴드. foulsDrawn의 secondaryPlayerId=피해자는 가정 1(미확정).
        if (primaryPlayerId) {
          ensure(primaryPlayerId).foulsCommitted += 1;
        }
        if (secondaryPlayerId) {
          ensure(secondaryPlayerId).foulsDrawn += 1;
        }
        break;
      }
      case 'YELLOW_CARD': {
        if (primaryPlayerId) {
          ensure(primaryPlayerId).yellowCards += 1;
        }
        break;
      }
      case 'SECOND_YELLOW': {
        // yellowCards 폴드는 가정 2(미확정).
        if (primaryPlayerId) {
          const row = ensure(primaryPlayerId);
          row.yellowCards += 1;
          row.secondYellows += 1;
        }
        break;
      }
      case 'RED_CARD': {
        if (primaryPlayerId) {
          ensure(primaryPlayerId).redCards += 1;
        }
        break;
      }
      case 'OFFSIDE': {
        if (primaryPlayerId) {
          ensure(primaryPlayerId).offsides += 1;
        }
        break;
      }
      case 'SAVE': {
        if (primaryPlayerId) {
          ensure(primaryPlayerId).saves += 1;
        }
        break;
      }
      // Tier A 기여가 없는 나머지 타입 — 구조/맥락 마커이거나 Tier B 대상.
      case 'KICKOFF':
      case 'CORNER':
      case 'INJURY':
      case 'SUBSTITUTION':
      case 'HALF_TIME':
      case 'FULL_TIME':
      case 'EXTRA_TIME_START':
      case 'PENALTY_SHOOTOUT':
        break;
      default: {
        // MatchEventType이 23종을 넘어서면(향후 enums.ts 변경) 여기서 tsc가 즉시 오류를 낸다.
        const exhaustiveCheck: never = type;
        void exhaustiveCheck;
      }
    }
  }

  return rows;
}
