/**
 * emblem.ts 자기검증 — Task 007 / 14일차 산출물.
 *
 * FR-TM-001 수용 기준(① 다양성 ② 외부 요청 없이 렌더 ③ 동일 시드 시 동일 엠블럼)과
 * "외부 네트워크 호출 0건"(팀 일정표 14일차 완료 판정)을 오늘 산출물 수준에서
 * 검증한다. Mock 월드 팩토리 규모(60개 클럽 실사용) 검증은 15일차 이후 별도 스위트가
 * 담당하며, 이 파일을 대체하지 않고 보강한다.
 */

import { describe, expect, it } from 'vitest';
import type { Seed } from '@/types';
import {
  EMBLEM_CHARGES,
  EMBLEM_PATTERNS,
  EMBLEM_SHAPES,
  generateTeamEmblem,
} from './emblem';

/** 테스트 전용 헬퍼 — 원시 정수를 `Seed` 브랜드 타입으로 좁힌다(brand.type-test.ts와 동일 관례). */
function seedOf(value: number): Seed {
  return value as Seed;
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/;

/** "외부 네트워크 호출 0건" 판정 대상 패턴 — xmlns 네임스페이스 문자열은 제외한다. */
const EXTERNAL_REFERENCE_PATTERNS = [
  /<image[\s/>]/i,
  /\bfetch\(/,
  /XMLHttpRequest/,
  /href="https?:/i,
  /xlink:href="https?:/i,
  /url\(\s*https?:/i,
];

describe('generateTeamEmblem', () => {
  it('동일 crestSeed로 두 번 호출하면 바이트 단위로 동일한 결과를 재현한다', () => {
    const seed = seedOf(20260807);

    const first = generateTeamEmblem(seed);
    const second = generateTeamEmblem(seed);

    expect(second).toEqual(first);
  });

  it.each([0, 1, 42, 999, 20260807, Number.MAX_SAFE_INTEGER])(
    'seed=%d — 반환된 SVG에 외부 참조가 없다(외부 네트워크 호출 0건)',
    (rawSeed) => {
      const { svg } = generateTeamEmblem(seedOf(rawSeed));

      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.trim().endsWith('</svg>')).toBe(true);
      for (const pattern of EXTERNAL_REFERENCE_PATTERNS) {
        expect(svg).not.toMatch(pattern);
      }
    },
  );

  it.each([0, 1, 42, 999, 20260807])(
    'seed=%d — 접근성/테마 규약(14일차 2차 교차 점검, 4팀 지적 반영)을 지킨다',
    (rawSeed) => {
      const { svg } = generateTeamEmblem(seedOf(rawSeed));

      // D-18 — 내부에 하드코딩 영문 접근성 레이블을 굳히지 않는다. 장식용(aria-hidden)
      // 이며, 실제 접근 가능한 이름은 소비처가 번역 키로 wrapper에 부여한다.
      expect(svg).not.toContain('aria-label');
      expect(svg).not.toContain('role="img"');
      expect(svg).toContain('aria-hidden="true"');

      // Task 012(다크/라이트 대비) — 윤곽선 색이 SVG 안에 검정으로 고정돼 있지 않다.
      // currentColor로 CSS 상속을 받아야 소비처가 테마별 대비를 조정할 수 있다.
      expect(svg).toContain('stroke="currentColor"');
      expect(svg).not.toMatch(/stroke="rgba?\(/);
    },
  );

  it.each([0, 1, 42, 999, 20260807])(
    'seed=%d — colorPrimary/colorSecondary가 유효한 #rrggbb hex다',
    (rawSeed) => {
      const { colorPrimary, colorSecondary } = generateTeamEmblem(seedOf(rawSeed));

      expect(colorPrimary).toMatch(HEX_COLOR_PATTERN);
      expect(colorSecondary).toMatch(HEX_COLOR_PATTERN);
    },
  );

  it.each([0, 1, 42, 999, 20260807])(
    'seed=%d — shape/pattern/charge가 각 카탈로그에 속한다',
    (rawSeed) => {
      const { shape, pattern, charge } = generateTeamEmblem(seedOf(rawSeed));

      expect(EMBLEM_SHAPES).toContain(shape);
      expect(EMBLEM_PATTERNS).toContain(pattern);
      expect(EMBLEM_CHARGES).toContain(charge);
    },
  );

  it('60개 클럽 분량 이상(80개)의 서로 다른 seed에서 조합 다양성이 1가지로 수렴하지 않는다 (FR-TM-001 ①)', () => {
    const shapes = new Set<string>();
    const patterns = new Set<string>();
    const charges = new Set<string>();
    const svgs = new Set<string>();

    for (let i = 0; i < 80; i += 1) {
      const result = generateTeamEmblem(seedOf(i * 104729 + 7));
      shapes.add(result.shape);
      patterns.add(result.pattern);
      charges.add(result.charge);
      svgs.add(result.svg);
    }

    expect(shapes.size).toBeGreaterThan(1);
    expect(patterns.size).toBeGreaterThan(1);
    expect(charges.size).toBeGreaterThan(1);
    // 80개 클럽이 전부 고유한 SVG를 갖는다(FR-TM-001 ① "60개 클럽 전부 고유").
    expect(svgs.size).toBe(80);
  });

  it('음수 seed는 조용히 대체하지 않고 RangeError를 던진다', () => {
    expect(() => generateTeamEmblem(seedOf(-1))).toThrow(RangeError);
  });

  it('안전 정수 범위를 넘는 seed는 RangeError를 던진다', () => {
    expect(() => generateTeamEmblem(seedOf(Number.MAX_SAFE_INTEGER + 1))).toThrow(RangeError);
  });

  it('정수가 아닌 seed는 RangeError를 던진다', () => {
    expect(() => generateTeamEmblem(seedOf(1.5))).toThrow(RangeError);
  });
});
