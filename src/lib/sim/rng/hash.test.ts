/**
 * hash.ts 테스트 — Task 006 / 5일차 산출물.
 *
 * SHA-256 구현 자체의 표준 벡터 회귀와, `canonicalize()`/`hashState()`의
 * 직렬화 결정론(키 순서 무관, 재현성)을 검증한다(NFR-DT-003).
 * hashState의 재현성은 "시드 재현성" 요구의 상태-해시 버전에 해당한다.
 */

import { describe, expect, it } from 'vitest';
import { canonicalize, hashState, sha256Hex } from './hash';

describe('hash — SHA-256 표준 테스트 벡터', () => {
  // 아래 다이제스트들은 `sha256sum`(coreutils, FIPS 180-4 준거 구현)으로
  // 직접 재산출해 확인한 값이다. 'abcdbcdecdefdefg...'는 NIST가 배포하는
  // 두 번째 공식 SHA-256 테스트 벡터(56바이트, 패딩이 두 블록에 걸침)다.
  const vectors: ReadonlyArray<readonly [string, string]> = [
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    [
      'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    ],
    [
      'The quick brown fox jumps over the lazy dog',
      'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
    ],
  ];

  it.each(vectors)('sha256Hex(%j) === %s', (input, expected) => {
    expect(sha256Hex(input)).toBe(expected);
    expect(sha256Hex(input)).toHaveLength(64);
  });

  it('sha256Hex는 결정론적이다(동일 입력 → 동일 다이제스트)', () => {
    expect(sha256Hex('football4')).toBe(sha256Hex('football4'));
  });

  it('멀티바이트(서로게이트 페어 포함) 문자열도 처리한다', () => {
    expect(() => sha256Hex('한글 테스트 🎉')).not.toThrow();
    expect(sha256Hex('한글 테스트 🎉')).toHaveLength(64);
  });
});

describe('hash — canonicalize 결정론', () => {
  it('객체 키 삽입 순서가 달라도 동일 문자열을 낸다', () => {
    const a = canonicalize({ season: 3, world: 'w1', points: 10 });
    const b = canonicalize({ points: 10, world: 'w1', season: 3 });
    expect(a).toBe(b);
  });

  it('배열은 순서를 재정렬하지 않고 그대로 보존한다', () => {
    expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
  });

  it('중첩 구조에서도 키 순서 무관성이 재귀적으로 유지된다', () => {
    const a = canonicalize({ outer: { b: 2, a: 1 }, list: [{ y: 1, x: 0 }] });
    const b = canonicalize({ list: [{ x: 0, y: 1 }], outer: { a: 1, b: 2 } });
    expect(a).toBe(b);
  });

  it('undefined 객체 속성은 키 자체를 생략한다', () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it('undefined 배열 원소는 null로 직렬화한다(자리 보존)', () => {
    expect(canonicalize([1, undefined, 3])).toBe('[1,null,3]');
  });

  it('null은 undefined와 구분되어 그대로 유지된다', () => {
    expect(canonicalize({ a: null })).toBe('{"a":null}');
  });

  it('-0과 0은 동일하게 직렬화된다', () => {
    expect(canonicalize(-0)).toBe('0');
    expect(canonicalize(0)).toBe('0');
  });

  it('NaN/Infinity는 RangeError를 던진다', () => {
    expect(() => canonicalize(Number.NaN)).toThrow(RangeError);
    expect(() => canonicalize(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('문자열은 JSON.stringify 이스케이프 규칙을 따른다', () => {
    expect(canonicalize('line1\nline2"quoted"')).toBe(JSON.stringify('line1\nline2"quoted"'));
  });
});

describe('hash — hashState 재현성(상태 해시 버전)', () => {
  it('동일 값을 여러 번 해시하면 항상 동일 문자열이 나온다(재현성)', () => {
    const state = {
      season: 5,
      standings: [
        { teamId: 'a', points: 10 },
        { teamId: 'b', points: 7 },
      ],
    };
    expect(hashState(state)).toBe(hashState(state));
  });

  it('키 순서가 다른 논리적으로 동일한 상태는 동일 해시를 낸다', () => {
    const a = hashState({ season: 5, world: 1 });
    const b = hashState({ world: 1, season: 5 });
    expect(a).toBe(b);
  });

  it('값이 달라지면 해시도 달라진다', () => {
    const a = hashState({ season: 5 });
    const b = hashState({ season: 6 });
    expect(a).not.toBe(b);
  });

  it('hashState는 sha256Hex(canonicalize(value))와 동일하다', () => {
    const value = { a: 1, b: [1, 2, 3] };
    expect(hashState(value)).toBe(sha256Hex(canonicalize(value)));
  });
});
