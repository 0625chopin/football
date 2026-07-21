/**
 * `DataSource` 인터페이스 계약 — **Task 004, 9일차(2026-07-31)**, 1팀 코어·품질팀 소유
 *
 * 근거: `ROADMAP.md` Task 004(9~11일차) / `docs/team-schedule/01-코어품질팀.md` 9일차 행 /
 * FR-UI-023(Mock↔실데이터 어댑터), FR-UI-024(React Compiler 전제), FR-BT-008(사후 배팅 방지),
 * FR-MT-016(선계산 후 스트리밍), NFR-MT-002(동일 TS 타입), DC-01, R-16
 *
 * ## 9일차 스코프 (오늘 하는 것 / 안 하는 것)
 * - **오늘**: `DataSource` 인터페이스 시그니처 확정 — 화면별 조회 메서드 9군
 *   (순위·일정·경기·선수·클럽·통계·뉴스·브래킷·어드민). 반환 타입은 **`@/types` 도메인
 *   타입만** 사용한다(이 파일 안에서 이 인터페이스 전용으로 합성한 DTO 포함 — 아래
 *   "합성 DTO" 절 참조. 어떤 필드도 DB 생성 타입을 참조하지 않는다, DC-01).
 * - **10일차(내일)**: 어댑터 선택 팩토리(`factory.ts`, `NEXT_PUBLIC_DATA_SOURCE=mock|supabase`)
 *   + 로딩/에러/빈 상태 결과 래퍼(`result.ts`, FR-UI-000). **오늘은 이 래퍼로 감싸지 않는다** —
 *   모든 메서드가 평범한 `Promise<T>`를 반환한다. 래퍼 도입은 내일 이 인터페이스를
 *   `Promise<Result<T>>` 형태로 감싸는 방식(시그니처 자체는 유지)이 될 예정이다.
 * - **11일차**: 폴링 훅 계약(`polling.ts`).
 * - **범위 밖(다른 계층 소관)**: 쓰기/명령형 조작 — 배속 변경(G2)·정지·재개(G3)·월드 리셋(G5)·
 *   공통코드 저장(H3)은 ROADMAP Task 004 구현사항이 "조회 메서드"로 못박은 범위 밖이다.
 *   이 인터페이스는 **읽기 전용**이며, 위 조작들은 화면 소유 팀(4·5팀, Task 019/021)이
 *   별도 경로(Server Action 등)로 구현한다 — `ops.ts`가 `CommonCodeHistory`/`AuditLog`를
 *   append-only로 설계하며 "수정용 메서드 시그니처를 Task 004 계약에 두지 않는 것으로
 *   강제한다"고 명시한 것과 같은 원칙이다.
 *
 * ## 반환 타입 원칙 (DC-01 / NFR-MT-002)
 * 모든 반환 타입은 `@/types` 배럴에서 온 도메인 타입이거나, 그 필드 전부가 도메인
 * 타입(브랜드 ID·enum·`Points`/`Timestamp`)과 `number`/`string`/`boolean` 원시값으로만
 * 구성된 이 파일 로컬 DTO다. `src/types/**`는 8일차 동결(H-01)됐으므로 새 영속 엔티티를
 * 추가하지 않는다 — 화면이 필요로 하지만 저장 엔티티가 없는 값(스카우트 등급, 경기 팀
 * 스탯 비교)은 **조회 시점 파생값**으로 이 파일에만 로컬 타입을 둔다(아래 각주 참조).
 *
 * ## 미결 이슈 판정 (9일차, 이 계약 설계 산출물)
 * - **I-38 (스카우트 등급 ★1~5)**: 저장 필드가 아니라 **조회 시점 서버 파생**으로 판정한다.
 *   `Player.pa`(잠재능력 원값)는 공개 API 미노출(person.ts 주석)이므로, 공개 프로필 타입은
 *   `Player`에서 `pa`를 제외(`Omit`)하고 서버가 산출한 `scoutRating`(1~5)만 더한다.
 *   와이어프레임 05번(P-2) 확정 사항과 일치: "클라이언트가 PA를 받아 등급으로 환산하는
 *   구조는 금지 — API 응답에 PA 자체가 없어야 한다." 아래 `PublicPlayerProfile` 참조.
 * - **I-34 / W-38 (경기 중 집계 테이블 직접 서빙 금지) — 9일차 3차 판정(2팀 메커니즘 채택)**:
 *   최초 판정("노출된 이벤트에서 재계산한 값만 응답")은 **문자 그대로는 실현 불가능**하다고
 *   6팀이 지적했다(2차 교차 점검) — `PlayerStatCoreValues`(56필드) 중 패스·드리블·수비
 *   그룹 전량 + GK 일부(대략 25~30필드)는 `MatchEventType`(23종) 어디에도 대응 이벤트가
 *   없다 — 애초에 "접어 올릴" 이벤트 자체가 로그에 없다. 이어 2팀이 **왜 `MatchEventType`을
 *   확장하지 않는가**의 근거를 제시했다(3차 판정) — 결정적인 것은 **이 엔진의 결정론 SSOT가
 *   애초에 이벤트 로그가 아니라 `matchSeed` 재시뮬레이션**(NFR-QA-003 "동일 시드 100경기
 *   전건 일치")이라는 점이다. 부수적으로 ① 이벤트 확장은 패스만 경기당 700~1000건이라
 *   D-18("이벤트는 타입 코드만, detail 최소화")·성능 벤치·5팀 이벤트 템플릿(#1~18) 전제와
 *   충돌 ② `enums.ts`(H-01 동결) 구조 변경이라 C-7 배치 필요.
 *
 *   **판정(1팀, 2팀 메커니즘 채택)**: 56필드를 2계층으로 나눈다(정확한 목록은 11일차
 *   `stats.ts` 매핑표에서 확정, 2·5팀 동의) — **Tier A**(대응 이벤트 있음, ~25개 —
 *   goals/assists/shots류/saves/카드류/offsides/xg 등): `LIVE` 중 `getMatchEvents`와
 *   **동일 컷오프**로 노출 이벤트에서 재계산. **Tier B**(대응 이벤트 없음, ~30개 — 패스·
 *   드리블·수비 세부): `LIVE` 중 **같은 `matchSeed`로 컷오프 틱까지 재시뮬레이션**한 값 —
 *   결정론 SSOT가 이벤트가 아니라 시드이므로 이것도 "사후 임의 배분"이 아니라 안전하다
 *   (0 자리표시자로 채우는 1차/2차 판정 초안은 이 메커니즘으로 대체됐다 — 재시뮬레이션 값이
 *   실제 사실이라 자리표시자보다 우월함). `matchRating`은 S-4가 지목한 최대 민감 지표라
 *   예외적으로 `FINISHED` 전엔 중립 고정값(예: 6.0)만 반환한다(부분 계산 자체를 하지 않음).
 *   **재시뮬레이션 방식(2팀에 견해 전달, 팀장 최종 확정 대기)**: 매 요청마다 소스(이벤트든
 *   시드든)에서 다시 계산하는 **동일 패턴 유지를 권고** — `FINISHED` 이후로 노출을 미루거나
 *   (와이어프레임 04번 S-1~S-4가 이미 라이브 부분 노출을 승인해 둬서 부적합) `tick.ts`에
 *   보조 상태를 싣는 방식(`tick.ts` 자신의 9일차 헤더가 이미 "스탯 자연 누적은 이 파일
 *   범위 밖"이라 선을 그어 둠)은 기각한다. `FINISHED` 이후에는 전 56필드 + `matchRating`이
 *   정확한 최종값이다. 반영 위치: 아래 `getMatchPlayerRatings` JSDoc. 041 침투 테스트가
 *   "LIVE 중 Tier B 필드가 최종 확정값과 동일(=재시뮬레이션이 아니라 저장된 최종값 유출)"을
 *   실패 케이스로 검증한다.
 * - **W-38 (경기 단위 팀 스탯 전용 엔티티 부재)**: 정본 47종에 "경기 단위 팀 스탯" 엔티티가
 *   없다(잠정 출처는 `PlayerMatchStat` 팀별 합산 + `MatchEvent` 팀별 카운트). 신규 영속
 *   엔티티를 `src/types/**`에 추가하지 않고(동결 대상), 이 파일에 **비영속 합성 DTO**
 *   `MatchTeamStatComparison`을 둔다 — I-19(PSO 스코어)·I-51(H-15 반환 구조) 판정과 동일
 *   원칙("값이 단일 지점에서만 소비되면 별도 타입/브랜드 불요")을 따른다. **`possessionAvg`도
 *   위 I-34 Tier B 대상**(터치 기반 추정이라 이벤트 미근거) — `LIVE` 중엔 `matchSeed`
 *   재시뮬레이션 값.
 * - **I-50 (플레이오프/컵 브래킷 구조) — 9일차 2차 검증으로 범위 한정 추가**: "다음 경기
 *   링크"(어느 팀이 다음 라운드 어느 경기에 나타나는가)는 원판정대로 `round`+`teamId`
 *   매칭으로 파생 가능하다(4팀·2팀 8일차 독립 판정, 변경 없음). **다만 4팀이 9일차에 별도로
 *   제기한 질문 — 같은 라운드 병렬 경기(예: 8강 4경기)의 "좌우/상하 시각적 슬롯 배치"는
 *   I-50이 다루지 않은 별개 문제**다. `Fixture`에는 회차 내 배치 순서를 나타내는 필드가
 *   없고(`round`/`roundLabel`/팀 ID뿐), `id`(uuid)는 정렬에 의미가 없다. **판정**: 이 갭은
 *   진짜이며 I-50으로 해소됐다고 볼 수 없다 — 구조 변경(슬롯 필드 추가) 없이, 같은 라운드
 *   내 경기 정렬은 `kickoffAt` 오름차순 + `id` 사전식(동시 킥오프 타이브레이크)으로
 *   **안정적이지만 시드 의미는 없는** 순서만 보장한다(대진표가 매번 같은 모양으로 그려지긴
 *   하지만, 그 모양이 실제 대진 시딩 논리(D-24)를 반영한다는 보장은 없다). 진짜 시드
 *   정합 배치가 필요해지면 구조 변경 이슈로 등록해 C-7 배치 반영을 거친다 — 브래킷 UI
 *   착수(4팀 Task 020, 39일차)가 아직 30일 이상 남아 있어 오늘 구조를 바꿀 긴급성은 없다
 *   (I-50이 이미 남긴 "39일차 전 재확인" 지점과 동일 시점에 함께 재확인). 반영 위치:
 *   아래 `getPlayoffBracket`/`getCupBracket` JSDoc.
 *
 * ## 경과 시간 컷오프 계약 (NFR-SEC-004 / FR-MT-016 / FR-BT-008, 전 그룹 공통)
 * 아래 4원칙은 라이브·진행 중 데이터를 반환하는 모든 메서드(경기 상세, 선수 시즌 스탯,
 * 클럽 시즌 지표·순위·최근 경기, 클럽 스쿼드 컨디션 배지)에 **예외 없이** 적용된다
 * (05·06번 와이어프레임 S-1~S-4, S-5, S-9~S-12 통합):
 * 1. **노출된 이벤트에서 재계산한 값만** 응답한다 — 사전 집계된 최종값 직송 금지.
 * 2. **서버가 컷오프를 강제**한다 — 클라이언트 시계·필터링을 신뢰하지 않는다(FR-MT-016 ④).
 * 3. 관련 데이터(이벤트·스탯·평점 등)의 컷오프는 **단일 소스·단일 응답**이어야 한다 —
 *    산정 타이밍이 갈리면 한쪽이 앞서 나가 다음 정보가 선노출된다.
 * 4. **파생 지표(xG·점유율·평점·시즌 누적 스탯 등)에도 동일 컷오프**가 적용된다.
 * 이 인터페이스의 파라미터 목록에 "경과 시간"·"asOf" 류를 **의도적으로 두지 않는다** —
 * 클라이언트가 컷오프 시점을 지정할 수 있는 구조 자체가 NFR-SEC-004 위반의 소지이므로,
 * 컷오프는 항상 서버 시각 기준으로 어댑터 내부에서 결정한다.
 *
 * ## 시즌 스코프 (D-15 단일 월드 전제 + 시즌 선택기)
 * `World`는 단일 레코드이므로 이 계약 어디에도 `worldId` 파라미터가 없다(world.ts 주석:
 * "조회 계층이 현재 월드를 1회 해석해 사용한다(Task 004, 9일차)"). 그러나 순위표
 * (와이어프레임 02번 B1 "[시즌 3▾]")·일정 화면은 **과거 시즌 조회가 실제 요구사항**이므로
 * `seasonId`는 생략 가능한 선택 파라미터로 둔다 — 생략 시 어댑터가 "현재 시즌"
 * (`World.currentSeasonNumber`로 해석된 `Season`)을 기본값으로 사용한다.
 *
 * ## import 규약
 * 이 파일은 도메인 타입을 **배럴(`@/types`)에서만** import한다(체크리스트 C-5·C-6).
 * `@/types/xxx` 서브경로 직접 import를 쓰지 않는다.
 */

import type {
  // 브랜드 ID
  CommonCodeId,
  FixtureId,
  LeagueId,
  PlayerId,
  SeasonId,
  SponsorId,
  TeamId,
  // 원시값 브랜드
  Timestamp,
  // enum성 값
  AuditActorType,
  AwardType,
  CompetitionType,
  CronRunStatus,
  NewsFeedItemType,
  SponsorContractStatus,
  // 월드/리그 (E-01~E-05)
  World,
  League,
  Season,
  Team,
  TeamSeason,
  // 인물 (E-06~E-11)
  Manager,
  Player,
  PlayerAttribute,
  PlayerAttributeHistory,
  PlayerPosition,
  PlayerState,
  // 계약/이동 (E-12~E-14)
  Contract,
  Transfer,
  Loan,
  // 경기 (E-15~E-18)
  Fixture,
  MatchEvent,
  MatchLineup,
  Weather,
  // 통계 (E-19~E-23, E-31, E-32)
  PlayerMatchStat,
  PlayerSeasonStat,
  PlayerCareerStat,
  PlayerStatCoreValues,
  TeamSeasonStat,
  Standing,
  Award,
  Trophy,
  // 사건/운영 (E-24~E-27, E-45~E-47)
  Injury,
  NewsFeedItem,
  CronRun,
  CronGap,
  AuditLog,
  // 경제 (E-28~E-30)
  Sponsor,
  SponsorContract,
  PointTransaction,
  // 설정 (E-41~E-44)
  CommonCodeGroup,
  CommonCode,
  CommonCodeHistory,
} from '@/types';

/* ────────────────────────────────────────────────────────────────────────
 * 합성 DTO — 저장 엔티티가 아니라 이 인터페이스 전용 조회 시점 파생 타입.
 * 필드는 전부 도메인 타입(브랜드 ID·enum)이거나 원시값이다(DC-01, 위 파일 헤더 참조).
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 공개 선수 프로필 — `Player`에서 **`pa`(잠재능력 원값)를 제외**하고 서버 산출
 * `scoutRating`을 더한다(I-38 판정). `pa`는 이 타입에 **구조적으로 존재하지 않는다** —
 * "필드를 숨기는 UI 규칙"이 아니라 "API 응답 자체에 값이 없는 것"이 요구사항이다
 * (와이어프레임 05번 P-2: "API 응답에 PA 부재"). `scoutRating` 산출식(PA→등급 구간
 * 매핑)의 소유는 이 계약 밖(Mock Task 007 / Supabase Task 034 구현 시점 확정).
 */
export type PublicPlayerProfile = Omit<Player, 'pa'> & {
  /** 잠재력 추정 등급, 1~5. 서버가 PA로부터 산출해 내려주는 값만 존재 — 원값은 응답에 없음 */
  readonly scoutRating: 1 | 2 | 3 | 4 | 5;
};

/**
 * 경기 단위 팀 스탯 비교(와이어프레임 04번 D5) — **비영속 파생 DTO**(W-38, 위 파일 헤더
 * 참조). 정본에 "경기 단위 팀 스탯" 엔티티가 없어 `PlayerMatchStat`(팀별 합산)과
 * `MatchEvent`(코너 등 이벤트 카운트)에서 매 요청 재계산된다.
 *
 * ⚠️ **경과 시간 컷오프 필수(S-1~S-4)** — 종료 전에는 경과분 시점까지의 누적값만 담는다.
 * 사전 집계된 최종 스탯을 그대로 반환하는 구현은 이 계약 위반이다.
 */
export interface MatchTeamStatComparison {
  readonly matchId: FixtureId;
  readonly teamId: TeamId;
  /**
   * 점유율(%) — 대체 원시 소스가 없어(터치 수 기반 추정) 서버 파생값. **이벤트 미근거
   * 필드(Tier B, I-34 9일차 3차 판정)** — `LIVE` 중에는 `matchSeed` 재시뮬레이션 값,
   * `FINISHED` 이후 정확한 최종값.
   */
  readonly possessionAvg: number;
  readonly shots: number;
  readonly shotsOnTarget: number;
  /** `MatchEvent(type='CORNER')` 컷오프 이내 카운트 */
  readonly corners: number;
  readonly fouls: number;
  readonly yellowCards: number;
  readonly redCards: number;
  readonly xg: number;
}

/**
 * 월드 시계 컨텍스트(H-24 / I-169 / I-174, 35일차 6팀 합동 리뷰 판정) — 진행 중 경기 경과분·
 * 킥오프 카운트다운 계산에 필요한 "지금" 3종을 **원자적으로 한 번에** 반환하는 합성 DTO.
 * `now`와 `clock`을 따로 조회하면 두 호출 사이에 배속이 바뀌어 앵커와 질의 시각이 어긋난다
 * (`worldMinutesAt`가 어긋난 스냅샷을 받으면 경과분이 오염된다) — 반드시 이 메서드 하나로
 * 묶어 조회한다.
 *
 * `clock`은 `src/lib/sim/schedule/worldclock.ts`의 `WorldClockSnapshot`과 **같은 `World`
 * 부분 필드**를 다시 `Pick`한 것이다. import해 재사용하지 않고 로컬로 재선언한 이유는 이
 * 파일의 import 규약(위 파일 헤더 "반환 타입 원칙" — 반환 타입은 `@/types` 도메인 타입이거나
 * **이 파일 로컬 DTO**여야 함) 때문이다. 두 선언 모두 `World`에서 파생되므로 `World` 필드가
 * 바뀌면 두 파일 모두 `tsc`가 독립적으로 어긋남을 잡는다(단일 소스는 여전히 `World`).
 *
 * `kickoffWorldMinutesByFixtureId`는 **I-174가 완전히 해소되기 전까지는 근사값**이다 — 킥오프
 * 순간의 월드분 앵커를 영속할 필드가 `Fixture`(`src/types/match.ts`)에도 원격 스키마에도 아직
 * 없어(I-174), 구현체(Mock/Supabase)가 "킥오프 이후 배속 전이가 없었다"는 가정 하에
 * `kickoffAt`으로부터 근사 산출한다. 그 가정이 깨지는 경우(경기 중 배속 변경)의 오차는
 * I-174가 앵커 영속 경로(6팀 마이그레이션)를 확정해야 완전히 없어진다 — **이 메서드 신설만
 * 으로 I-169를 "해소 완료"로 보고하지 말 것**(ISSUES.md I-169/I-174 참조).
 *
 * `fixtureIds`에 없거나 존재하지 않는 경기는 결과 맵에서 생략한다(발명하지 않음).
 */
export type WorldClockContext = {
  readonly now: Timestamp;
  readonly clock: Pick<
    World,
    | 'speedMultiplier'
    | 'isPaused'
    | 'pausedTotalMinutes'
    | 'speedChangedAt'
    | 'worldMinutesAtSpeedChange'
    | 'pausedAt'
    | 'clockRevision'
  >;
  readonly kickoffWorldMinutesByFixtureId: Readonly<Record<FixtureId, number>>;
};

/** 일정/결과 화면(FR-UI-004)의 라운드 네비게이션 경계 — 순수 파생값(전부 `number`) */
export interface FixtureRoundBounds {
  readonly minRound: number;
  readonly maxRound: number;
  /** 현재 진행 라운드(진입 시 기본 선택 대상, 와이어프레임 03번 I-1) */
  readonly currentRound: number;
}

/** 크론 실행 지표 요약(와이어프레임 08번 J3) — 최근 N건 집계, 서버 파생(클라이언트 재계산 금지) */
export interface CronRunMetrics {
  readonly successRatePct: number;
  readonly avgDurationMs: number;
  readonly maxDurationMs: number;
  /** 집계에 사용된 표본 크기 */
  readonly sampleSize: number;
}

/**
 * 통계 랭킹(FR-UI-008) 정렬 기준 — `PlayerStatCoreValues`(도메인 타입)의 키 전체를
 * 그대로 재사용한다(신규 유니온을 만들지 않음, C-6과 동일 취지의 재선언 회피).
 */
export type PlayerStatRankingMetric = keyof PlayerStatCoreValues;

/**
 * 통산 다관왕 랭킹(FR-UI-012 "통산 다관왕 랭킹") 1행 — **비영속 파생 DTO**(9일차 2차
 * 교차 점검 갭 보완). `Award`(E-31)는 시즌 단위 개별 수상 레코드만 가지고 있어 "누가
 * 가장 많이 받았는가" 총계는 저장돼 있지 않다 — 매 요청 집계한다. `subjectId`가
 * `string`인 이유는 `Award.playerId`/`managerId`/`teamId`와 동일한 다형 참조 축이기
 * 때문(기존 `PointTransaction.ownerId`/`AuditLog.targetId` 패턴과 동일 원칙, 신규 패턴 아님).
 */
export interface MultiAwardRankingEntry {
  /** 이 랭킹 행이 어느 축(`Award`의 어느 FK)을 집계했는지 */
  readonly subjectType: 'PLAYER' | 'MANAGER' | 'TEAM';
  /** `PlayerId` | `ManagerId` | `TeamId` 중 `subjectType`에 대응하는 값(다형 참조) */
  readonly subjectId: string;
  readonly totalAwards: number;
}

/* ────────────────────────────────────────────────────────────────────────
 * DataSource — 화면별 조회 메서드 9군
 * ──────────────────────────────────────────────────────────────────────── */

export interface DataSource {
  /* ============================================================
   * 1. 순위 (Standings) — FR-UI-003 `/leagues/[leagueId]`
   * ============================================================ */

  /** 리그 목록 — 전역 헤더 리그 스위처(FR-UI-020)·순위표 진입점 공용 */
  getLeagues(): Promise<readonly League[]>;
  getLeague(leagueId: LeagueId): Promise<League | null>;

  /** `World.currentSeasonNumber`로 해석된 현재 시즌 */
  getCurrentSeason(): Promise<Season | null>;
  /** 시즌 선택기(와이어프레임 02번 B1 "[시즌 3▾]")용 전 시즌 목록, 최신순 */
  getSeasons(): Promise<readonly Season[]>;

  /**
   * 라운드별 순위 스냅샷. `round` 생략 시 최신 라운드(`round = MAX(round)`),
   * `seasonId` 생략 시 현재 시즌(위 파일 헤더 "시즌 스코프" 참조).
   */
  getStandings(params: {
    readonly leagueId: LeagueId;
    readonly seasonId?: SeasonId;
    readonly round?: number;
  }): Promise<readonly Standing[]>;

  /* ============================================================
   * 2. 일정 (Fixtures) — FR-UI-002 `/`, FR-UI-004 `/leagues/[leagueId]/fixtures`
   * ============================================================ */

  /** 현재 진행 중(`status='LIVE'`)인 전 경기 — 홈/라이브 센터 카드 그리드 */
  getLiveFixtures(): Promise<readonly Fixture[]>;

  /** 전 리그·전 대회를 통틀어 가장 가까운 예정 킥오프 — 홈·전역 헤더 카운트다운 */
  getNextKickoff(): Promise<Fixture | null>;

  /**
   * 라운드 단위 일정/결과. `competitionType` 생략 시 `'LEAGUE'`, `seasonId` 생략 시
   * 현재 시즌.
   */
  getFixturesByRound(params: {
    readonly leagueId: LeagueId;
    readonly round: number;
    readonly seasonId?: SeasonId;
    readonly competitionType?: CompetitionType;
  }): Promise<readonly Fixture[]>;

  /** 라운드 네비게이션 경계 — 진입 시 기본 선택 라운드 판정에 사용(와이어프레임 03번 I-1) */
  getFixtureRoundBounds(params: {
    readonly leagueId: LeagueId;
    readonly seasonId?: SeasonId;
    readonly competitionType?: CompetitionType;
  }): Promise<FixtureRoundBounds>;

  /**
   * 월드 시계 컨텍스트 — `now`/`clock`/킥오프 앵커를 원자적으로 한 번에 반환한다(I-169/
   * I-174, `WorldClockContext` 주석 참조). 5팀 폴링 훅(Task 015, 기본 5초 간격)이 진행 중
   * 경기 경과분과 다음 킥오프 카운트다운을 계산할 때 이 메서드 하나로 조회한다 — `now`를
   * `Date.now()`로 직접 얻거나 `getWorldStatus()`를 별도 호출해 `clock`만 얻는 방식은 둘
   * 다 금지(전자는 Mock 세계 시각과 어긋나 음수 경과분이 나오고, 후자는 두 호출 사이
   * 배속 변경으로 앵커가 어긋난다).
   */
  getMatchClockContext(fixtureIds: readonly FixtureId[]): Promise<WorldClockContext>;

  /* ============================================================
   * 3. 경기 (Match detail) — FR-UI-007 `/matches/[matchId]`
   * ============================================================ */

  getFixture(fixtureId: FixtureId): Promise<Fixture | null>;

  /**
   * 분 단위 이벤트 로그. **`min(now − kickoff_at, 경기 길이)` 이후 이벤트는 절대
   * 포함하지 않는다**(FR-MT-016, FR-BT-008) — 서버가 컷오프를 강제하며, 이 메서드는
   * "미래 이벤트 조회 시도"라는 별도 기능을 노출하지 않는다(항상 컷오프 이내 배열만 반환).
   */
  getMatchEvents(fixtureId: FixtureId): Promise<readonly MatchEvent[]>;

  getMatchLineups(fixtureId: FixtureId): Promise<readonly MatchLineup[]>;

  /**
   * 선수별 경기 평점·스탯(E-19). ⚠️ **I-34 계약(9일차 3차 판정, 2팀 메커니즘)** — 구현체는
   * 저장된 최종 집계 로우를 그대로 반환하면 안 된다. `status='LIVE'`인 동안: ① **Tier
   * A**(`MatchEventType`에 대응 이벤트가 있는 필드 — goals/assists/shots/shotsOnTarget/
   * saves/카드류/offsides/xg 등)는 `getMatchEvents`와 **동일 컷오프**로 노출된 이벤트에서
   * 재계산한 값 ② **Tier B**(대응 이벤트가 없는 필드 — 패스·드리블·수비 세부 지표 등, 위
   * 파일 헤더 I-34 절 참조)는 **같은 `matchSeed`로 컷오프 틱까지 재시뮬레이션**한 값(결정론
   * SSOT가 이벤트가 아니라 시드이므로 안전 — 0 자리표시자가 아니다) ③ `matchRating`은
   * 중립 고정값(예: 6.0) — 파생 지표라 가장 민감하다(S-4, 최종 평점이 새면 경기 결과가
   * 역산됨). `status='FINISHED'` 이후에는 전 필드가 정확한 최종값이다. 11일차 `stats.ts`가
   * Tier A/B 56필드 전량 매핑표를 확정한다(2·5팀 동의).
   */
  getMatchPlayerRatings(fixtureId: FixtureId): Promise<readonly PlayerMatchStat[]>;

  /**
   * 팀 스탯 비교바(D5) — 홈/원정 2건. `MatchTeamStatComparison` 자체가 비영속 파생
   * DTO이므로(W-38) 항상 재계산 응답이며, `getMatchPlayerRatings`와 동일한 I-34 9일차
   * 3차 판정 컷오프 계약을 따른다 — `possessionAvg`는 Tier B(이벤트 미근거)라 `LIVE` 중
   * `matchSeed` 재시뮬레이션 값, 나머지(`shots`/`shotsOnTarget`/`corners`/`fouls`/카드류/
   * `xg`)는 전부 Tier A(대응 `MatchEventType` 있음)라 `LIVE` 중에도 경과분 컷오프 재계산으로
   * 정확히 채워진다.
   */
  getMatchTeamStats(fixtureId: FixtureId): Promise<readonly MatchTeamStatComparison[]>;

  getMatchWeather(fixtureId: FixtureId): Promise<Weather | null>;

  /* ============================================================
   * 4. 선수 (Player detail) — FR-UI-005 `/players/[playerId]`
   * ============================================================ */

  /** ⚠️ `pa`(잠재능력) 미노출 — `PublicPlayerProfile` 참조(I-38) */
  getPlayerProfile(playerId: PlayerId): Promise<PublicPlayerProfile | null>;
  getPlayerAttribute(playerId: PlayerId): Promise<PlayerAttribute | null>;
  /** 컨디션·피로·카드 누적 등 가변 상태 */
  getPlayerState(playerId: PlayerId): Promise<PlayerState | null>;
  getPlayerPositions(playerId: PlayerId): Promise<readonly PlayerPosition[]>;
  /** 성장 곡선(E7) — 시즌별 능력치 스냅샷 전량, 시즌 오름차순 */
  getPlayerAttributeHistory(playerId: PlayerId): Promise<readonly PlayerAttributeHistory[]>;

  /**
   * 시즌×대회별 집계 스탯 전량(E6 [시즌별] 탭). ⚠️ **경과 시간 컷오프(S-5)** — 진행 중
   * 경기분은 합산하지 않는다, 종료된 경기까지만 집계한 값을 반환한다.
   */
  getPlayerSeasonStats(playerId: PlayerId): Promise<readonly PlayerSeasonStat[]>;
  /** 통산 집계(E6 [통산] 탭). 위와 동일한 컷오프 원칙 적용 */
  getPlayerCareerStat(playerId: PlayerId): Promise<PlayerCareerStat | null>;

  /** 몸값·계약 정보(E5). 현재 유효 계약이 없으면(FA) null */
  getPlayerContract(playerId: PlayerId): Promise<Contract | null>;
  /** 부상 타임라인(E8), 발생 시각 역순 */
  getPlayerInjuries(playerId: PlayerId): Promise<readonly Injury[]>;
  /** 개인 수상 이력(E9 [트로피] 탭 중 개인 수상 부분) */
  getPlayerAwards(playerId: PlayerId): Promise<readonly Award[]>;
  /** 이적 이력(E9 [이적] 탭) */
  getPlayerTransferHistory(playerId: PlayerId): Promise<readonly Transfer[]>;
  /** 임대 이력(E9 [이적] 탭 — 이적과 별도 축, D-21) */
  getPlayerLoanHistory(playerId: PlayerId): Promise<readonly Loan[]>;

  /* ============================================================
   * 5. 클럽 (Club/Team detail) — FR-UI-006 `/teams/[teamId]`
   * ============================================================ */

  getTeam(teamId: TeamId): Promise<Team | null>;
  /** 순위표·일정 등 목록 화면이 팀명·엠블럼을 조인할 때 쓰는 배치 조회 */
  getTeamsByIds(teamIds: readonly TeamId[]): Promise<readonly Team[]>;

  /** 소속 리그·순위·승강 여부. `seasonId` 생략 시 현재 시즌 */
  getTeamSeason(params: {
    readonly teamId: TeamId;
    readonly seasonId?: SeasonId;
  }): Promise<TeamSeason | null>;

  /** 공석이면 null(F3 "임시 감독" 표기는 UI 책임 — `Manager.isActing` 참조) */
  getTeamManager(teamId: TeamId): Promise<Manager | null>;

  /** 스쿼드 명단(F2) — `pa` 미노출(위 `PublicPlayerProfile`과 동일 원칙) */
  getTeamSquad(teamId: TeamId): Promise<readonly PublicPlayerProfile[]>;
  /** 스쿼드 테이블 상태 배지(컨디션·부상·정지)용 — `getTeamSquad`와 `playerId`로 조인 */
  getTeamSquadStates(teamId: TeamId): Promise<readonly PlayerState[]>;

  /**
   * 시즌 지표(F4, FR-ST-002 전량). ⚠️ **경과 시간 컷오프(S-10)** — 종료된 경기까지만
   * 집계한다, 진행 중 경기분 선반영 금지. `seasonId` 생략 시 현재 시즌,
   * `competitionType` 생략 시 `'LEAGUE'`.
   */
  getTeamSeasonStat(params: {
    readonly teamId: TeamId;
    readonly seasonId?: SeasonId;
    readonly competitionType?: CompetitionType;
  }): Promise<TeamSeasonStat | null>;

  /** 재정 패널(F5) 원장 드릴다운 — 최신순, `limit` 생략 시 어댑터 기본값 */
  getTeamPointTransactions(params: {
    readonly teamId: TeamId;
    readonly limit?: number;
  }): Promise<readonly PointTransaction[]>;

  /** 스폰서 계약(F6) — 팀당 최대 3건(활성 기준). 스폰서 자체 정보는 `getSponsorsByIds` 별도 조인 */
  getTeamSponsorContracts(teamId: TeamId): Promise<readonly SponsorContract[]>;
  getSponsorsByIds(sponsorIds: readonly SponsorId[]): Promise<readonly Sponsor[]>;

  /**
   * 스폰서 전체 목록(FR-UI-014 `/sponsors`) — **9일차 2차 검증 갭 보완**. 기존
   * `getSponsorsByIds`는 ID를 이미 아는 경우만 조회 가능해 목록 화면 진입 경로가
   * 없었다. "부도 위험 배지"는 `Sponsor.balance < 0` 또는 `bankruptAtSeason !== null`로
   * 이미 표현 가능해(economy.ts) 별도 파생 필드를 만들지 않는다 — `MatchTeamStatComparison`
   * 과 달리 여기는 진짜 결측 엔티티가 없는 사례라 비영속 DTO를 새로 만들지 않았다.
   */
  getSponsors(): Promise<readonly Sponsor[]>;

  /**
   * 스폰서 계약 조회(범용, 팀·스폰서 어느 축으로든 필터) — **9일차 2차 검증 갭 보완**.
   * "계약 팀 수"(FR-UI-014 목록 배지)는 `sponsorId`로 필터해 반환된 배열 길이로,
   * "계약 상세"는 이 메서드 결과 그대로 쓴다. `getTeamSponsorContracts(teamId)`(팀 축
   * 전용)와 상호 보완 — 이쪽은 스폰서 축 조회가 필요할 때 쓴다.
   */
  getSponsorContracts(params?: {
    readonly sponsorId?: SponsorId;
    readonly status?: SponsorContractStatus;
  }): Promise<readonly SponsorContract[]>;

  getTeamTrophies(teamId: TeamId): Promise<readonly Trophy[]>;

  /** 최근/예정 경기(F8) — 홈/원정 불문. `limit` 생략 시 어댑터 기본값 */
  getTeamFixtures(params: {
    readonly teamId: TeamId;
    readonly limit?: number;
  }): Promise<readonly Fixture[]>;

  /* ============================================================
   * 6. 통계 (Stats ranking) — FR-UI-008 `/stats`
   * ============================================================ */

  /**
   * 선수 랭킹 테이블. `leagueId`가 `null`이면 통합(전 리그) 랭킹. `minAppearancePct`
   * 생략 시 공통코드 `UI_PARAM.LEADERBOARD_MIN_APPEARANCE_PCT`(05:648) 값을 어댑터가
   * 로드해 기본 적용한다.
   */
  getPlayerStatRanking(params: {
    readonly leagueId: LeagueId | null;
    readonly competitionType: CompetitionType;
    readonly metric: PlayerStatRankingMetric;
    readonly minAppearancePct?: number;
    readonly limit?: number;
  }): Promise<readonly PlayerSeasonStat[]>;

  /**
   * 시즌/리그 단위 수상 목록 — **9일차 2차 검증 갭 보완**(FR-UI-012 `/awards`, FR-UI-013
   * `/archive` 수상 요약). `getPlayerAwards`(선수 그룹, 4)는 특정 선수를 이미 알고 있을
   * 때만 쓸 수 있어 시즌 전체를 나열하는 진입 경로가 없었다 — 이 메서드가 그 갭을
   * 메운다. 베스트11(`AwardType='TEAM_OF_SEASON'|'WORLD_XI'`)도 `type` 필터로 조회
   * 가능해 별도 메서드가 불필요하다. `seasonId` 생략 시 현재 시즌.
   */
  getAwards(params?: {
    readonly seasonId?: SeasonId;
    readonly leagueId?: LeagueId;
    readonly type?: AwardType;
  }): Promise<readonly Award[]>;

  /**
   * 통산 다관왕 랭킹(FR-UI-012 "통산 다관왕 랭킹") — **9일차 2차 검증 갭 보완**. 전 시즌
   * `Award`를 `subjectType` 축으로 집계해 내림차순 정렬한 상위 N행을 반환한다(서버 파생,
   * `getPlayerStatRanking`과 동일하게 클라이언트가 전량을 받아 재집계하지 않는다, R-10).
   */
  getMultiAwardRanking(params: {
    readonly subjectType: 'PLAYER' | 'MANAGER' | 'TEAM';
    readonly limit?: number;
  }): Promise<readonly MultiAwardRankingEntry[]>;

  /* ============================================================
   * 7. 뉴스 (News) — FR-UI-011 `/transfers`, FR-UI-002 홈 주요 뉴스
   * ============================================================ */

  /** 발생 시각 역순. `types` 생략 시 전 타입, `limit` 생략 시 어댑터 기본값 */
  getNewsFeed(params?: {
    readonly types?: readonly NewsFeedItemType[];
    readonly limit?: number;
  }): Promise<readonly NewsFeedItem[]>;

  /* ============================================================
   * 8. 브래킷 (Bracket) — FR-UI-009 `/playoffs/[leagueId]`, FR-UI-010 `/cup`
   * ============================================================ */

  /**
   * 플레이오프 대진 — `competitionType='PLAYOFF'` 경기 평면 목록. 다음 경기 연결(승자
   * 매칭)은 UI가 `round`+`homeTeamId`/`awayTeamId`로 파생한다(I-50, 저장하지 않음).
   * ⚠️ **같은 라운드 병렬 경기의 좌우 시각적 슬롯 순서는 시드 의미가 없다**(I-50 9일차
   * 2차 판정 — 위 파일 헤더 참조) — UI는 이 배열을 `kickoffAt` 오름차순 + `id` 사전식
   * 타이브레이크로 정렬해 안정적이지만 대진 시딩(D-24)과 무관한 순서로만 배치해야 한다.
   * `seasonId` 생략 시 현재 시즌.
   */
  getPlayoffBracket(params: {
    readonly leagueId: LeagueId;
    readonly seasonId?: SeasonId;
  }): Promise<readonly Fixture[]>;

  /**
   * 컵대회 대진(6라운드) — `competitionType='CUP'` 경기 평면 목록. 리그 스코프 없음(월드
   * 단일 컵). 좌우 슬롯 순서 제약은 `getPlayoffBracket`과 동일(I-50 9일차 2차 판정).
   */
  getCupBracket(params?: { readonly seasonId?: SeasonId }): Promise<readonly Fixture[]>;

  /* ============================================================
   * 9. 어드민 (Admin, 읽기 전용) — FR-UI-019 `/admin`, FR-UI-025 `/admin/config`,
   *    FR-UI-026 `/admin/scheduler`
   *
   * ⚠️ 배속 변경·정지/재개·월드 리셋·공통코드 저장 등 **쓰기 조작은 이 계약 범위 밖**이다
   * (위 파일 헤더 "9일차 스코프" 참조). 아래는 전부 조회 메서드다.
   * ============================================================ */

  /** G1 — 시즌·페이즈·배속·정지 상태 등 단일 월드 상태 전체 */
  getWorldStatus(): Promise<World>;

  /** H1 — 공통코드 36개 그룹 전량, `sortOrder` 순 */
  getCommonCodeGroups(): Promise<readonly CommonCodeGroup[]>;
  /** H2 — 특정 그룹의 코드 목록 */
  getCommonCodes(groupCode: string): Promise<readonly CommonCode[]>;
  /** H4 — 특정 코드의 변경 이력(append-only, 최신순) */
  getCommonCodeHistory(commonCodeId: CommonCodeId): Promise<readonly CommonCodeHistory[]>;

  /** J1 — 가장 최근 크론 실행 1건 */
  getLatestCronRun(): Promise<CronRun | null>;
  /** J2 — 실행 이력. `limit` 생략 시 최근 100건(와이어프레임 08번 기본값) */
  getCronRuns(params?: {
    readonly status?: CronRunStatus;
    readonly onlyCatchUp?: boolean;
    readonly limit?: number;
  }): Promise<readonly CronRun[]>;
  /** J3 — 성공률·평균/최대 소요 등 서버 집계 지표(클라이언트 재계산 금지, R-10) */
  getCronRunMetrics(params?: { readonly sampleSize?: number }): Promise<CronRunMetrics>;
  /** J4 — 중단 구간 이력. 없으면 빈 배열(UI가 섹션 자체를 숨김) */
  getCronGaps(params?: { readonly limit?: number }): Promise<readonly CronGap[]>;

  /** G6 — 감사 로그. `search`는 어댑터가 `action`/`targetType` 등에 대해 자유 검색 */
  getAuditLogs(params?: {
    readonly actorType?: AuditActorType;
    readonly search?: string;
    readonly limit?: number;
  }): Promise<readonly AuditLog[]>;
}
