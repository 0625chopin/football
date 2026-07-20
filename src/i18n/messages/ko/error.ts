// Task 011(16일차) 골격 — 공용 에러/빈상태/검증 카피. 각 라우트 loading/error/not-found
// 3종(13일차 남은 항목, Task 005)이 실제 구현될 때 이 카탈로그를 소비한다.
export const error = {
  notFound: {
    title: "페이지를 찾을 수 없습니다",
    description: "요청하신 페이지가 존재하지 않습니다.",
  },
  generic: {
    title: "문제가 발생했습니다",
    description: "잠시 후 다시 시도해 주세요.",
    retryLabel: "다시 시도",
  },
  network: {
    title: "네트워크 오류",
    description: "연결 상태를 확인해 주세요.",
  },
  validation: {
    required: "필수 입력 항목입니다.",
  },
};

export type ErrorMessages = typeof error;
