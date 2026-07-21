-- 48일차(2026-09-24) — D-34(I-238) 평점 지표 + D-35(I-239) ClubOwner 신설, 6팀 DB·인프라팀
-- 버전 프리픽스는 apply_migration 실행 후 list_migrations로 확인한 원격 채번값(§6 13일차 규칙)

-- D-34 (I-238) — player_season_stat / player_career_stat 평점 지표 (테이블 현재 0행, 기본값 불필요)
ALTER TABLE player_season_stat
  ADD COLUMN avg_rating numeric NOT NULL CHECK (avg_rating >= 1.0 AND avg_rating <= 10.0);

ALTER TABLE player_career_stat
  ADD COLUMN avg_rating numeric NOT NULL CHECK (avg_rating >= 1.0 AND avg_rating <= 10.0);

-- D-35 (I-239) — E-48 ClubOwner 신설, 팀과 1:1(team_id nullable = 공석, manager 패턴 승계)
CREATE TABLE club_owner (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES world(id), -- [물리 전용]
  team_id uuid REFERENCES team(id),
  name text NOT NULL,
  age int NOT NULL,
  nationality text NOT NULL CHECK (nationality ~ '^[A-Z]{2}$'),
  wealth int NOT NULL CHECK (wealth BETWEEN 1 AND 30),
  negotiation int NOT NULL CHECK (negotiation BETWEEN 1 AND 30),
  reputation int NOT NULL CHECK (reputation >= 0 AND reputation <= 100),
  since_season int NOT NULL
);

CREATE INDEX idx_club_owner__team_id ON club_owner (team_id);
CREATE INDEX idx_club_owner__world_id ON club_owner (world_id);

ALTER TABLE club_owner ENABLE ROW LEVEL SECURITY;

CREATE POLICY club_owner_public_select ON club_owner
  FOR SELECT USING (true);
CREATE POLICY club_owner_service_role_insert ON club_owner
  FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY club_owner_service_role_update ON club_owner
  FOR UPDATE USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY club_owner_service_role_delete ON club_owner
  FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- D-35 결정② — 계약 주체만 구단주로, 수입 귀속(team_id)은 그대로 유지. 테이블 현재 0행이라
-- signed_by_owner_id를 TS 타입(ClubOwnerId, non-null)과 그대로 맞춰 NOT NULL로 추가한다.
ALTER TABLE sponsor_contract
  ADD COLUMN signed_by_owner_id uuid NOT NULL REFERENCES club_owner(id);

CREATE INDEX idx_sponsor_contract__signed_by_owner_id ON sponsor_contract (signed_by_owner_id);
