/**
 * enum성 값 **단일 선언** 파일 — 3일차에는 E-01~E-08이 요구하는 최소분만 선언한다.
 *
 * 근거: `docs/devStep/02.타입스키마설계원칙.md` T8 / 체크리스트 C-6(재선언 금지)
 *
 * ⚠️ 6일차(2026-07-28)에 이 파일에서 전량 확정한다 — 이벤트 23종, 포지션 11군,
 *    부상 4등급, 전술 6종, 페이즈 6종, 마켓 상태, 국적 코드(D-17).
 *    **다른 파일에서 enum성 문자열 유니온을 개별 선언하지 않는다.** 필요하면 이 파일에 추가한다.
 *
 * ⚠️ enum → 번역 키 매핑 **규약**은 7일차 `config.ts` 소관이며(T12), 실제 번역 키 문자열·
 *    키 공간은 4팀 단독 소유(H-09, T12-a)다. 여기에 번역 키를 선점하지 않는다.
 */

/**
 * 시즌 페이즈 (E-01 `current_phase` / E-03 `phase`).
 * 작업표상 "페이즈 6종"이며 6일차에 최종 확정한다. 현재는 요구사항 05 E-01 기재분 5종.
 */
export type SeasonPhase =
  | 'REGULAR'
  | 'CUP_SLOT'
  | 'PLAYOFF'
  | 'SETTLEMENT'
  | 'PRESEASON';

/** 감독 스타일 (E-06 `style`) — 전술 6종(D-20 · T21 폴백 = `BALANCED`) */
export type ManagerStyle =
  | 'ATTACKING'
  | 'BALANCED'
  | 'DEFENSIVE'
  | 'COUNTER'
  | 'POSSESSION'
  | 'HIGH_PRESS';

/** 포메이션 7종 (E-06 `preferred_formation`) — 값 목록은 6일차 확정 */
export type Formation = string;

/** 포지션 11군 (E-07 `preferred_position`) — 6일차에 유니온으로 확정 */
export type Position = string;

/** 주발 (E-07 `preferred_foot`) */
export type PreferredFoot = 'LEFT' | 'RIGHT' | 'BOTH';

/**
 * 국적 코드 (E-07 `nationality`) — D-17.
 * 국가 목록을 타입에 하드코딩한 유니온으로 고정하지 않는다(T9). 공통코드 조회 결과와
 * 정합하는 형태로 두며, 6일차에 코드 체계(ISO 3166-1 alpha-2 등)를 확정한다.
 */
export type NationalityCode = string;

/** 선수 성향 태그 (E-07 `taste_tags`) — 값 목록은 6일차 확정 */
export type TasteTag = string;
