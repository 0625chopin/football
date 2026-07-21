/**
 * Mock 어댑터 등록 진입점 — **19일차(2026-08-14), Task 007 종료(H-07)**
 *
 * 근거: `ROADMAP.md` Task 007 / `docs/team-schedule/03-데이터밸런싱배당팀.md` 19일차 행
 * ("⚑ H-07 인계 → 4·5·6팀") / `src/lib/data/factory.ts` "구현 팀 유의사항"("각자의 어댑터
 * 진입 파일(예: `src/lib/data/mock/index.ts`)에서 `registerDataSource('mock', ...)`처럼
 * 부수효과로 1회 등록하면 된다") / `bootstrap.ts`의 `bootstrapDataSource()`가 동적
 * `import('./mock')`로 이 파일을 로드한다는 계약. 소유: 3팀 데이터·밸런싱·배당팀
 * (CLAUDE.md `src/lib/data/mock/**`).
 *
 * ## 이 파일이 하는 것 / 하지 않는 것
 * 18일차 `MockDataSource.ts`가 이미 `DataSource` 69개 메서드를 전부 구현했다 — 이 파일은
 * 그 구현체를 `factory.ts`의 self-registration 레지스트리에 **등록만** 한다. 새 로직을
 * 만들지 않는다.
 *
 * ## 지연 생성(lazy) — 왜 모듈 로드 시점에 `new MockDataSource()`를 호출하지 않는가
 * `registerDataSource`의 두 번째 인자는 프로바이더 함수(`() => DataSource`)다.
 * `factory.ts`의 `getDataSource()`가 최초 호출될 때만 인스턴스를 만들고 캐시하므로, 이
 * 파일이 로드되는 시점(=`bootstrapDataSource()` 호출 시점)에 곧바로 무거운 Mock 월드
 * 생성(`generateMockWorld`+`generateMockProgress`+전 리그 풀 시즌 일정)이 돌지 않는다.
 * `getDataSource()`를 부르지 않는 경로(예: `NEXT_PUBLIC_DATA_SOURCE=supabase`로
 * 부트스트랩만 되고 실제로는 조회하지 않는 테스트)에서 불필요한 계산 비용을 지불하지 않기
 * 위함이다.
 *
 * ## 42일차 추가 — 전역 기본값 소스 등록(I-206 mock 쪽 해소)
 * `registerDataSource` 바로 옆에 `registerConstantSource('mock', ...)`을 함께 등록한다
 * (1팀 `factory.ts` "구현 팀 유의사항" 절이 예고한 확장 지점). 값 정의·순환 재귀 회피
 * 근거는 `./mock-constant-source`(같은 디렉터리, 이 팀 소유) 파일 헤더 참조 — 이 파일은
 * 등록만 하고 로직을 두지 않는다(위 "이 파일이 하는 것 / 하지 않는 것" 절과 동일 원칙).
 */

import { registerConstantSource, registerDataSource } from '@/lib/data/factory';
import { MockDataSource } from './MockDataSource';
import { mockConstantSource } from './mock-constant-source';

registerDataSource('mock', () => new MockDataSource());
registerConstantSource('mock', () => mockConstantSource);
