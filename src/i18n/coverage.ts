import { messages } from "./messages";

// Task 014(38일차, 4팀) — "번역 키 누락 수" 카운터의 산출 로직.
//
// `keys.ts`의 `TranslationKey`는 `messages.ko`에서 파생된 컴파일 타임 유니온이고, en 쪽
// 각 네임스페이스 파일은 ko의 `*Messages` 타입을 재사용해 구조를 강제한다(keys.ts 헤더
// 주석 참조) — 그래서 정상적인 커밋이라면 tsc가 이미 키 불일치를 막는다. 이 모듈은 그
// 보장을 "신뢰"하는 대신 두 카탈로그 객체를 실제로 순회해 다시 세는, 런타임 방어선이다
// (`as TranslationKey` 같은 타입 우회가 섞여도 여기서는 걸린다).

/**
 * 중첩 객체에서 리프(문자열 값)까지의 dot-path를 전부 모은다. `keys.ts`의 `DotPath`
 * 타입과 동일한 규약(문자열에 도달한 지점만 채택)을 런타임에 그대로 재현한다.
 */
function collectLeafPaths(node: unknown, prefix = ""): string[] {
  if (typeof node !== "object" || node === null) return [];

  const paths: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      paths.push(path);
    } else if (typeof value === "object" && value !== null) {
      paths.push(...collectLeafPaths(value, path));
    }
  }
  return paths;
}

export interface TranslationKeyDiff {
  /** `a`에는 있지만 `b`에는 없는 dot-path (정렬됨). */
  readonly missingInB: readonly string[];
  /** `b`에는 있지만 `a`에는 없는 dot-path (정렬됨). */
  readonly missingInA: readonly string[];
}

/** 두 메시지 카탈로그(또는 임의의 중첩 문자열 트리)를 비교해 서로 누락된 리프 키를 구한다. */
export function diffTranslationKeys(a: unknown, b: unknown): TranslationKeyDiff {
  const aPaths = new Set(collectLeafPaths(a));
  const bPaths = new Set(collectLeafPaths(b));

  return {
    missingInB: [...aPaths].filter((path) => !bPaths.has(path)).sort(),
    missingInA: [...bPaths].filter((path) => !aPaths.has(path)).sort(),
  };
}

export interface TranslationKeyCoverage {
  readonly totalKo: number;
  readonly totalEn: number;
  /** ko 카탈로그에는 있는데 en에 빠진 키. */
  readonly missingInEn: readonly string[];
  /** en 카탈로그에는 있는데 ko에 빠진 키. */
  readonly missingInKo: readonly string[];
  readonly missingCount: number;
}

/** `messages.ko` / `messages.en`을 실제로 순회해 번역 키 누락 수를 센다. */
export function computeTranslationKeyCoverage(): TranslationKeyCoverage {
  const diff = diffTranslationKeys(messages.ko, messages.en);
  const totalKo = collectLeafPaths(messages.ko).length;
  const totalEn = collectLeafPaths(messages.en).length;

  return {
    totalKo,
    totalEn,
    missingInEn: diff.missingInB,
    missingInKo: diff.missingInA,
    missingCount: diff.missingInB.length + diff.missingInA.length,
  };
}
