/**
 * 경기 시뮬레이션 코어 틱 엔진 골격 — 90틱(+30 연장) 순회
 *
 * Task 023 / 9일차(2026-07-31) 산출물. `docs/team-schedule/02-시뮬레이션엔진팀.md` 9일차 행:
 * "`src/lib/sim/match/` — 90틱(+30 연장) 순회 엔진 골격, 추가시간(전반 0~5 / 후반 1~8) 표현"
 * (동일 항목이 `ROADMAP.md` Task 023 구현 사항 1번째 체크박스에도 있음).
 *
 * ## 이 파일의 책임 범위 — "골격"의 의미
 * 이 파일은 **분(minute) 단위 순회 슬롯만 만든다.** 각 슬롯에서 실제로 무슨 일이
 * 일어나는지(슛/파울/카드 등 이벤트 23종 생성)는 10일차 `events.ts`가 이 배열을
 * 순회하며 채운다(FR-MT-002). 스탯 자연 누적(11일차 `stats.ts`), 교체(12일차
 * `substitution.ts`), 승부차기(13일차 `penalty.ts`), GK 대체(14일차
 * `gk-fallback.ts`)는 전부 이 파일의 범위 밖이다.
 *
 * ## 리터럴 상수 허용 근거
 * 아래 상수(90/45/30/120, 스토피지 범위 0~5·1~8)는 3팀 공통코드(H-05, 13일차 인계)
 * 대상이 아니다. `docs/team-schedule/02-시뮬레이션엔진팀.md` §3.2 H-05 절 각주가
 * "9~12일차의 023 작업(틱 순회·이벤트 생성)은 공통코드가 필요 없는 구조 부분만
 * 수행하도록 배치했습니다"라고 명시한다 — 90분 경기·전후반 45분·연장 30분·스토피지
 * 범위는 축구 규칙 자체의 구조 상수이자 FR-MT 요구사항 원문(9일차 행)에 명시된
 * 값이지, 시즌마다 조정하는 밸런싱 파라미터(NFR-CFG-001 대상 — 팀 수 24/20/16,
 * 라운드 간격 75/90/115분, 상금액 등)가 아니다.
 *
 * ## RNG 사용 방식 — 왜 경기 전체에 걸쳐 단일 상태를 스레딩하지 않는가
 * `derive.ts`의 이벤트 시드 계층은 "같은 틱에서 여러 판정을 해도 서로 다른 독립
 * 스트림을 얻습니다"라고 명시한다 — `matchSeed + tick + eventIndex` 조합마다
 * 독립적으로 시드를 새로 만드는 설계다. 이 파일은 그 설계를 그대로 따라, 스토피지
 * 시간 추첨처럼 판정이 필요한 지점마다 `deriveEventSeed(matchSeed, tick, eventIndex)`로
 * **그 지점 전용 시드**를 새로 만들어 쓴다. 90~120개 tick에 걸쳐 하나의 PrngState를
 * 계속 이어받는 "누적 스레딩"은 이 설계에서 불필요하다 — 그렇게 하면 오히려 10일차
 * `events.ts`가 같은 tick에서 이 파일이 이미 소비한 state를 알아야 다음 판정을
 * 이어갈 수 있게 되어 "틱마다 독립 스트림" 원칙(derive.ts 문서)과 어긋난다.
 * 다만 **하나의 추첨 지점 내부**에서는 여전히 `{state, value}` 규약을 지킨다
 * (`rollStoppageMinutes` 참조 — `nextIntBetween`을 정확히 1회만 호출하므로
 * 상태 재사용 위험이 없다).
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import 0건.
 * `src/types`는 배럴(`@/types`)로 `MatchSeed`만 참조한다(서브경로 금지, 재선언 금지).
 */

import type { MatchSeed } from '@/types';
import { nextIntBetween } from '../rng/prng';
import { deriveEventSeed, stateForSeed } from '../rng/derive';

/**
 * 엔진 내부 상태 라벨. **`src/types`의 `MatchEventType`(이벤트 로그 코드,
 * `KICKOFF`/`HALF_TIME`/`FULL_TIME`/`EXTRA_TIME_START` 등)과는 다른 축이다** —
 * 그 타입은 "무슨 사건이 발생했는가"의 코드값이고, 이 타입은 "지금 순회 중인
 * 구간이 어디인가"를 나타내는 엔진 내부 상태다. 영속 컬럼이 아니므로 도메인 타입
 * 재선언(체크리스트 C-6) 대상이 아니다.
 */
export type MatchPhase =
  | 'FIRST_HALF'
  | 'FIRST_HALF_STOPPAGE'
  | 'SECOND_HALF'
  | 'SECOND_HALF_STOPPAGE'
  | 'EXTRA_FIRST'
  | 'EXTRA_SECOND';

/**
 * 틱 1개 — 순회 슬롯. `minute`/`addedTime`은 `MatchEvent`(`@/types`)의 동명 필드와
 * 동일한 규약(정규 시간=`addedTime` 0, 스토피지=`addedTime` 1 이상)을 따른다.
 * 10일차 `events.ts`가 이 규약을 그대로 이어받아 `MatchEvent.minute`/`addedTime`에
 * 복사할 수 있도록 맞췄다.
 */
export interface MatchTick {
  /** 1부터 시작하는 순차 인덱스(스토피지 슬롯 포함). 로깅·정렬용 — 표시 분이 아니다. */
  readonly tick: number;
  readonly phase: MatchPhase;
  /** 표시 분. 스토피지 구간에서는 45 또는 90에 고정된다. */
  readonly minute: number;
  /** 0 = 정규 시간. 스토피지 구간에서는 1 이상. */
  readonly addedTime: number;
}

export interface BuildTickSequenceOptions {
  readonly matchSeed: MatchSeed;
  /**
   * 연장전 진행 여부. 무승부 시 연장으로 갈지는 상위 계층(13~14일차 승부차기·
   * GK 대체와 맞물리는 판정)이 결정한다 — 이 골격은 신호만 받아 순회할 뿐,
   * 연장 돌입 여부 자체를 판정하지 않는다(책임 경계).
   */
  readonly includeExtraTime: boolean;
}

export interface TickSequenceResult {
  readonly ticks: readonly MatchTick[];
}

/** 전반 종료 시각(분). FR-MT-001 원문 — 축구 규칙 구조 상수. */
export const FIRST_HALF_END_MINUTE = 45;
/** 후반 종료 시각(분, 정규시간). */
export const SECOND_HALF_END_MINUTE = 90;
/** 연장 전반 종료 시각(분). 연장전 30분을 15분씩 2등분한다. */
export const EXTRA_FIRST_HALF_END_MINUTE = 105;
/** 연장 후반 종료 시각(분) = 정규 90 + 연장 30. "120틱까지 순회" 수락 기준의 상한. */
export const EXTRA_SECOND_HALF_END_MINUTE = 120;

interface StoppageRange {
  readonly min: number;
  readonly max: number;
}

/** 전반 추가시간(스토피지) 범위 — team-schedule 9일차 원문 "전반 0~5". */
export const FIRST_HALF_STOPPAGE_RANGE: StoppageRange = { min: 0, max: 5 };
/** 후반 추가시간(스토피지) 범위 — team-schedule 9일차 원문 "후반 1~8". */
export const SECOND_HALF_STOPPAGE_RANGE: StoppageRange = { min: 1, max: 8 };

/**
 * `boundaryMinute`(45 또는 90) 전용 독립 스트림에서 스토피지 분수 1개를 뽑는다.
 * `nextIntBetween`을 정확히 1회 호출하므로 상태 재사용 위험이 없다 — `{state, value}`
 * 스레딩 규약은 이 1회 호출 안에서 자연히 지켜진다.
 */
function rollStoppageMinutes(
  matchSeed: MatchSeed,
  boundaryMinute: number,
  range: StoppageRange,
): number {
  const seed = deriveEventSeed(matchSeed, boundaryMinute, 0);
  const state = stateForSeed(seed);
  const step = nextIntBetween(state, range.min, range.max);
  return step.value;
}

/**
 * 90틱(+연장 30틱) 순회 시퀀스를 만든다.
 *
 * 순서: 전반(1~45) → 전반 스토피지(0~5분, `FIRST_HALF_STOPPAGE_RANGE`) → 후반(46~90)
 * → 후반 스토피지(1~8분, `SECOND_HALF_STOPPAGE_RANGE`) → (연장 시) 연장 전반(91~105)
 * → 연장 후반(106~120). 연장전 자체 스토피지 범위는 요구사항 원문(9일차 행)에 없어
 * 이 골격에는 포함하지 않는다(범위 밖 — 필요해지면 후속 일차에서 이슈 등록 후 반영).
 *
 * `includeExtraTime: true`일 때 마지막 정규 tick의 `minute`은 정확히 120이 되어
 * "120틱까지 순회" 수락 기준을 만족한다.
 */
export function buildTickSequence(options: BuildTickSequenceOptions): TickSequenceResult {
  const { matchSeed, includeExtraTime } = options;

  const ticks: MatchTick[] = [];
  let tickIndex = 1;

  const pushRegular = (phase: MatchPhase, startMinute: number, endMinute: number): void => {
    for (let minute = startMinute; minute <= endMinute; minute += 1) {
      ticks.push({ tick: tickIndex, phase, minute, addedTime: 0 });
      tickIndex += 1;
    }
  };

  const pushStoppage = (phase: MatchPhase, minute: number, stoppageMinutes: number): void => {
    for (let addedTime = 1; addedTime <= stoppageMinutes; addedTime += 1) {
      ticks.push({ tick: tickIndex, phase, minute, addedTime });
      tickIndex += 1;
    }
  };

  pushRegular('FIRST_HALF', 1, FIRST_HALF_END_MINUTE);
  pushStoppage(
    'FIRST_HALF_STOPPAGE',
    FIRST_HALF_END_MINUTE,
    rollStoppageMinutes(matchSeed, FIRST_HALF_END_MINUTE, FIRST_HALF_STOPPAGE_RANGE),
  );

  pushRegular('SECOND_HALF', FIRST_HALF_END_MINUTE + 1, SECOND_HALF_END_MINUTE);
  pushStoppage(
    'SECOND_HALF_STOPPAGE',
    SECOND_HALF_END_MINUTE,
    rollStoppageMinutes(matchSeed, SECOND_HALF_END_MINUTE, SECOND_HALF_STOPPAGE_RANGE),
  );

  if (includeExtraTime) {
    pushRegular('EXTRA_FIRST', SECOND_HALF_END_MINUTE + 1, EXTRA_FIRST_HALF_END_MINUTE);
    pushRegular('EXTRA_SECOND', EXTRA_FIRST_HALF_END_MINUTE + 1, EXTRA_SECOND_HALF_END_MINUTE);
  }

  return { ticks };
}
