/**
 * Mock 전용 `ConstantSource` — 42일차 추가분(2026-09-16), I-206 해소(mock 쪽)
 *
 * 근거: 1팀이 `src/lib/data/factory.ts`에 `registerConstantSource(kind, provider)`를
 * 신설하고 `bootstrap.ts`의 `bootstrapApp()`이 등록된 소스가 있으면 `setGlobalDefaultSource()`로
 * 승격하도록 배선했다(오늘, I-206) — 다만 "등록하는 쪽"이 없어 no-op이었다. 이 파일이 그
 * 등록물이다. `NEXT_PUBLIC_DATA_SOURCE`가 기본값 `mock`이므로(`factory.ts`
 * `getDataSourceKind`), dev 서버가 상시로 찍던 `[config/fallback]` WARN(41일차 인계,
 * `SPONSOR_PARAM`·`SQUAD_PARAM` 등 5그룹 × MATCH_POINTS 20 = 45건/요청)은 supabase가
 * 아니라 **이 mock 경로**로 없어진다.
 *
 * ## 설계 판단 — (a) mock 전용 상수 테이블을 이 팀이 정의한다
 * 팀장이 제시한 두 선택지 중 (a)를 택했다. 근거:
 * - `config/fallback.ts`의 `SAFE_DEFAULT_VALUES`는 이미 05문서 5.12.1절 "코드 예시(기본값)"
 *   컬럼을 그대로 옮긴 표라(fallback.ts 헤더 "값의 출처와 한계" 절), 이 값을 mock의
 *   "정상 기본값"으로 다시 쓰는 것은 새 숫자를 지어내는 게 아니라 **이미 검증된 같은
 *   출처를 재사용**하는 것이다 — 억측 금지 원칙 위반이 아니다.
 * - 유일한 예외는 `UI_PARAM`이다. `SAFE_DEFAULT_VALUES.UI_PARAM`은 fallback.ts 헤더
 *   "예외 — UI_PARAM" 절이 명시하듯 **정상 운영값(5000ms/3000ms)이 아니라 비용 안전망
 *   전용 값(30000ms/15000ms)**이다 — "공통코드 조회 실패(장애)" 상황 전용으로 의도적으로
 *   낮춘 값이다. mock은 "정상 동작 시나리오"를 대표해야 하므로 이 그룹만 정상값으로
 *   덮어쓴다(그 주석이 이미 "정상값 5000/3000은... 전역 기본값 소스가 공급한다"고 예고한
 *   바로 그 지점이 지금 이 파일이다).
 * - (b)(= mock은 전역 기본값 소스를 등록하지 않고 하드코딩 폴백이 mock의 정상 동작이다)를
 *   택하지 않은 이유: `UI_PARAM`처럼 "안전망 값과 정상값이 다른" 그룹이 이미 존재하는 이상,
 *   mock이 하드코딩 폴백을 상시로 쓰면 화면·폴링 등이 "장애 시 값"(POLL_INTERVAL_MS=30s)을
 *   "정상 상태"로 오인해 렌더링한다 — Mock First 원칙("Mock과 실제 DB가 동일 타입·동일
 *   동작 계약을 대표해야 한다")에 어긋난다. 전역 기본값 소스를 등록해 폴백을 "진짜 예외
 *   경로"로 되돌리는 쪽이 옳다.
 *
 * ## 순환 재귀 회피
 * `MockDataSource.getCommonCodes()`는 이미 내부에서 `loadConstants()`를 호출한다
 * (`factory.ts`의 `registerConstantSource` JSDoc이 명시적으로 경고). 그 값을 그대로
 * 전역 기본값 소스로 다시 등록하면 `loadConstants` → 전역 기본값 소스 조회 →
 * `getCommonCodes` → `loadConstants` 무한재귀가 된다. 이 파일은 `loadConstants`를
 * **전혀 호출하지 않는다** — `config/fallback.ts`가 이미 노출한 순수 데이터 객체
 * `SAFE_DEFAULT_VALUES`(모듈 최상위 `const`, 함수 호출이 아니다)를 직접 읽을 뿐이다.
 *
 * ## import 규약
 * `SAFE_DEFAULT_VALUES`·`CommonCodeGroupCode`·`ConstantGroupValues`는 3팀 자신이 소유한
 * `@/lib/config/**`에서 그대로 가져다 쓴다(재선언하지 않음). `ConstantSource`는
 * `@/lib/config/loader`(1팀 `factory.ts`가 재노출하지 않고 원본 소유처를 그대로
 * 가리키는 타입)에서 가져온다.
 */

import type { CommonCodeGroupCode } from '@/lib/config/catalog';
import { SAFE_DEFAULT_VALUES } from '@/lib/config/fallback';
import type { ConstantGroupValues, ConstantSource } from '@/lib/config/loader';

/**
 * `SAFE_DEFAULT_VALUES`(안전망 값) 대비 "정상 운영값"이 달라야 하는 그룹만 오버라이드한다.
 * 현재는 `UI_PARAM` 1개뿐 — 위 파일 헤더 "설계 판단" 절 참조. 새 그룹이 안전망/정상값을
 * 분리해야 하는 사례가 생기면 여기에만 추가하면 된다(전량 재작성 아님).
 */
const MOCK_NORMAL_OVERRIDES: Readonly<Partial<{ [G in CommonCodeGroupCode]: ConstantGroupValues<G> }>> = {
  UI_PARAM: { POLL_INTERVAL_MS: 5000, POLL_LIVE_MS: 3000, LEADERBOARD_MIN_APPEARANCE_PCT: 30 },
};

/**
 * Mock 어댑터가 등록하는 전역 기본값 소스. `getGroupConstants`는 `loadConstants`를
 * 거치지 않고 `SAFE_DEFAULT_VALUES`(+ 위 오버라이드)를 직접 읽는 순수 조회다 — WARN도
 * 남기지 않는다(전역 기본값 소스가 값을 준 것이지 폴백이 아니므로 NFR-CFG-005 ②의
 * 대상이 아니다).
 */
export const mockConstantSource: ConstantSource = {
  name: 'mock-normal-defaults',
  getGroupConstants(group: CommonCodeGroupCode): ConstantGroupValues<CommonCodeGroupCode> | undefined {
    return MOCK_NORMAL_OVERRIDES[group] ?? SAFE_DEFAULT_VALUES[group];
  },
};
