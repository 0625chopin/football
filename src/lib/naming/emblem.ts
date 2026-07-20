/**
 * 절차적 클럽 엠블럼 SVG 생성기 — **14일차(2026-08-07), Task 007 착수분**
 *
 * 근거: `docs/require/06-prioritization-and-risks.md` D-16(FM 등 실데이터 미사용,
 * 실명 선수·실존 클럽·엠블럼·초상 일절 금지, 전부 시드 기반 절차적 생성) /
 * `docs/require/05-data-requirements.md` DC-11(엠블럼·아바타는 외부 이미지 의존 없이
 * 시드 기반 절차적 SVG로 생성 — 라이선스·용량·오프라인 문제 회피) /
 * `docs/require/03-functional-requirements.md` FR-TM-001(클럽은 이름·약칭·창단
 * 시즌·홈구장·컬러·엠블럼 시드를 가지며, 엠블럼은 시드 기반 절차적 SVG로 생성한다.
 * 수용 기준 ① 60개 클럽 전부 고유 ② 외부 요청 없이 렌더 ③ **동일 시드 시 동일
 * 엠블럼**) / `docs/team-schedule/03-데이터밸런싱배당팀.md` 14일차("외부 에셋·외부
 * API 의존 0" — DC-11, D-16) / `src/types/world.ts` `Team.crestSeed: Seed`. 소유:
 * 3팀 데이터·밸런싱·배당팀(CLAUDE.md `src/lib/naming/**`).
 *
 * ## 외부 의존 0 (완료 판정 기준)
 * 이 파일은 네트워크 호출(`fetch`/`XMLHttpRequest`), 외부 이미지 참조(`<image>`,
 * `href="http…"`), 외부 폰트·CSS·JS 자산을 **전혀** 쓰지 않는다. 산출물은 도형·색상을
 * 인라인 SVG 마크업 문자열로 직접 조립한 **자기완결 텍스트**이며, 렌더링에 네트워크가
 * 전혀 필요 없다(`<svg xmlns="http://www.w3.org/2000/svg">`의 `xmlns`는 W3C 표준
 * XML 네임스페이스 식별자일 뿐 요청 대상 URL이 아니다 — 모든 SVG 문서에 들어가는
 * 고정 문자열).
 *
 * ## `generate.ts`와 반환 계약이 다른 이유
 * 같은 디렉터리의 `generate.ts`(`generatePlayerName`)는 한 월드 안에서 선수 수천
 * 명을 **순차** 생성하며 호출자가 `PrngState`를 계속 이어받는 시퀀스형 계약이다
 * (`{ state, value }`). 반면 `Team.crestSeed`는 `brand.ts`가 정의한 **범용 리프
 * 시드**로, world/season/match/event 계층에 속하지 않고 팀 하나당 독립된 값 하나만
 * 존재한다 — 여러 팀에 걸쳐 이어 쓰는 커서가 아니다. 그래서 이 파일은 2팀 시뮬 엔진이
 * 리프 시드를 다룰 때 쓰는 것과 같은 패턴(`stateForSeed(seed)`로 그 자리에서 로컬
 * 상태를 파생시키고 값만 반환 — `src/lib/sim/match/{penalty,tick,events}.ts` 참고,
 * 읽기 전용 참조)을 따른다. 호출자가 `state`를 관리할 필요가 없고, 같은 `crestSeed`로
 * 몇 번을 다시 불러도(예: UI 재렌더) 항상 같은 결과가 나온다.
 *
 * ## 색상까지 시드 하나로 결정하는 이유 (FR-TM-001 ③)
 * `Team`에는 `crestSeed`와 별개로 `colorPrimary`/`colorSecondary`(hex) 필드가 있지만,
 * 이 함수는 그 둘을 **입력으로 받지 않는다.** FR-TM-001 수용 기준 "동일 시드 시 동일
 * 엠블럼"을 문자 그대로 지키려면 도형·패턴·문양뿐 아니라 색상까지 `crestSeed` 단
 * 하나로 완전히 결정돼야 하기 때문이다(색을 외부 파라미터로 받으면 같은 시드라도
 * 다른 색을 넘겨 다른 결과가 나올 수 있어 이 기준이 깨진다). 대신 이 함수가 생성한
 * `colorPrimary`/`colorSecondary`를 **15일차 Mock 월드 팩토리**(`src/lib/mock/world.ts`,
 * 미착수)가 `Team.colorPrimary`/`Team.colorSecondary`에 그대로 대입하는 소비 계약을
 * 전제한다 — `generate.ts`의 `GeneratedName`을 Mock 팩토리가 `Player.name`에 대입하는
 * 것과 동일한 producer/consumer 패턴이다.
 *
 * ## 순수 함수 계약 (NFR-DT-001)
 * 모듈 스코프 가변 상태가 없고, `Math.random()`/`Date.now()`/`react`/`@supabase/*`를
 * 쓰지 않는다. 난수는 전부 2팀 `src/lib/sim/rng/{prng,derive}.ts`를 경유한다.
 *
 * ## 소비처(미착수 `TeamBadge` 등)가 반드시 알아야 할 것 (14일차 2차 교차 점검, 4팀 지적 반영)
 * - **다크/라이트 대비**: 윤곽선은 `stroke="currentColor"`다 — `docs/team-schedule/
 *   05-*.md` Task 012(다크/라이트 대비 4.5:1 검증)를 만족시키려면 소비처가 이 `svg`를
 *   삽입하는 요소(또는 그 조상)에 반드시 CSS `color`를 지정해야 한다(예: 라이트
 *   `text-black/70`, 다크 `text-white/70`). 지정하지 않으면 브라우저 기본 `color`
 *   상속값이 그대로 쓰인다. 배지 자체의 색(`colorPrimary`/`colorSecondary`/문양 색)은
 *   팀 정체성이라 테마와 무관하게 고정이며 이 규칙의 대상이 아니다.
 * - **접근성 이름(D-18)**: 이 `svg`는 `aria-hidden="true"`인 **장식용** 마크업이라
 *   내부에 접근 가능한 이름이 없다(하드코딩 영문 `aria-label`을 의도적으로 제거했다 —
 *   내부에 굳히면 소비처가 문자열 파싱 없이 로케일별로 바꿀 수 없고 ko 로케일에서도
 *   영어가 읽혔다). 소비처가 이 문자열을 감싸는 요소에 `role="img"` + 번역 키 기반
 *   `aria-label`(예: `t('team.badge.altText', { name: team.name })`)을 반드시 얹어야
 *   스크린리더 사용자에게 의미가 전달된다.
 */

import { nextIntBelow } from '@/lib/sim/rng/prng';
import { stateForSeed } from '@/lib/sim/rng/derive';
import type { Seed } from '@/types';

/** 엠블럼 바탕 도형 5종. */
export const EMBLEM_SHAPES = ['shield', 'circle', 'hexagon', 'pentagon', 'diamond'] as const;
export type EmblemShape = (typeof EMBLEM_SHAPES)[number];

/** 바탕 도형 안을 채우는 2색 배색 패턴 6종. */
export const EMBLEM_PATTERNS = [
  'solid',
  'horizontalSplit',
  'verticalSplit',
  'diagonalSplit',
  'quarters',
  'stripes',
] as const;
export type EmblemPattern = (typeof EMBLEM_PATTERNS)[number];

/** 전경에 얹는 문양 5종(`none`은 무늬 없이 배색 패턴만). */
export const EMBLEM_CHARGES = ['none', 'star', 'ring', 'chevron', 'cross'] as const;
export type EmblemCharge = (typeof EMBLEM_CHARGES)[number];

/**
 * 생성된 클럽 엠블럼. `svg`는 렌더 가능한 완결된 `<svg>…</svg>` 마크업 문자열이고,
 * `colorPrimary`/`colorSecondary`는 `Team.colorPrimary`/`Team.colorSecondary`에
 * 그대로 대입할 hex 색상이다(파일 상단 JSDoc "색상까지 시드 하나로 결정하는 이유" 참고).
 */
export interface GeneratedEmblem {
  readonly shape: EmblemShape;
  readonly pattern: EmblemPattern;
  readonly charge: EmblemCharge;
  /** hex 색상(`#rrggbb`, 소문자). */
  readonly colorPrimary: string;
  /** hex 색상(`#rrggbb`, 소문자). */
  readonly colorSecondary: string;
  /** 64×64 viewBox 인라인 SVG 마크업. 외부 참조 없음(파일 상단 JSDoc 참고). */
  readonly svg: string;
}

/** viewBox 0 0 64 64, 중심 (32,32) 기준 도형 윤곽선 `path d` 좌표(정적 상수, 시드 무관). */
const SHAPE_PATHS: Record<EmblemShape, string> = {
  shield:
    'M32,4 C40,4 50,8 58,14 L58,32 C58,48 47,59 32,61 C17,59 6,48 6,32 L6,14 C14,8 24,4 32,4 Z',
  circle: 'M4,32 A28,28 0 1,1 60,32 A28,28 0 1,1 4,32 Z',
  hexagon: 'M32,4 L56.25,18 L56.25,46 L32,60 L7.75,46 L7.75,18 Z',
  pentagon: 'M32,4 L58.63,23.35 L48.46,54.65 L15.54,54.65 L5.37,23.35 Z',
  diamond: 'M32,4 L60,32 L32,60 L4,32 Z',
};

/** 5각별(문양 `star`) 외곽 좌표 — 정적 상수, 시드 무관. */
const STAR_POINTS =
  '32,19 35.23,27.55 44.36,27.98 37.23,33.7 39.64,42.52 32,37.5 24.36,42.52 26.77,33.7 19.64,27.98 28.77,27.55';

/**
 * 도형 윤곽선 마감선의 불투명도 — 색상은 `currentColor`(CSS 상속)를 쓰고 이 값만
 * 고정한다. **14일차 2차 교차 점검(4팀 지적) 반영**: 최초 구현은 `rgba(0,0,0,0.28)`
 * 검정 고정값이었으나, `docs/team-schedule/05-*.md` Task 012(26일차, 다크/라이트 대비
 * 4.5:1 검증)와 정면으로 충돌했다 — SVG 문자열 안에 색을 굳혀 버리면 다크 배경에서
 * 소비처(5팀 `TeamBadge`, 미착수)가 CSS로 대비를 조정할 방법이 없다. `stroke="currentColor"`
 * 로 바꾸면 소비처가 감싸는 요소의 CSS `color`(예: 라이트 `text-black/70`, 다크
 * `text-white/70`)만으로 테마별 대비를 조정할 수 있다 — `svg` 문자열 자체는 시드가
 * 같으면 여전히 바이트 단위로 동일하므로(FR-TM-001 ③) 이 변경이 결정론을 깨지 않는다.
 * `colorPrimary`/`colorSecondary`/문양 색은 팀 고유 색상 정체성이라 테마에 따라
 * 바뀌면 안 되므로(다크모드라고 팀 색이 반전되면 오히려 오정보) 이 윤곽선에만 적용한다.
 */
const OUTLINE_STROKE_OPACITY = 0.28;

/** 2차 색을 밝은 중성 톤(흰색 계열)으로 뽑을 때의 채도/명도 폭. */
const NEUTRAL_SECONDARY = { saturationBase: 5, saturationSpan: 15, lightnessBase: 88, lightnessSpan: 10 };
/** 2차 색을 1차 색과 다른 색상(hue)으로 뽑을 때의 채도/명도 폭. */
const HUED_SECONDARY = { saturationBase: 45, saturationSpan: 25, lightnessBase: 40, lightnessSpan: 15 };
/** 1차 색에서 2차 색으로 hue를 밀어낼 후보 각도(완전 보색 180° 근방만 쓰지 않고 폭을 둠). */
const HUE_OFFSETS = [130, 150, 160, 180, 190, 200, 210] as const;
/** 배색이 "밝은 중성 톤" 분기로 갈 확률(퍼센트, 0~99 굴림 기준). */
const NEUTRAL_SECONDARY_THRESHOLD = 35;

/**
 * `crestSeed` 하나로 도형·배색·문양·색상을 전부 결정해 SVG 엠블럼을 생성한다.
 *
 * @param crestSeed `Team.crestSeed`(범용 리프 `Seed`, world/season/match/event
 *   계층과 무관). 같은 값이면 항상 바이트 단위로 동일한 `svg`를 반환한다.
 * @throws {RangeError} `crestSeed`가 0 이상 `Number.MAX_SAFE_INTEGER` 이하 정수가
 *   아닌 경우 (`stateForSeed`가 던진다).
 */
export function generateTeamEmblem(crestSeed: Seed): GeneratedEmblem {
  let state = stateForSeed(crestSeed);

  const shapeStep = nextIntBelow(state, EMBLEM_SHAPES.length);
  state = shapeStep.state;
  const shape = EMBLEM_SHAPES[shapeStep.value];

  const patternStep = nextIntBelow(state, EMBLEM_PATTERNS.length);
  state = patternStep.state;
  const pattern = EMBLEM_PATTERNS[patternStep.value];

  const chargeStep = nextIntBelow(state, EMBLEM_CHARGES.length);
  state = chargeStep.state;
  const charge = EMBLEM_CHARGES[chargeStep.value];

  const hueStep = nextIntBelow(state, 360);
  state = hueStep.state;
  const hue1 = hueStep.value;

  const sat1Step = nextIntBelow(state, 30);
  state = sat1Step.state;
  const saturation1 = 55 + sat1Step.value;

  const light1Step = nextIntBelow(state, 20);
  state = light1Step.state;
  const lightness1 = 35 + light1Step.value;

  const branchStep = nextIntBelow(state, 100);
  state = branchStep.state;

  let hue2: number;
  let saturation2: number;
  let lightness2: number;

  if (branchStep.value < NEUTRAL_SECONDARY_THRESHOLD) {
    const satStep = nextIntBelow(state, NEUTRAL_SECONDARY.saturationSpan);
    state = satStep.state;
    const lightStep = nextIntBelow(state, NEUTRAL_SECONDARY.lightnessSpan);
    state = lightStep.state;

    hue2 = hue1;
    saturation2 = NEUTRAL_SECONDARY.saturationBase + satStep.value;
    lightness2 = NEUTRAL_SECONDARY.lightnessBase + lightStep.value;
  } else {
    const offsetStep = nextIntBelow(state, HUE_OFFSETS.length);
    state = offsetStep.state;
    const satStep = nextIntBelow(state, HUED_SECONDARY.saturationSpan);
    state = satStep.state;
    const lightStep = nextIntBelow(state, HUED_SECONDARY.lightnessSpan);
    state = lightStep.state;

    hue2 = (hue1 + HUE_OFFSETS[offsetStep.value]) % 360;
    saturation2 = HUED_SECONDARY.saturationBase + satStep.value;
    lightness2 = HUED_SECONDARY.lightnessBase + lightStep.value;
  }

  const colorPrimary = hslToHex(hue1, saturation1, lightness1);
  const colorSecondary = hslToHex(hue2, saturation2, lightness2);
  // 문양 색은 1차 색상(hue)의 아주 옅은 톤 — 배경이 어떤 패턴이든 은은하게 읽히도록
  // 별도 RNG 소비 없이 hue1에서 파생한다(계산이지 추첨이 아니므로 결정론은 그대로 유지).
  const chargeColor = hslToHex(hue1, 15, 94);

  const svg = renderSvg({
    shape,
    pattern,
    charge,
    colorPrimary,
    colorSecondary,
    chargeColor,
    clipId: `emblem-clip-${crestSeed}`,
  });

  return { shape, pattern, charge, colorPrimary, colorSecondary, svg };
}

interface RenderInput {
  readonly shape: EmblemShape;
  readonly pattern: EmblemPattern;
  readonly charge: EmblemCharge;
  readonly colorPrimary: string;
  readonly colorSecondary: string;
  readonly chargeColor: string;
  readonly clipId: string;
}

function renderSvg(input: RenderInput): string {
  const { shape, pattern, charge, colorPrimary, colorSecondary, chargeColor, clipId } = input;

  const clipShape = `<path d="${SHAPE_PATHS[shape]}" />`;
  const outlineShape =
    `<path d="${SHAPE_PATHS[shape]}" fill="none" stroke="currentColor" ` +
    `stroke-opacity="${OUTLINE_STROKE_OPACITY}" stroke-width="1.5" />`;

  return (
    // aria-label 없음·role 없음, aria-hidden="true"로 장식용임을 명시한다(D-18 준수,
    // 14일차 2차 교차 점검 4팀 지적 반영). 이 SVG 문자열은 영문 하드코딩 접근성 레이블을
    // 내부에 굳히지 않는다 — 이걸 넣으면 소비처가 문자열 파싱 없이는 로케일별 번역 키로
    // 바꿀 수 없고(D-18 하드코딩 금지), ko 로케일에서도 스크린리더가 영어를 읽게 된다.
    // 실제 접근 가능한 이름(예: "FC서울 엠블럼")은 소비처가 이 svg를 감싸는 wrapper
    // 요소에 `role="img"` + 번역 키 기반 `aria-label`로 부여한다(표준 아이콘 SVG 패턴 —
    // 내부는 장식용으로 숨기고, 의미 있는 이름은 바깥 요소가 갖는다).
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" ' +
    'aria-hidden="true" focusable="false">' +
    `<defs><clipPath id="${clipId}">${clipShape}</clipPath></defs>` +
    `<g clip-path="url(#${clipId})">` +
    patternMarkup(pattern, colorPrimary, colorSecondary) +
    chargeMarkup(charge, chargeColor) +
    '</g>' +
    outlineShape +
    '</svg>'
  );
}

function patternMarkup(pattern: EmblemPattern, c1: string, c2: string): string {
  switch (pattern) {
    case 'solid':
      return `<rect x="0" y="0" width="64" height="64" fill="${c1}" />`;
    case 'horizontalSplit':
      return (
        `<rect x="0" y="0" width="64" height="32" fill="${c1}" />` +
        `<rect x="0" y="32" width="64" height="32" fill="${c2}" />`
      );
    case 'verticalSplit':
      return (
        `<rect x="0" y="0" width="32" height="64" fill="${c1}" />` +
        `<rect x="32" y="0" width="32" height="64" fill="${c2}" />`
      );
    case 'diagonalSplit':
      return (
        `<rect x="0" y="0" width="64" height="64" fill="${c1}" />` +
        `<polygon points="0,0 64,0 0,64" fill="${c2}" />`
      );
    case 'quarters':
      return (
        `<rect x="0" y="0" width="32" height="32" fill="${c1}" />` +
        `<rect x="32" y="0" width="32" height="32" fill="${c2}" />` +
        `<rect x="0" y="32" width="32" height="32" fill="${c2}" />` +
        `<rect x="32" y="32" width="32" height="32" fill="${c1}" />`
      );
    case 'stripes':
      return [0, 16, 32, 48]
        .map((x, i) => `<rect x="${x}" y="0" width="16" height="64" fill="${i % 2 === 0 ? c1 : c2}" />`)
        .join('');
    default: {
      const exhaustive: never = pattern;
      throw new RangeError(`patternMarkup: 알 수 없는 패턴입니다 (${String(exhaustive)})`);
    }
  }
}

function chargeMarkup(charge: EmblemCharge, color: string): string {
  switch (charge) {
    case 'none':
      return '';
    case 'star':
      return `<polygon points="${STAR_POINTS}" fill="${color}" />`;
    case 'ring':
      return `<circle cx="32" cy="32" r="10" fill="none" stroke="${color}" stroke-width="3" />`;
    case 'chevron':
      return `<path d="M18,40 L32,24 L46,40 L40,40 L32,32 L24,40 Z" fill="${color}" />`;
    case 'cross':
      return (
        `<rect x="27" y="16" width="10" height="32" fill="${color}" />` +
        `<rect x="16" y="27" width="32" height="10" fill="${color}" />`
      );
    default: {
      const exhaustive: never = charge;
      throw new RangeError(`chargeMarkup: 알 수 없는 문양입니다 (${String(exhaustive)})`);
    }
  }
}

/**
 * HSL(0~360, 0~100, 0~100)을 `#rrggbb` hex 문자열로 변환한다. 외부 color 라이브러리를
 * 추가하지 않고(CLAUDE.md — 런타임 의존성은 `next`/`react`/`react-dom` 3개뿐, 새 의존성
 * 추가는 이 Task 범위 밖) 표준 HSL→RGB 변환 공식을 그대로 구현한 로컬 헬퍼다.
 */
function hslToHex(hue: number, saturationPct: number, lightnessPct: number): string {
  const s = saturationPct / 100;
  const l = lightnessPct / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = hue / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  const m = l - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hPrime >= 0 && hPrime < 1) {
    r1 = c;
    g1 = x;
  } else if (hPrime < 2) {
    r1 = x;
    g1 = c;
  } else if (hPrime < 3) {
    g1 = c;
    b1 = x;
  } else if (hPrime < 4) {
    g1 = x;
    b1 = c;
  } else if (hPrime < 5) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  const toByte = (channel: number): string =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toByte(r1)}${toByte(g1)}${toByte(b1)}`;
}
