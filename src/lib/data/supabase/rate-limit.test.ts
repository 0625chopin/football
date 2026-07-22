import { describe, expect, it } from "vitest";
import {
  BETTING_RATE_LIMIT,
  PUBLIC_RATE_LIMIT,
  createSlidingWindowRateLimiter,
} from "./rate-limit";

describe("NFR-SEC-009 프리셋 값", () => {
  it("배팅 제출 = 사용자당 분당 30건", () => {
    expect(BETTING_RATE_LIMIT).toEqual({ limit: 30, windowMs: 60_000 });
  });

  it("공개 API = IP당 분당 300건", () => {
    expect(PUBLIC_RATE_LIMIT).toEqual({ limit: 300, windowMs: 60_000 });
  });
});

describe("createSlidingWindowRateLimiter", () => {
  it("limit 이내 호출은 전부 허용하고 remaining이 단조 감소한다", () => {
    const limiter = createSlidingWindowRateLimiter({ limit: 3, windowMs: 60_000 });
    const r1 = limiter.check("user-1", 0);
    const r2 = limiter.check("user-1", 10);
    const r3 = limiter.check("user-1", 20);
    expect([r1.allowed, r2.allowed, r3.allowed]).toEqual([true, true, true]);
    expect([r1.remaining, r2.remaining, r3.remaining]).toEqual([2, 1, 0]);
  });

  it("limit을 넘는 호출은 거부하고 retryAfterMs > 0을 반환한다", () => {
    const limiter = createSlidingWindowRateLimiter({ limit: 2, windowMs: 60_000 });
    limiter.check("user-1", 0);
    limiter.check("user-1", 100);
    const blocked = limiter.check("user-1", 200);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    // 첫 호출(t=0)이 윈도우(60_000ms)에서 빠져나가는 시점까지 남은 시간.
    expect(blocked.retryAfterMs).toBe(60_000 - 200);
  });

  it("거부된 시도는 기록에 남지 않는다 — 윈도우가 비워지면 바로 다시 허용", () => {
    const limiter = createSlidingWindowRateLimiter({ limit: 1, windowMs: 1_000 });
    limiter.check("user-1", 0);
    const blocked = limiter.check("user-1", 500);
    expect(blocked.allowed).toBe(false);
    // 윈도우 경계(t=1000) 이후엔 t=0 기록이 만료되어 다시 허용된다.
    const afterWindow = limiter.check("user-1", 1_001);
    expect(afterWindow.allowed).toBe(true);
  });

  it("고정 윈도우 경계 버스트 결함이 없다 — 슬라이딩 윈도우가 실제로 슬라이딩한다", () => {
    // 고정 윈도우였다면 t=59_999에 limit건, t=60_000에 새 윈도우로 limit건 더 허용돼
    // 1ms 사이에 2*limit건이 통과한다. 슬라이딩 윈도우는 그렇지 않다.
    const limiter = createSlidingWindowRateLimiter({ limit: 2, windowMs: 60_000 });
    limiter.check("user-1", 0);
    limiter.check("user-1", 30_000);
    // t=60_001 시점 윈도우(0~60_001)엔 t=30_000 호출 1건만 남아 있어(t=0은 만료) 허용돼야 한다.
    const atBoundary = limiter.check("user-1", 60_001);
    expect(atBoundary.allowed).toBe(true);
    // 곧바로 다음 호출은 다시 2건(30_000, 60_001) 꽉 찬 윈도우라 거부.
    const rightAfter = limiter.check("user-1", 60_002);
    expect(rightAfter.allowed).toBe(false);
  });

  it("키가 다르면 독립적으로 카운트한다", () => {
    const limiter = createSlidingWindowRateLimiter({ limit: 1, windowMs: 60_000 });
    const a = limiter.check("user-a", 0);
    const b = limiter.check("user-b", 0);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  it("reset(key)은 해당 키만 지운다", () => {
    const limiter = createSlidingWindowRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.check("user-a", 0);
    limiter.check("user-b", 0);
    limiter.reset("user-a");
    expect(limiter.check("user-a", 1).allowed).toBe(true);
    expect(limiter.check("user-b", 1).allowed).toBe(false);
  });

  it("clear()는 전체를 지운다", () => {
    const limiter = createSlidingWindowRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.check("user-a", 0);
    limiter.check("user-b", 0);
    limiter.clear();
    expect(limiter.check("user-a", 1).allowed).toBe(true);
    expect(limiter.check("user-b", 1).allowed).toBe(true);
  });

  it("NFR-SEC-009 수락 기준 — 베팅 30/분: 30건 허용, 31번째 거부", () => {
    const limiter = createSlidingWindowRateLimiter(BETTING_RATE_LIMIT);
    const results = Array.from({ length: 31 }, (_, i) => limiter.check("bettor-1", i));
    expect(results.slice(0, 30).every((r) => r.allowed)).toBe(true);
    expect(results[30].allowed).toBe(false);
  });

  it("NFR-SEC-009 수락 기준 — 공개 300/분: 300건 허용, 301번째 거부", () => {
    const limiter = createSlidingWindowRateLimiter(PUBLIC_RATE_LIMIT);
    const results = Array.from({ length: 301 }, (_, i) => limiter.check("203.0.113.1", i));
    expect(results.slice(0, 300).every((r) => r.allowed)).toBe(true);
    expect(results[300].allowed).toBe(false);
  });
});
