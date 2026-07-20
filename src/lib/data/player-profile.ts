/**
 * `Player` → `PublicPlayerProfile` 변환 — **21일차(2026-08-18), 결함 A 조치로 이동**
 *
 * 원래 `src/lib/mock/fixtures/screens.ts`(3팀, 17일차)에 있었다. `pa`(잠재능력 원값,
 * I-38) 제외 규칙을 `MockDataSource`가 재사용한다는 이유로 export돼 있었는데, 6팀이
 * 같은 함수를 `SupabaseDataSource`(Task 034, 프로덕션 어댑터)에서도 import하면서
 * **프로덕션 데이터 어댑터의 모듈 그래프에 Mock 월드 생성기 스택 전체(`generateMockWorld`
 * 등)가 딸려 들어가는 결함**이 발생했다(팀장 21일차 검증, 결함 A) — `NEXT_PUBLIC_DATA_SOURCE`
 * 플래그로 Mock을 완전히 떼어낼 수 있어야 한다는 Task 034 전제와 충돌한다.
 *
 * 이 변환은 Mock 의존이 전혀 없는 순수 함수라(`Player` 필드 재배열 + PA→등급 환산) Mock
 * 밖으로 옮기는 데 제약이 없다 — `src/lib/data/`(1팀 소유, `DataSource.ts`가 `PublicPlayerProfile`
 * 정의) 아래로 이동해 `MockDataSource`·`SupabaseDataSource` 양쪽이 동등하게 참조한다.
 */

import type { Player } from '@/types';
import type { PublicPlayerProfile } from './DataSource';

/**
 * `Player.pa`(잠재능력 원값, 1~30)를 1~5 스카우트 등급으로 환산한다. 등급 구간은 6점
 * 단위 균등 분할(1~6→1, 7~12→2, …, 25~30→5)이며, 실제 스카우팅 밸런스 튜닝(031b)이
 * 이 상수를 대체할 수 있다.
 */
function toScoutRating(pa: number): 1 | 2 | 3 | 4 | 5 {
  const rating = Math.ceil(pa / 6);
  return Math.min(5, Math.max(1, rating)) as 1 | 2 | 3 | 4 | 5;
}

/**
 * `Player` → `PublicPlayerProfile` 변환. `pa`를 구조적으로 제외한다(I-38) — 구조분해
 * rest 패턴은 미사용 변수 lint 경고가 남아 필드를 전부 나열하는 쪽을 택한다(`Player`
 * 필드 목록은 `world.ts`가 이미 동결 타입 그대로 채우고 있어 이 목록도 함께 검증됨 —
 * 필드 추가/삭제 시 여기서 타입 에러로 드러난다).
 */
export function toPublicProfile(player: Player): PublicPlayerProfile {
  const {
    id,
    name,
    nationality,
    birthSeason,
    age,
    preferredFoot,
    preferredPosition,
    reputation,
    marketValue,
    tasteTags,
    retiredAtSeason,
  } = player;
  return {
    id,
    name,
    nationality,
    birthSeason,
    age,
    preferredFoot,
    preferredPosition,
    reputation,
    marketValue,
    tasteTags,
    retiredAtSeason,
    scoutRating: toScoutRating(player.pa),
  };
}
