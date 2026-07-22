/**
 * `auth.ts`(관리자 인가 단일 소스) 자기검증 — **54일차 재수정 신설**. 팀장 지시로 `proxy.ts`/
 * `session/route.ts`에 중복돼 있던 판정 로직을 이 파일로 뽑은 뒤, 판정 자체의 회귀 방지와
 * `assertAdminSession`(Server Action 재검증용, 5팀 `actions.ts`가 그대로 import)의 throw
 * 계약을 검증한다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_SESSION_COOKIE, assertAdminSession, isAuthorizedAdminToken } from "./auth";

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function setEnv(): void {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-anon-key";
}

function restoreEnv(): void {
  if (ORIGINAL_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  if (ORIGINAL_KEY === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ORIGINAL_KEY;
}

beforeEach(() => {
  setEnv();
});

afterEach(() => {
  restoreEnv();
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.doUnmock("next/headers");
});

describe("isAuthorizedAdminToken", () => {
  it("토큰이 없으면 false", async () => {
    expect(await isAuthorizedAdminToken(undefined)).toBe(false);
  });

  it("env가 없으면 토큰이 있어도 false", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(await isAuthorizedAdminToken("tok")).toBe(false);
  });

  it("role이 ADMIN이면 true", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ role: "ADMIN" }] }));
    expect(await isAuthorizedAdminToken("tok")).toBe(true);
  });

  it("role이 USER면 false", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ role: "USER" }] }));
    expect(await isAuthorizedAdminToken("tok")).toBe(false);
  });

  it("PostgREST 응답이 !ok면 false", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => [] }));
    expect(await isAuthorizedAdminToken("tok")).toBe(false);
  });

  it("네트워크 에러가 나도 false(fail-closed)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await isAuthorizedAdminToken("tok")).toBe(false);
  });
});

describe("assertAdminSession — Server Action 재검증 계약", () => {
  it("쿠키에 ADMIN 토큰이 있으면 정상 반환(throw하지 않는다)", async () => {
    vi.doMock("next/headers", () => ({
      cookies: async () => ({
        get: (name: string) => (name === ADMIN_SESSION_COOKIE ? { name, value: "tok" } : undefined),
      }),
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ role: "ADMIN" }] }));

    const { assertAdminSession: freshAssert } = await import("./auth");
    await expect(freshAssert()).resolves.toBeUndefined();
  });

  it("쿠키가 없으면 throw한다", async () => {
    vi.doMock("next/headers", () => ({
      cookies: async () => ({ get: () => undefined }),
    }));

    const { assertAdminSession: freshAssert } = await import("./auth");
    await expect(freshAssert()).rejects.toThrow(/unauthorized/i);
  });

  it("쿠키는 있지만 role이 USER면 throw한다", async () => {
    vi.doMock("next/headers", () => ({
      cookies: async () => ({
        get: (name: string) => (name === ADMIN_SESSION_COOKIE ? { name, value: "tok" } : undefined),
      }),
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ role: "USER" }] }));

    const { assertAdminSession: freshAssert } = await import("./auth");
    await expect(freshAssert()).rejects.toThrow(/unauthorized/i);
  });
});

// 최상위 스코프에서 한 번 더 확인 — 이 파일이 애초에 정상 import되는지(순환 참조 없음).
describe("모듈 export 계약", () => {
  it("ADMIN_SESSION_COOKIE는 proxy.ts/session route.ts와 공유하는 고정 문자열이다", () => {
    expect(ADMIN_SESSION_COOKIE).toBe("admin_session_token");
  });

  it("assertAdminSession은 함수로 export된다", () => {
    expect(typeof assertAdminSession).toBe("function");
  });
});
