"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Task 013C(36일차, 4팀) — 사이드 내비 항목.
 *
 * ## 왜 클라이언트 컴포넌트인가
 * 종전 `SideNav`(루트 레이아웃 로컬 함수)는 활성 상태 표시가 아예 없어, 11개 라우트를
 * 오가도 지금 어디에 있는지 화면이 말해 주지 않았다. 레이아웃은 자기 아래 세그먼트의
 * 경로를 알 수 없으므로(`params`는 위→아래로만 흐른다 — `[lang]/layout.tsx` 헤더 참조)
 * 현재 경로 판정은 `usePathname()`이 있는 클라이언트 경계에서만 가능하다. 링크 하나짜리
 * 리프라 번들 비용이 작고, 레이아웃 나머지는 서버 컴포넌트로 남는다.
 *
 * ## 활성 판정
 * 정확 일치(`/ko/leagues`)와 하위 경로(`/ko/leagues/kr-1`) 모두 활성으로 본다 — 상세로
 * 들어가도 상위 항목이 켜져 있어야 위치 감각이 유지된다. 홈(`/ko`)만 예외적으로 정확
 * 일치만 인정한다(그러지 않으면 모든 경로에서 홈이 켜진다).
 *
 * ## 활성 표시 — 색 단독으로 알리지 않는다
 * NFR-A11Y-002에 따라 활성 상태는 ① 좌측 터치라인(3px 초크 바, `touchline-on`)
 * ② 배경 대비 변화 ③ `aria-current="page"` 세 가지로 동시에 전달한다.
 */
export function NavLink({
  href,
  children,
  exact = false,
  orientation = "vertical",
}: {
  readonly href: string;
  readonly children: React.ReactNode;
  readonly exact?: boolean;
  /**
   * `"vertical"`(기본)은 사이드바용 — 터치라인이 항목 **왼쪽**에 선다.
   * `"horizontal"`은 모바일 가로 레일용 — 같은 초크 바를 **밑줄**로 눕힌다. 두 자리가
   * 같은 활성 기호를 공유해야 화면 폭이 바뀌어도 "지금 여기"를 읽는 법이 달라지지 않는다.
   */
  readonly orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const isHorizontal = orientation === "horizontal";

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "touchline text-sm transition-colors",
        "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
        isHorizontal
          ? "block shrink-0 px-3 py-3 whitespace-nowrap"
          : "block rounded-md py-1.5 pr-2 pl-3.5",
        isActive
          ? cn(
              "font-medium text-sidebar-accent-foreground",
              isHorizontal ? "touchline-under-on" : "touchline-on rounded-md bg-sidebar-accent",
            )
          : "text-sidebar-foreground/65 hover:text-sidebar-foreground",
        !isActive && !isHorizontal && "hover:bg-sidebar-accent/60",
      )}
    >
      {children}
    </Link>
  );
}
