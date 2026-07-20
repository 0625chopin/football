#!/usr/bin/env bash
# 4단 머지 게이트: 타입 생성 → 타입체크 → lint → test. 앞 단계가 실패하면 뒤 단계는 실행하지 않는다.
# WSL 마운트(/mnt/...)에서 프로덕션 빌드(next build)가 EPERM으로 실패하므로(I-62) 여기에는 넣지 않는다.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "[gate 1/4] next typegen"
# PageProps/LayoutProps는 Next.js가 생성하는 전역 타입이라(.next/types + next-env.d.ts)
# 소스에 선언이 없다 — 로컬은 이전 `next dev`/`next build` 산출물이 .next/에 남아 있어
# tsc가 우연히 통과하지만, CI는 체크아웃 직후라 이 산출물이 없어 실패한다(24일차, 4일 연속
# CI 레드로 발견). .next/와 next-env.d.ts는 둘 다 .gitignore 대상이라 커밋으로는 해결되지
# 않는다 — 매 실행 시 이 명령으로 직접 생성해야 한다(next.md "next typegen" 절 처방).
npx next typegen

echo "[gate 2/4] tsc --noEmit"
npx tsc --noEmit

echo "[gate 3/4] lint"
npm run lint

echo "[gate 4/4] test (coverage)"
# 팀장 결함 A 지적(15일차): `npm run test`(vitest run, --coverage 없음)로는 14~15일차에
# 설정한 lines/branches(+perFile) 임계가 전혀 평가되지 않는다 — 커버리지 0%인 PR도 그냥
# 통과했다. test:coverage로 바꿔 임계 미달을 실제로 게이트가 실패시키게 한다.
npm run test:coverage

echo "[gate] all checks passed"
