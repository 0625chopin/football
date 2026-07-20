/**
 * `keys.ts` 타입 레벨 테스트 — 17일차(2026-08-12) Task 011 산출물.
 *
 * 목적: "존재하지 않는 키 사용 시 타입 오류" 수락 기준을 회귀 테스트로 고정한다.
 * `@/*` 별칭이 vitest에서도 해석되므로(12일차 vitest.config.ts, resolve.tsconfigPaths)
 * 배럴 없이 상대경로로 import한다 — `keys.ts`는 `@/i18n/**` 내부 파일이라 배럴 규약
 * (C-5·C-6, `@/types` 한정) 대상이 아니다.
 *
 * 이 파일은 런타임 단언이 없다 — `expectTypeOf`/`@ts-expect-error`는 `tsc` 컴파일
 * 단계에서만 의미를 가지며, `vitest.config.ts`의 typecheck 모드(실제 tsc 프로세스,
 * esbuild 트랜스폼 아님)가 이 파일을 검증한다. 런타임 include에는 절대 넣지 않는다
 * (I-46/I-84 — esbuild 트랜스폼은 expectTypeOf를 소거해 항상 통과하는 무의미한
 * 테스트가 된다).
 */

import { describe, expectTypeOf, it } from 'vitest';
import { translationKey, type TranslationKey } from './keys';

describe('keys.ts — 네이밍 규약(<namespace>.<component|screen>.<element>)', () => {
  it('실존하는 3단 키는 TranslationKey에 속한다', () => {
    expectTypeOf<'common.header.leagueSwitcherPlaceholder'>().toMatchTypeOf<TranslationKey>();
    expectTypeOf<'error.notFound.title'>().toMatchTypeOf<TranslationKey>();
    expectTypeOf<'match.detail.timelineTitle'>().toMatchTypeOf<TranslationKey>();
    expectTypeOf<'stat.filters.minAppearanceLabel'>().toMatchTypeOf<TranslationKey>();
  });

  it('중간 그룹만으로는(리프 미도달) TranslationKey에 속하지 않는다', () => {
    expectTypeOf<'common.header'>().not.toMatchTypeOf<TranslationKey>();
    expectTypeOf<'common'>().not.toMatchTypeOf<TranslationKey>();
  });
});

describe('keys.ts — translationKey()는 존재하지 않는 키를 tsc가 잡는다 (17일차 수락 기준)', () => {
  it('실존 키는 그대로 통과한다', () => {
    const key = translationKey('common.nav.home');
    expectTypeOf(key).toEqualTypeOf<'common.nav.home'>();
  });

  it('오탈자/미존재 키는 타입 오류다', () => {
    // @ts-expect-error — "common.nav.hmoe"는 어느 네임스페이스에도 없는 키(오탈자)
    translationKey('common.nav.hmoe');
  });

  it('존재하지 않는 네임스페이스는 타입 오류다', () => {
    // @ts-expect-error — "ghost"는 8개 네임스페이스(common/league/match/player/team/stat/admin/error) 밖이다
    translationKey('ghost.foo.bar');
  });

  it('리프까지 도달하지 못한 부분 경로는 타입 오류다', () => {
    // @ts-expect-error — "common.header"는 그룹까지만 지정한 부분 경로다(element 누락)
    translationKey('common.header');
  });
});
