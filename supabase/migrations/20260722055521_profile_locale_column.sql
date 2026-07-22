-- 52일차 (2026-09-30) — Task 037: User 도메인 사용자 선호 로케일 필드(D-18)
-- profile(E-38 User 대응, 51일차 생성)에 locale 컬럼 추가.
-- 값 집합은 src/i18n/locales.ts의 SUPPORTED_LOCALES(ko/en)와 정합 — 로케일 소스 추가 시
-- 이 CHECK도 함께 갱신해야 한다.
ALTER TABLE public.profile
  ADD COLUMN locale text NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko', 'en'));
