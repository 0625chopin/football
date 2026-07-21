/**
 * Supabase 어댑터 등록 진입점 — **22일차(2026-08-19), Task 034a 3/3 종료(H-22 전 단계)**
 *
 * 근거: `ROADMAP.md` Task 034 / `docs/team-schedule/06-DB인프라팀.md` 22일차 행 / `factory.ts`
 * "구현 팀 유의사항"("각자의 어댑터 진입 파일에서 `registerDataSource('supabase', ...)`처럼
 * 부수효과로 1회 등록") / `bootstrap.ts`의 `bootstrapDataSource()`가 동적 `import('./supabase')`로
 * 이 파일을 로드한다는 계약. 소유: 6팀 DB·인프라팀(CLAUDE.md `src/lib/data/supabase/**`).
 *
 * `SupabaseDataSource`가 오늘 `DataSource` 전 메서드를 구현했다 — 이 파일은 그 구현체를
 * `factory.ts`의 self-registration 레지스트리에 **등록만** 한다.
 *
 * ## 클라이언트 — `createSupabaseRestQueryClient` (임시 브리지)
 * `@supabase-js`가 아직 미설치라(`CLAUDE.md`) `client.ts`의 PostgREST HTTP 브리지를 쓴다
 * (`client.ts` 헤더 참조). 패키지 설치 후에는 이 한 줄만 실제 `createClient(url, key)`로
 * 바꾸면 된다 — `SupabaseDataSource` 생성자는 `SupabaseQueryClient` 구조적 타입만 요구하므로
 * 수정 불필요.
 *
 * ## 지연 생성(lazy)
 * `registerDataSource`의 두 번째 인자는 프로바이더 함수다 — 이 모듈이 로드되는 시점(=
 * `bootstrapDataSource()` 호출 시점)에 곧바로 HTTP 클라이언트를 만들지 않는다.
 * `getDataSource()`가 최초 호출될 때만 `createSupabaseRestQueryClient()`가 실행되므로,
 * `NEXT_PUBLIC_DATA_SOURCE=mock`으로 구동되는 동안은 Supabase 환경변수 부재로 인한 에러가
 * 나지 않는다(`mock/index.ts`와 동일 원칙).
 *
 * ## 42일차 추가 — `ConstantSource` 등록(I-206) — 이 지점만 예외적으로 즉시(eager) 생성
 * `registerConstantSource('supabase', ...)`도 같은 self-registration 패턴이지만, 등록하는
 * `ConstantSource.getGroupConstants`는 **동기 계약**이라(`./constant-source.ts` 헤더 참조)
 * 등록 시점 이전에 실제 REST 조회를 전부 끝내 둬야 한다. 그래서 이 한 줄만 위 "지연 생성"
 * 원칙의 예외다 — 모듈 최상위 `await`로 `SupabaseConstantSource.load()`가 끝나기를 기다린
 * 뒤에야 등록한다. `bootstrapDataSource()`가 `await import('./supabase')`로 이 모듈 로드를
 * 기다리므로(`bootstrap.ts`), `bootstrapApp()`이 그 직후 호출하는
 * `getRegisteredConstantSource()` 시점에는 이미 값이 채워져 있다. `NEXT_PUBLIC_DATA_SOURCE=mock`일
 * 때는 이 모듈 자체가 로드되지 않으므로(`bootstrapDataSource()`의 리터럴 분기) 이 즉시 조회는
 * supabase 모드에서만 발생한다 — mock 모드의 무해함(위 "지연 생성" 절)은 그대로 유지된다.
 * 조회는 `getDataSource()`가 캐싱하는 것과 별개의 전용 `SupabaseDataSource` 인스턴스로
 * 수행한다(위 `registerDataSource` 줄의 지연 생성 계약을 건드리지 않기 위함 — 인스턴스가
 * 하나 더 생기는 비용은 REST 브리지 특성상(영속 커넥션 없음) 무시할 수준이다).
 */

import { registerConstantSource, registerDataSource } from '@/lib/data/factory';

import { createSupabaseRestQueryClient } from './client';
import { SupabaseConstantSource } from './constant-source';
import { SupabaseDataSource } from './SupabaseDataSource';

registerDataSource('supabase', () => new SupabaseDataSource(createSupabaseRestQueryClient()));

const constantSource = await SupabaseConstantSource.load(
  new SupabaseDataSource(createSupabaseRestQueryClient()),
);
registerConstantSource('supabase', () => constantSource);
