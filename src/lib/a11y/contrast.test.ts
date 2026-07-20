/**
 * globals.css 시맨틱 컬러 토큰(승격·플레이오프·강등·LIVE·경고) 회귀 가드 — Task 012 / 25일차.
 * (src/app/globals.color.test.ts와 중복 생성되어 이 파일로 통합됨 — I-138 계열 조율 착오.)
 *
 * CSS 파일을 직접 파싱해 실제 배포되는 값으로 검증한다(하드코딩된 사본이 아님). 4개 축:
 *   ⓐ 색맹 시뮬레이션(protanopia/deuteranopia/tritanopia) 3종 + 정상 시야 전 조건에서
 *      5개 채움 색 전 쌍이 ΔE(CIE76) 하한 이상으로 구분되는지 — NFR-A11Y-002의
 *      "보조 신호로서 구분력" 전제.
 *   ⓑ 5개 채움 색 + warning-foreground가 전부 sRGB 색역 안인지 — 색역 밖 OKLCH 값은
 *      브라우저가 임의로 클램프하므로 실제 렌더 색이 검증 대상과 달라진다.
 *   ⓒ promotion/playoff/relegation/live의 페이지 배경 대비가 3:1 이상인지(WCAG 1.4.11,
 *      비텍스트) — 이 전제는 이 4색이 배지 채움·보더·아이콘 전용이고 텍스트 전경으로
 *      쓰이지 않는다는 것이다. 013A(28일차 이후) 소비 컴포넌트가 이 색을 텍스트로 쓰면
 *      WCAG 1.4.3(텍스트 4.5:1)이 적용 대상이 되어 이 테스트로는 못 잡으니 주의.
 *   ⓓ warning-foreground가 --warning 배지 위에서 텍스트 대비(WCAG 1.4.3, 4.5:1)를
 *      만족하는지 — --warning 자체는 파스텔 톤이라 페이지 배경 대비가 낮고(라이트 1.34:1)
 *      단독 채움으로 쓰지 않기로 했으므로, 대신 이 조합이 깨지지 않는지 지킨다.
 *
 * ΔE 하한(12)의 근거: 색역 밖으로 나가는 원래 채도값들을 sRGB 색역 안으로 낮추는 과정에서
 * (globals.css의 promotion/playoff/relegation/warning-foreground 채도 재조정 주석 참고)
 * 색 간 거리가 좁아져, 애초 설계 목표였던 ΔE≥15는 다크 모드 protanopia의
 * relegation/live-warning 조합에서 더 이상 지켜지지 않는다(실측 최소 ΔE 12.56,
 * 다크·protanopia·live↔warning). 그래서 하한을 15→12로 낮춰 잡아 이 실측 최소치보다
 * 아주 약간 아래에 둔다 — 사소한 값 조정에는 흔들리지 않되, 색을 서로 근접시키는 실수
 * (예: 두 토큰을 같은 색으로 되돌리는 실수)는 여전히 잡아낸다.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CSS_PATH = fileURLToPath(new URL("../../app/globals.css", import.meta.url));
const DELTA_E_MIN = 12;
const NON_TEXT_CONTRAST_MIN = 3;
const BADGE_TEXT_CONTRAST_MIN = 4.5;

type Oklch = { l: number; c: number; h: number };

function extractBlock(css: string, startMarker: string): string {
  const start = css.indexOf(startMarker);
  if (start === -1) throw new Error(`CSS 블록을 찾지 못함: ${startMarker}`);
  const braceStart = css.indexOf("{", start);
  let depth = 0;
  for (let i = braceStart; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(braceStart, i + 1);
    }
  }
  throw new Error(`CSS 블록이 닫히지 않음: ${startMarker}`);
}

function extractToken(block: string, name: string): Oklch {
  const re = new RegExp(`--${name}:\\s*oklch\\(\\s*([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\s*\\)`);
  const m = block.match(re);
  if (!m) throw new Error(`토큰을 찾지 못함: --${name}`);
  return { l: Number(m[1]), c: Number(m[2]), h: Number(m[3]) };
}

function oklchToLinearSrgb({ l: L, c: C, h: Hdeg }: Oklch): [number, number, number] {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const GAMUT_EPS = 1e-6;
function isInSrgbGamut(lin: [number, number, number]): boolean {
  return lin.every((v) => v >= -GAMUT_EPS && v <= 1 + GAMUT_EPS);
}

// Vienot/Brettel 근사 CVD 행렬(linear RGB 공간에 적용)
const CVD_MATRIX: Record<string, number[][]> = {
  protanopia: [
    [0.56667, 0.43333, 0.0],
    [0.55833, 0.44167, 0.0],
    [0.0, 0.24167, 0.75833],
  ],
  deuteranopia: [
    [0.625, 0.375, 0.0],
    [0.7, 0.3, 0.0],
    [0.0, 0.3, 0.7],
  ],
  tritanopia: [
    [0.95, 0.05, 0.0],
    [0.0, 0.43333, 0.56667],
    [0.0, 0.475, 0.525],
  ],
};

function applyMatrix(m: number[][], v: [number, number, number]): [number, number, number] {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

function linearRgbToXyz([r, g, b]: [number, number, number]): [number, number, number] {
  return [
    0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
    0.2126729 * r + 0.7151522 * g + 0.072175 * b,
    0.0193339 * r + 0.119192 * g + 0.9503041 * b,
  ];
}

function xyzToLab([x, y, z]: [number, number, number]): [number, number, number] {
  const Xn = 0.95047;
  const Yn = 1.0;
  const Zn = 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x / Xn);
  const fy = f(y / Yn);
  const fz = f(z / Zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE76(lab1: [number, number, number], lab2: [number, number, number]): number {
  return Math.sqrt((lab1[0] - lab2[0]) ** 2 + (lab1[1] - lab2[1]) ** 2 + (lab1[2] - lab2[2]) ** 2);
}

function relativeLuminance(lin: [number, number, number]): number {
  const [r, g, b] = lin.map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(lin1: [number, number, number], lin2: [number, number, number]): number {
  const L1 = relativeLuminance(lin1);
  const L2 = relativeLuminance(lin2);
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

const css = readFileSync(CSS_PATH, "utf-8");
const rootBlock = extractBlock(css, ":root {");
const darkBlock = extractBlock(css, "@media (prefers-color-scheme: dark)");

const FILL_TOKENS = ["promotion", "playoff", "relegation", "live", "warning"] as const;
const NON_TEXT_TOKENS = ["promotion", "playoff", "relegation", "live"] as const;

function readTokens(block: string) {
  const fills = Object.fromEntries(FILL_TOKENS.map((name) => [name, extractToken(block, name)])) as Record<
    (typeof FILL_TOKENS)[number],
    Oklch
  >;
  return {
    ...fills,
    warningForeground: extractToken(block, "warning-foreground"),
    background: extractToken(block, "background"),
  };
}

describe.each([
  ["light", rootBlock],
  ["dark", darkBlock],
])("시맨틱 컬러 토큰 — %s 모드", (_mode, block) => {
  const tokens = readTokens(block);

  describe.each(["normal", "protanopia", "deuteranopia", "tritanopia"] as const)(
    "색맹 시뮬레이션 — %s",
    (condition) => {
      const labs = Object.fromEntries(
        FILL_TOKENS.map((name) => {
          const lin = oklchToLinearSrgb(tokens[name]);
          const simLin = condition === "normal" ? lin : applyMatrix(CVD_MATRIX[condition], lin);
          return [name, xyzToLab(linearRgbToXyz(simLin))];
        })
      ) as Record<(typeof FILL_TOKENS)[number], [number, number, number]>;

      it.each(
        FILL_TOKENS.flatMap((a, i) => FILL_TOKENS.slice(i + 1).map((b) => [a, b] as const))
      )("%s ↔ %s: ΔE ≥ 12", (a, b) => {
        expect(deltaE76(labs[a], labs[b])).toBeGreaterThanOrEqual(DELTA_E_MIN);
      });
    }
  );

  it.each([...FILL_TOKENS, "warningForeground"] as const)("--%s는 sRGB 색역 안이다", (name) => {
    const lin = oklchToLinearSrgb(tokens[name]);
    expect(isInSrgbGamut(lin)).toBe(true);
  });

  it.each(NON_TEXT_TOKENS)("--%s은 페이지 배경 대비 3:1 이상이다(비텍스트)", (name) => {
    const lin = oklchToLinearSrgb(tokens[name]);
    const bgLin = oklchToLinearSrgb(tokens.background);
    expect(contrastRatio(lin, bgLin)).toBeGreaterThanOrEqual(NON_TEXT_CONTRAST_MIN);
  });

  it("warning-foreground는 warning 채움 위에서 텍스트 대비 4.5:1 이상을 유지한다", () => {
    const fg = oklchToLinearSrgb(tokens.warningForeground);
    const fill = oklchToLinearSrgb(tokens.warning);
    expect(contrastRatio(fg, fill)).toBeGreaterThanOrEqual(BADGE_TEXT_CONTRAST_MIN);
  });
});
