#!/usr/bin/env bash
# 3단 머지 게이트: 타입체크 → lint → test. 앞 단계가 실패하면 뒤 단계는 실행하지 않는다.
# WSL 마운트(/mnt/...)에서 프로덕션 빌드(next build)가 EPERM으로 실패하므로(I-62) 여기에는 넣지 않는다.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "[gate 1/3] tsc --noEmit"
npx tsc --noEmit

echo "[gate 2/3] lint"
npm run lint

echo "[gate 3/3] test (coverage)"
# 팀장 결함 A 지적(15일차): `npm run test`(vitest run, --coverage 없음)로는 14~15일차에
# 설정한 lines/branches(+perFile) 임계가 전혀 평가되지 않는다 — 커버리지 0%인 PR도 그냥
# 통과했다. test:coverage로 바꿔 임계 미달을 실제로 게이트가 실패시키게 한다.
npm run test:coverage

echo "[gate] all checks passed"
