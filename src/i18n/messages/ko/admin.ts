// Task 011(16일차) 골격. admin 라우트는 2차 예약(비활성 placeholder) — Task 021(59~60일차)까지 실기능 없음.
export const admin = {
  console: {
    title: "운영 콘솔",
  },
  status: {
    inactive: "관리자 기능은 아직 준비되지 않았습니다.",
  },
  error: {
    accessDenied: "접근 권한이 없습니다.",
  },
};

export type AdminMessages = typeof admin;
