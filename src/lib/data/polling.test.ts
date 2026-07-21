// @vitest-environment jsdom
//
// 44일차(I-222) — 클라이언트 폴링 주기 회귀 테스트.
//
// 이 파일이 검증하는 결함: `loader.ts`의 값 소스(`globalDefaultSource`/`fallbackSource`)는
// 모듈 스코프 싱글턴이고 이를 채우는 `bootstrapApp()`은 **서버 컴포넌트에서만** 실행되므로,
// 브라우저 번들에서는 두 소스가 영원히 비어 있다. 그래서 `usePolling*`이 브라우저에서 스스로
// `resolvePollIntervalMs()`를 부르면 100% 실패해 안전망 값(30000/15000ms)으로 고정되고,
// 공통코드 경유로 정상값(5초/3초)을 공급하려던 설계가 클라이언트에서 도달 불가능해진다.
// 해소책은 서버가 해석한 ms를 props → `PollingOptions.intervalMs`로 주입하는 것이며,
// 아래 테스트가 그 주입 경로와 폴백 경로를 각각 고정한다(`polling.ts` 파일 헤더 참조).
//
// 소스 미등록 상태(= 브라우저 런타임)를 그대로 재현하기 위해 이 파일은
// `installHardcodedFallback()`을 부르지 않는다 — 다른 테스트가 등록해 둔 전역 상태가
// 새어 들어오지 않도록 `beforeEach`에서 두 소스를 명시적으로 `null`로 되돌린다
// (`fallback.ts` 파일 헤더가 확립한 관례).
import { act, cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setFallbackSource, setGlobalDefaultSource } from '@/lib/config/loader';
import { hardcodedFallbackSource } from '@/lib/config/fallback';

import { resolvePollIntervalMs } from './poll-interval';
import { usePolling, usePollingList, type PollingOptions } from './polling';

beforeEach(() => {
  setGlobalDefaultSource(null);
  setFallbackSource(null);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  setGlobalDefaultSource(null);
  setFallbackSource(null);
  cleanup();
  vi.restoreAllMocks();
});

/** 폴링 tick 횟수만 세는 최소 소비자. 훅은 컴포넌트 안에서만 호출할 수 있다. */
function renderPoller(options: PollingOptions): { readonly calls: () => number } {
  let count = 0;
  function Poller() {
    usePollingList(async () => {
      count += 1;
      return [];
    }, options);
    return null;
  }
  render(createElement(Poller));
  return { calls: () => count };
}

describe('resolvePollIntervalMs', () => {
  it('값 소스가 하나도 등록되지 않은 런타임(=브라우저)에서는 안전망 값으로 폴백한다', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(resolvePollIntervalMs('default')).toBe(30000);
    expect(resolvePollIntervalMs('live')).toBe(15000);
    expect(warn).toHaveBeenCalled();
  });

  it('폴백 소스가 등록된 런타임(=서버)에서는 공통코드 값을 그대로 쓴다', () => {
    setFallbackSource(hardcodedFallbackSource);

    expect(resolvePollIntervalMs('default')).toBe(30000);
    expect(resolvePollIntervalMs('live')).toBe(15000);
  });

  it('전역 기본값 소스가 폴백보다 우선한다 — 정상값 공급 경로', () => {
    setFallbackSource(hardcodedFallbackSource);
    setGlobalDefaultSource({
      name: 'test-global',
      getGroupConstants: (group) =>
        group === 'UI_PARAM' ? { POLL_INTERVAL_MS: 5000, POLL_LIVE_MS: 3000 } : undefined,
    });

    expect(resolvePollIntervalMs('default')).toBe(5000);
    expect(resolvePollIntervalMs('live')).toBe(3000);
  });
});

describe('usePollingList — intervalMs 주입(I-222)', () => {
  it('서버가 내려준 intervalMs를 쓰고 loadConstants를 아예 조회하지 않는다', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const poller = renderPoller({ mode: 'default', intervalMs: 5000 });
    expect(poller.calls()).toBe(1); // 마운트 즉시 1회

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(poller.calls()).toBe(2);

    // 소스 미등록 상태인데도 WARN이 없다 = 조회 경로를 타지 않았다는 증거.
    expect(warn).not.toHaveBeenCalled();
  });

  it('intervalMs를 생략하면 소스 미등록 시 안전망 30초로 폴백한다(무정지, AS-13)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const poller = renderPoller({ mode: 'default' });
    expect(poller.calls()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(poller.calls()).toBe(1); // 5초로는 아직 tick하지 않는다

    act(() => {
      vi.advanceTimersByTime(25000);
    });
    expect(poller.calls()).toBe(2);
  });

  it('intervalMs가 유한한 양수가 아니면 무시하고 조회 경로로 되돌아간다', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const poller = renderPoller({ mode: 'default', intervalMs: 0 });

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(poller.calls()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(25000);
    });
    expect(poller.calls()).toBe(2);
  });

  it('enabled: false면 마운트 시에도 조회하지 않는다', () => {
    const poller = renderPoller({ mode: 'default', intervalMs: 5000, enabled: false });

    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(poller.calls()).toBe(0);
  });
});

/**
 * 탭 비활성 시 중단 계약(`docs/wireframe/00-공통규약.md` R-8) — 화면(4·5팀)이 이 동작을
 * 재구현하지 않아도 되는 근거이므로 훅 쪽에 회귀 테스트를 고정한다.
 */
describe('usePollingList — 탭 비활성 시 중단(R-8)', () => {
  /** jsdom의 `document.hidden`은 읽기 전용 getter라 스파이로 갈아끼운다. */
  function setHidden(hidden: boolean): void {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(hidden);
  }

  it('탭이 숨겨지면 타이머가 멈추고, 다시 보이면 즉시 1회 재조회 후 재개한다', () => {
    setHidden(false);
    const poller = renderPoller({ mode: 'default', intervalMs: 5000 });
    expect(poller.calls()).toBe(1);

    setHidden(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(60000);
    });
    expect(poller.calls()).toBe(1); // 숨긴 동안에는 tick 없음

    setHidden(false);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(poller.calls()).toBe(2); // 복귀 즉시 1회

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(poller.calls()).toBe(3); // 타이머 재개
  });

  it('숨겨진 채로 마운트되면 즉시 1회만 조회하고 타이머는 시작하지 않는다', () => {
    setHidden(true);
    const poller = renderPoller({ mode: 'default', intervalMs: 5000 });

    expect(poller.calls()).toBe(1);
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(poller.calls()).toBe(1);
  });
});

describe('usePolling — 단일 엔티티', () => {
  it('intervalMs 주입이 컬렉션 훅과 동일하게 동작한다', () => {
    let count = 0;
    function Poller() {
      usePolling(async () => {
        count += 1;
        return null;
      }, { mode: 'live', intervalMs: 3000 });
      return null;
    }
    render(createElement(Poller));

    expect(count).toBe(1);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(count).toBe(2);
  });
});
