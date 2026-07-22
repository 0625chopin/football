import { afterEach, describe, expect, it } from "vitest";
import { enforcePublicRateLimit, publicApiRateLimiter } from "./rate-limiter";

function requestFrom(ip?: string): Request {
  const headers = ip ? { "x-forwarded-for": ip } : undefined;
  return new Request("http://localhost/api/live/matches", { headers });
}

afterEach(() => {
  publicApiRateLimiter.clear();
});

describe("enforcePublicRateLimit — NFR-SEC-009 공개 API IP당 분당 300건", () => {
  it("300건까지는 null(통과)을 반환하고, 301번째부터 429 + Retry-After", () => {
    const ip = "203.0.113.20";
    let last: Response | null = null;
    for (let i = 0; i < 301; i++) {
      last = enforcePublicRateLimit(requestFrom(ip));
      if (i < 300) expect(last).toBeNull();
    }
    expect(last).not.toBeNull();
    expect(last?.status).toBe(429);
    expect(last?.headers.get("Retry-After")).not.toBeNull();
  });

  it("IP가 다르면 카운트가 섞이지 않는다", () => {
    for (let i = 0; i < 300; i++) {
      expect(enforcePublicRateLimit(requestFrom("198.51.100.10"))).toBeNull();
    }
    expect(enforcePublicRateLimit(requestFrom("198.51.100.11"))).toBeNull();
  });

  it("일반 폴링 빈도(5초 간격, 이벤트 3초 간격)는 300/분에 한참 못 미쳐 전부 통과한다", () => {
    // matches/route.ts 5초 폴링 + events/route.ts 3초 폴링을 같은 IP가 1분간 동시에
    // 돌려도 12 + 20 = 32건 — 300/분 버킷을 전혀 위협하지 않는다(회귀 확인).
    const ip = "203.0.113.21";
    const results = Array.from({ length: 32 }, () => enforcePublicRateLimit(requestFrom(ip)));
    expect(results.every((r) => r === null)).toBe(true);
  });
});
