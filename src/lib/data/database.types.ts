/**
 * Supabase 생성 DB 타입 — **Task 032, 17일차(2026-08-12), 6팀 DB·인프라팀 소유**
 *
 * `mcp__supabase__generate_typescript_types`(project ref `damruradpliktkrlkakl`) 산출물을
 * 그대로 저장한 파일이다 — 손으로 편집하지 않는다. 스키마가 바뀌면(마이그레이션 추가)
 * 이 도구를 다시 실행해 덮어쓴다.
 *
 * **이 파일의 타입을 컴포넌트·화면 코드에서 직접 참조하지 않는다** — 물리 컬럼명이
 * snake_case이고 브랜드/enum이 없는 원시 `string`이라 도메인 타입(`@/types`,
 * 8일차 동결)과 구조가 다르다. 소비 경계는 `src/lib/data/supabase/mapper.ts`
 * (같은 팀 소유)이며, 그 외 계층은 `@/types` 도메인 타입만 본다(DC-01).
 *
 * 51일차(2026-09-29) 재생성 — Task 037(+032 소급) auth_profile_wallet_provisioning
 * 마이그레이션 반영: profile/wallet 신규 + 48일차분 avg_rating(player_season_stat/
 * player_career_stat)·sponsor_contract.signed_by_owner_id·club_owner 반영.
 *
 * 52일차(2026-09-30) 재생성 — Task 037 User/Wallet/WalletTransaction 테이블 활성화:
 * profile.locale 컬럼 추가(D-18) + wallet_transaction(E-40) 신규 반영.
 *
 * 53일차(2026-10-01) 재생성 — Task 037 지갑 낙관적 잠금: wallet.lock_version(DB 전용
 * CAS 토큰, 도메인 Wallet 타입 8일차 동결이라 미노출) + wallet_apply_transaction()
 * RPC 반영.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string
          id: string
          payload: Json
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at: string
          id?: string
          payload: Json
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          id?: string
          payload?: Json
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      award: {
        Row: {
          criteria: Json
          id: string
          league_id: string | null
          manager_id: string | null
          player_id: string | null
          scope: string
          season_id: string
          team_id: string | null
          type: string
        }
        Insert: {
          criteria: Json
          id?: string
          league_id?: string | null
          manager_id?: string | null
          player_id?: string | null
          scope: string
          season_id: string
          team_id?: string | null
          type: string
        }
        Update: {
          criteria?: Json
          id?: string
          league_id?: string | null
          manager_id?: string | null
          player_id?: string | null
          scope?: string
          season_id?: string
          team_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "award_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "manager"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      club_owner: {
        Row: {
          age: number
          id: string
          name: string
          nationality: string
          negotiation: number
          reputation: number
          since_season: number
          team_id: string | null
          wealth: number
          world_id: string
        }
        Insert: {
          age: number
          id?: string
          name: string
          nationality: string
          negotiation: number
          reputation: number
          since_season: number
          team_id?: string | null
          wealth: number
          world_id: string
        }
        Update: {
          age?: number
          id?: string
          name?: string
          nationality?: string
          negotiation?: number
          reputation?: number
          since_season?: number
          team_id?: string | null
          wealth?: number
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_owner_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_owner_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "world"
            referencedColumns: ["id"]
          },
        ]
      }
      common_code: {
        Row: {
          code: string
          created_at: string
          default_value: string
          description: string
          effective_from_season: number | null
          group_code: string
          id: string
          is_active: boolean
          json_schema: Json | null
          max_value: number | null
          min_value: number | null
          sort_order: number
          unit: string | null
          updated_at: string
          updated_by: string | null
          value: string
          value_json: Json | null
          value_num: number | null
          world_id: string | null
        }
        Insert: {
          code: string
          created_at: string
          default_value: string
          description: string
          effective_from_season?: number | null
          group_code: string
          id?: string
          is_active: boolean
          json_schema?: Json | null
          max_value?: number | null
          min_value?: number | null
          sort_order: number
          unit?: string | null
          updated_at: string
          updated_by?: string | null
          value: string
          value_json?: Json | null
          value_num?: number | null
          world_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          default_value?: string
          description?: string
          effective_from_season?: number | null
          group_code?: string
          id?: string
          is_active?: boolean
          json_schema?: Json | null
          max_value?: number | null
          min_value?: number | null
          sort_order?: number
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: string
          value_json?: Json | null
          value_num?: number | null
          world_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "common_code_group_code_fkey"
            columns: ["group_code"]
            isOneToOne: false
            referencedRelation: "common_code_group"
            referencedColumns: ["group_code"]
          },
          {
            foreignKeyName: "common_code_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "world"
            referencedColumns: ["id"]
          },
        ]
      }
      common_code_group: {
        Row: {
          apply_policy: string
          created_at: string
          description: string
          group_code: string
          group_name: string
          is_active: boolean
          related_fr: string[]
          sort_order: number
          updated_at: string
          value_type: string
        }
        Insert: {
          apply_policy: string
          created_at: string
          description: string
          group_code: string
          group_name: string
          is_active: boolean
          related_fr: string[]
          sort_order: number
          updated_at: string
          value_type: string
        }
        Update: {
          apply_policy?: string
          created_at?: string
          description?: string
          group_code?: string
          group_name?: string
          is_active?: boolean
          related_fr?: string[]
          sort_order?: number
          updated_at?: string
          value_type?: string
        }
        Relationships: []
      }
      common_code_history: {
        Row: {
          action: string
          changed_at: string
          changed_by: string
          code: string
          common_code_id: string
          group_code: string
          id: string
          new_effective_from_season: number | null
          new_value: string | null
          old_effective_from_season: number | null
          old_value: string | null
          reason: string
        }
        Insert: {
          action: string
          changed_at: string
          changed_by: string
          code: string
          common_code_id: string
          group_code: string
          id?: string
          new_effective_from_season?: number | null
          new_value?: string | null
          old_effective_from_season?: number | null
          old_value?: string | null
          reason: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string
          code?: string
          common_code_id?: string
          group_code?: string
          id?: string
          new_effective_from_season?: number | null
          new_value?: string | null
          old_effective_from_season?: number | null
          old_value?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "common_code_history_common_code_id_fkey"
            columns: ["common_code_id"]
            isOneToOne: false
            referencedRelation: "common_code"
            referencedColumns: ["id"]
          },
        ]
      }
      contract: {
        Row: {
          end_season: number
          id: string
          player_id: string
          start_season: number
          status: string
          team_id: string
          transfer_fee_paid: number
          wage_per_season: number
        }
        Insert: {
          end_season: number
          id?: string
          player_id: string
          start_season: number
          status: string
          team_id: string
          transfer_fee_paid: number
          wage_per_season: number
        }
        Update: {
          end_season?: number
          id?: string
          player_id?: string
          start_season?: number
          status?: string
          team_id?: string
          transfer_fee_paid?: number
          wage_per_season?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_gap: {
        Row: {
          detected_at: string
          gap_ended_at: string | null
          gap_minutes: number
          gap_started_at: string
          id: string
          missed_fixture_count: number
          recovered_at: string | null
        }
        Insert: {
          detected_at: string
          gap_ended_at?: string | null
          gap_minutes: number
          gap_started_at: string
          id?: string
          missed_fixture_count: number
          recovered_at?: string | null
        }
        Update: {
          detected_at?: string
          gap_ended_at?: string | null
          gap_minutes?: number
          gap_started_at?: string
          id?: string
          missed_fixture_count?: number
          recovered_at?: string | null
        }
        Relationships: []
      }
      cron_run: {
        Row: {
          duration_ms: number
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          fixtures_processed: number
          id: string
          is_catch_up: boolean
          lock_acquired: boolean
          retry_count: number
          snapshot_hash: string | null
          started_at: string
          status: string
        }
        Insert: {
          duration_ms: number
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          fixtures_processed: number
          id?: string
          is_catch_up: boolean
          lock_acquired: boolean
          retry_count: number
          snapshot_hash?: string | null
          started_at: string
          status: string
        }
        Update: {
          duration_ms?: number
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          fixtures_processed?: number
          id?: string
          is_catch_up?: boolean
          lock_acquired?: boolean
          retry_count?: number
          snapshot_hash?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      fixture: {
        Row: {
          attendance: number | null
          away_score: number | null
          away_team_id: string
          competition_type: string
          et_away_score: number | null
          et_home_score: number | null
          home_score: number | null
          home_team_id: string
          ht_away_score: number | null
          ht_home_score: number | null
          id: string
          is_neutral: boolean
          kickoff_at: string
          league_id: string | null
          match_seed: number
          pk_away: number | null
          pk_home: number | null
          round: number
          round_label: string
          season_id: string
          simulated_at: string | null
          snapshot_id: string
          status: string
        }
        Insert: {
          attendance?: number | null
          away_score?: number | null
          away_team_id: string
          competition_type: string
          et_away_score?: number | null
          et_home_score?: number | null
          home_score?: number | null
          home_team_id: string
          ht_away_score?: number | null
          ht_home_score?: number | null
          id?: string
          is_neutral: boolean
          kickoff_at: string
          league_id?: string | null
          match_seed: number
          pk_away?: number | null
          pk_home?: number | null
          round: number
          round_label: string
          season_id: string
          simulated_at?: string | null
          snapshot_id: string
          status: string
        }
        Update: {
          attendance?: number | null
          away_score?: number | null
          away_team_id?: string
          competition_type?: string
          et_away_score?: number | null
          et_home_score?: number | null
          home_score?: number | null
          home_team_id?: string
          ht_away_score?: number | null
          ht_home_score?: number | null
          id?: string
          is_neutral?: boolean
          kickoff_at?: string
          league_id?: string | null
          match_seed?: number
          pk_away?: number | null
          pk_home?: number | null
          round?: number
          round_label?: string
          season_id?: string
          simulated_at?: string | null
          snapshot_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixture_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixture_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixture_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixture_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixture_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "sim_constant_snapshot"
            referencedColumns: ["id"]
          },
        ]
      }
      injury: {
        Row: {
          id: string
          match_id: string | null
          occurred_round: number
          player_id: string
          return_round: number
          rounds_out: number
          season_id: string
          severity: string
          status: string
          type_label: string
        }
        Insert: {
          id?: string
          match_id?: string | null
          occurred_round: number
          player_id: string
          return_round: number
          rounds_out: number
          season_id: string
          severity: string
          status: string
          type_label: string
        }
        Update: {
          id?: string
          match_id?: string | null
          occurred_round?: number
          player_id?: string
          return_round?: number
          rounds_out?: number
          season_id?: string
          severity?: string
          status?: string
          type_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "injury_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "fixture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injury_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injury_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
        ]
      }
      league: {
        Row: {
          id: string
          name: string
          playoff_team_count: number
          promotion_slots: number
          relegation_slots: number
          round_interval_min: number
          team_count: number
          tier: number
          world_id: string
        }
        Insert: {
          id?: string
          name: string
          playoff_team_count: number
          promotion_slots: number
          relegation_slots: number
          round_interval_min: number
          team_count: number
          tier: number
          world_id: string
        }
        Update: {
          id?: string
          name?: string
          playoff_team_count?: number
          promotion_slots?: number
          relegation_slots?: number
          round_interval_min?: number
          team_count?: number
          tier?: number
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "world"
            referencedColumns: ["id"]
          },
        ]
      }
      loan: {
        Row: {
          id: string
          loan_team_id: string
          owner_team_id: string
          player_id: string
          season_id: string
          status: string
          wage_share_pct: number
        }
        Insert: {
          id?: string
          loan_team_id: string
          owner_team_id: string
          player_id: string
          season_id: string
          status: string
          wage_share_pct: number
        }
        Update: {
          id?: string
          loan_team_id?: string
          owner_team_id?: string
          player_id?: string
          season_id?: string
          status?: string
          wage_share_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "loan_loan_team_id_fkey"
            columns: ["loan_team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_owner_team_id_fkey"
            columns: ["owner_team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
        ]
      }
      manager: {
        Row: {
          age: number
          contract_until_season: number
          id: string
          is_acting: boolean
          name: string
          preferred_formation: string
          reputation: number
          style: string
          tactical_skill: number
          team_id: string | null
          tenure_seasons: number
          world_id: string
        }
        Insert: {
          age: number
          contract_until_season: number
          id?: string
          is_acting: boolean
          name: string
          preferred_formation: string
          reputation: number
          style: string
          tactical_skill: number
          team_id?: string | null
          tenure_seasons: number
          world_id: string
        }
        Update: {
          age?: number
          contract_until_season?: number
          id?: string
          is_acting?: boolean
          name?: string
          preferred_formation?: string
          reputation?: number
          style?: string
          tactical_skill?: number
          team_id?: string | null
          tenure_seasons?: number
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "world"
            referencedColumns: ["id"]
          },
        ]
      }
      match_event: {
        Row: {
          added_time: number
          detail: Json
          id: string
          match_id: string
          minute: number
          primary_player_id: string | null
          related_event_sequence: number | null
          secondary_player_id: string | null
          sequence: number
          team_id: string | null
          type: string
          xg: number | null
        }
        Insert: {
          added_time: number
          detail: Json
          id?: string
          match_id: string
          minute: number
          primary_player_id?: string | null
          related_event_sequence?: number | null
          secondary_player_id?: string | null
          sequence: number
          team_id?: string | null
          type: string
          xg?: number | null
        }
        Update: {
          added_time?: number
          detail?: Json
          id?: string
          match_id?: string
          minute?: number
          primary_player_id?: string | null
          related_event_sequence?: number | null
          secondary_player_id?: string | null
          sequence?: number
          team_id?: string | null
          type?: string
          xg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_event_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "fixture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_event_primary_player_id_fkey"
            columns: ["primary_player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_event_secondary_player_id_fkey"
            columns: ["secondary_player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_event_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      match_lineup: {
        Row: {
          formation: string
          is_starter: boolean
          match_id: string
          minute_off: number | null
          minute_on: number | null
          player_id: string
          position_multiplier: number
          position_slot: string
          team_id: string
        }
        Insert: {
          formation: string
          is_starter: boolean
          match_id: string
          minute_off?: number | null
          minute_on?: number | null
          player_id: string
          position_multiplier: number
          position_slot: string
          team_id: string
        }
        Update: {
          formation?: string
          is_starter?: boolean
          match_id?: string
          minute_off?: number | null
          minute_on?: number | null
          player_id?: string
          position_multiplier?: number
          position_slot?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_lineup_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "fixture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineup_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineup_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      news_feed_item: {
        Row: {
          body: string
          headline: string
          id: string
          occurred_at: string
          ref_id: string
          ref_type: string
          season_id: string
          type: string
        }
        Insert: {
          body: string
          headline: string
          id?: string
          occurred_at: string
          ref_id: string
          ref_type: string
          season_id: string
          type: string
        }
        Update: {
          body?: string
          headline?: string
          id?: string
          occurred_at?: string
          ref_id?: string
          ref_type?: string
          season_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_feed_item_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
        ]
      }
      player: {
        Row: {
          age: number
          birth_season: number
          id: string
          market_value: number
          name: string
          nationality: string
          pa: number
          preferred_foot: string
          preferred_position: string
          reputation: number
          retired_at_season: number | null
          taste_tags: string[]
          world_id: string
        }
        Insert: {
          age: number
          birth_season: number
          id?: string
          market_value: number
          name: string
          nationality: string
          pa: number
          preferred_foot: string
          preferred_position: string
          reputation: number
          retired_at_season?: number | null
          taste_tags: string[]
          world_id: string
        }
        Update: {
          age?: number
          birth_season?: number
          id?: string
          market_value?: number
          name?: string
          nationality?: string
          pa?: number
          preferred_foot?: string
          preferred_position?: string
          reputation?: number
          retired_at_season?: number | null
          taste_tags?: string[]
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "world"
            referencedColumns: ["id"]
          },
        ]
      }
      player_attribute: {
        Row: {
          acceleration: number
          aerial_reach: number
          aggression: number
          agility: number
          anticipation: number
          balance: number
          command_of_area: number
          composure: number
          crossing: number
          decisions: number
          determination: number
          dribbling: number
          finishing: number
          first_touch: number
          handling: number
          heading: number
          jumping: number
          kicking: number
          leadership: number
          long_shots: number
          marking: number
          natural_fitness: number
          one_on_ones: number
          ovr_cached: number
          pace: number
          passing: number
          player_id: string
          positioning: number
          reflexes: number
          set_pieces: number
          stamina: number
          strength: number
          tackling: number
          teamwork: number
          updated_at_season: number
          vision: number
          work_rate: number
        }
        Insert: {
          acceleration: number
          aerial_reach: number
          aggression: number
          agility: number
          anticipation: number
          balance: number
          command_of_area: number
          composure: number
          crossing: number
          decisions: number
          determination: number
          dribbling: number
          finishing: number
          first_touch: number
          handling: number
          heading: number
          jumping: number
          kicking: number
          leadership: number
          long_shots: number
          marking: number
          natural_fitness: number
          one_on_ones: number
          ovr_cached: number
          pace: number
          passing: number
          player_id: string
          positioning: number
          reflexes: number
          set_pieces: number
          stamina: number
          strength: number
          tackling: number
          teamwork: number
          updated_at_season: number
          vision: number
          work_rate: number
        }
        Update: {
          acceleration?: number
          aerial_reach?: number
          aggression?: number
          agility?: number
          anticipation?: number
          balance?: number
          command_of_area?: number
          composure?: number
          crossing?: number
          decisions?: number
          determination?: number
          dribbling?: number
          finishing?: number
          first_touch?: number
          handling?: number
          heading?: number
          jumping?: number
          kicking?: number
          leadership?: number
          long_shots?: number
          marking?: number
          natural_fitness?: number
          one_on_ones?: number
          ovr_cached?: number
          pace?: number
          passing?: number
          player_id?: string
          positioning?: number
          reflexes?: number
          set_pieces?: number
          stamina?: number
          strength?: number
          tackling?: number
          teamwork?: number
          updated_at_season?: number
          vision?: number
          work_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_attribute_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      player_attribute_history: {
        Row: {
          acceleration: number
          aerial_reach: number
          aggression: number
          agility: number
          anticipation: number
          balance: number
          command_of_area: number
          composure: number
          crossing: number
          decisions: number
          determination: number
          dribbling: number
          finishing: number
          first_touch: number
          handling: number
          heading: number
          jumping: number
          kicking: number
          leadership: number
          long_shots: number
          marking: number
          natural_fitness: number
          one_on_ones: number
          ovr: number
          pace: number
          passing: number
          player_id: string
          positioning: number
          reflexes: number
          season_number: number
          set_pieces: number
          stamina: number
          strength: number
          tackling: number
          teamwork: number
          vision: number
          work_rate: number
        }
        Insert: {
          acceleration: number
          aerial_reach: number
          aggression: number
          agility: number
          anticipation: number
          balance: number
          command_of_area: number
          composure: number
          crossing: number
          decisions: number
          determination: number
          dribbling: number
          finishing: number
          first_touch: number
          handling: number
          heading: number
          jumping: number
          kicking: number
          leadership: number
          long_shots: number
          marking: number
          natural_fitness: number
          one_on_ones: number
          ovr: number
          pace: number
          passing: number
          player_id: string
          positioning: number
          reflexes: number
          season_number: number
          set_pieces: number
          stamina: number
          strength: number
          tackling: number
          teamwork: number
          vision: number
          work_rate: number
        }
        Update: {
          acceleration?: number
          aerial_reach?: number
          aggression?: number
          agility?: number
          anticipation?: number
          balance?: number
          command_of_area?: number
          composure?: number
          crossing?: number
          decisions?: number
          determination?: number
          dribbling?: number
          finishing?: number
          first_touch?: number
          handling?: number
          heading?: number
          jumping?: number
          kicking?: number
          leadership?: number
          long_shots?: number
          marking?: number
          natural_fitness?: number
          one_on_ones?: number
          ovr?: number
          pace?: number
          passing?: number
          player_id?: string
          positioning?: number
          reflexes?: number
          season_number?: number
          set_pieces?: number
          stamina?: number
          strength?: number
          tackling?: number
          teamwork?: number
          vision?: number
          work_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_attribute_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      player_career_stat: {
        Row: {
          aerial_duels_attempted: number
          aerial_duels_won: number
          appearances: number
          assists: number
          avg_rating: number
          big_chances_created: number
          big_chances_missed: number
          blocks: number
          catches: number
          clean_sheets: number
          clearances: number
          crosses_attempted: number
          crosses_completed: number
          dispossessed: number
          dribbles_attempted: number
          dribbles_completed: number
          errors_leading_to_goal: number
          errors_leading_to_shot: number
          fouls_committed: number
          fouls_drawn: number
          free_kick_goals: number
          goals: number
          goals_conceded: number
          ground_duels_attempted: number
          ground_duels_won: number
          headed_goals: number
          interceptions: number
          key_passes: number
          long_balls_attempted: number
          long_balls_completed: number
          minutes_played: number
          offsides: number
          own_goals: number
          passes_attempted: number
          passes_completed: number
          penalties_faced: number
          penalties_saved: number
          penalties_scored: number
          penalties_taken: number
          player_id: string
          punches: number
          red_cards: number
          saves: number
          second_yellows: number
          shots: number
          shots_faced: number
          shots_on_target: number
          starts: number
          sub_appearances: number
          sweeper_actions: number
          tackles_attempted: number
          tackles_won: number
          through_balls: number
          total_awards: number
          total_injuries: number
          total_seasons: number
          touches: number
          xa: number
          xg: number
          xg_prevented: number
          yellow_cards: number
        }
        Insert: {
          aerial_duels_attempted: number
          aerial_duels_won: number
          appearances: number
          assists: number
          avg_rating: number
          big_chances_created: number
          big_chances_missed: number
          blocks: number
          catches: number
          clean_sheets: number
          clearances: number
          crosses_attempted: number
          crosses_completed: number
          dispossessed: number
          dribbles_attempted: number
          dribbles_completed: number
          errors_leading_to_goal: number
          errors_leading_to_shot: number
          fouls_committed: number
          fouls_drawn: number
          free_kick_goals: number
          goals: number
          goals_conceded: number
          ground_duels_attempted: number
          ground_duels_won: number
          headed_goals: number
          interceptions: number
          key_passes: number
          long_balls_attempted: number
          long_balls_completed: number
          minutes_played: number
          offsides: number
          own_goals: number
          passes_attempted: number
          passes_completed: number
          penalties_faced: number
          penalties_saved: number
          penalties_scored: number
          penalties_taken: number
          player_id: string
          punches: number
          red_cards: number
          saves: number
          second_yellows: number
          shots: number
          shots_faced: number
          shots_on_target: number
          starts: number
          sub_appearances: number
          sweeper_actions: number
          tackles_attempted: number
          tackles_won: number
          through_balls: number
          total_awards: number
          total_injuries: number
          total_seasons: number
          touches: number
          xa: number
          xg: number
          xg_prevented: number
          yellow_cards: number
        }
        Update: {
          aerial_duels_attempted?: number
          aerial_duels_won?: number
          appearances?: number
          assists?: number
          avg_rating?: number
          big_chances_created?: number
          big_chances_missed?: number
          blocks?: number
          catches?: number
          clean_sheets?: number
          clearances?: number
          crosses_attempted?: number
          crosses_completed?: number
          dispossessed?: number
          dribbles_attempted?: number
          dribbles_completed?: number
          errors_leading_to_goal?: number
          errors_leading_to_shot?: number
          fouls_committed?: number
          fouls_drawn?: number
          free_kick_goals?: number
          goals?: number
          goals_conceded?: number
          ground_duels_attempted?: number
          ground_duels_won?: number
          headed_goals?: number
          interceptions?: number
          key_passes?: number
          long_balls_attempted?: number
          long_balls_completed?: number
          minutes_played?: number
          offsides?: number
          own_goals?: number
          passes_attempted?: number
          passes_completed?: number
          penalties_faced?: number
          penalties_saved?: number
          penalties_scored?: number
          penalties_taken?: number
          player_id?: string
          punches?: number
          red_cards?: number
          saves?: number
          second_yellows?: number
          shots?: number
          shots_faced?: number
          shots_on_target?: number
          starts?: number
          sub_appearances?: number
          sweeper_actions?: number
          tackles_attempted?: number
          tackles_won?: number
          through_balls?: number
          total_awards?: number
          total_injuries?: number
          total_seasons?: number
          touches?: number
          xa?: number
          xg?: number
          xg_prevented?: number
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_career_stat_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      player_match_stat: {
        Row: {
          aerial_duels_attempted: number
          aerial_duels_won: number
          appearances: number
          assists: number
          big_chances_created: number
          big_chances_missed: number
          blocks: number
          catches: number
          clean_sheets: number
          clearances: number
          crosses_attempted: number
          crosses_completed: number
          dispossessed: number
          dribbles_attempted: number
          dribbles_completed: number
          errors_leading_to_goal: number
          errors_leading_to_shot: number
          fouls_committed: number
          fouls_drawn: number
          free_kick_goals: number
          goals: number
          goals_conceded: number
          ground_duels_attempted: number
          ground_duels_won: number
          headed_goals: number
          interceptions: number
          is_motm: boolean
          key_passes: number
          long_balls_attempted: number
          long_balls_completed: number
          match_id: string
          match_rating: number
          minutes_played: number
          offsides: number
          own_goals: number
          passes_attempted: number
          passes_completed: number
          penalties_faced: number
          penalties_saved: number
          penalties_scored: number
          penalties_taken: number
          player_id: string
          punches: number
          red_cards: number
          saves: number
          second_yellows: number
          shots: number
          shots_faced: number
          shots_on_target: number
          starts: number
          sub_appearances: number
          sweeper_actions: number
          tackles_attempted: number
          tackles_won: number
          team_id: string
          through_balls: number
          touches: number
          xa: number
          xg: number
          xg_prevented: number
          yellow_cards: number
        }
        Insert: {
          aerial_duels_attempted: number
          aerial_duels_won: number
          appearances: number
          assists: number
          big_chances_created: number
          big_chances_missed: number
          blocks: number
          catches: number
          clean_sheets: number
          clearances: number
          crosses_attempted: number
          crosses_completed: number
          dispossessed: number
          dribbles_attempted: number
          dribbles_completed: number
          errors_leading_to_goal: number
          errors_leading_to_shot: number
          fouls_committed: number
          fouls_drawn: number
          free_kick_goals: number
          goals: number
          goals_conceded: number
          ground_duels_attempted: number
          ground_duels_won: number
          headed_goals: number
          interceptions: number
          is_motm: boolean
          key_passes: number
          long_balls_attempted: number
          long_balls_completed: number
          match_id: string
          match_rating: number
          minutes_played: number
          offsides: number
          own_goals: number
          passes_attempted: number
          passes_completed: number
          penalties_faced: number
          penalties_saved: number
          penalties_scored: number
          penalties_taken: number
          player_id: string
          punches: number
          red_cards: number
          saves: number
          second_yellows: number
          shots: number
          shots_faced: number
          shots_on_target: number
          starts: number
          sub_appearances: number
          sweeper_actions: number
          tackles_attempted: number
          tackles_won: number
          team_id: string
          through_balls: number
          touches: number
          xa: number
          xg: number
          xg_prevented: number
          yellow_cards: number
        }
        Update: {
          aerial_duels_attempted?: number
          aerial_duels_won?: number
          appearances?: number
          assists?: number
          big_chances_created?: number
          big_chances_missed?: number
          blocks?: number
          catches?: number
          clean_sheets?: number
          clearances?: number
          crosses_attempted?: number
          crosses_completed?: number
          dispossessed?: number
          dribbles_attempted?: number
          dribbles_completed?: number
          errors_leading_to_goal?: number
          errors_leading_to_shot?: number
          fouls_committed?: number
          fouls_drawn?: number
          free_kick_goals?: number
          goals?: number
          goals_conceded?: number
          ground_duels_attempted?: number
          ground_duels_won?: number
          headed_goals?: number
          interceptions?: number
          is_motm?: boolean
          key_passes?: number
          long_balls_attempted?: number
          long_balls_completed?: number
          match_id?: string
          match_rating?: number
          minutes_played?: number
          offsides?: number
          own_goals?: number
          passes_attempted?: number
          passes_completed?: number
          penalties_faced?: number
          penalties_saved?: number
          penalties_scored?: number
          penalties_taken?: number
          player_id?: string
          punches?: number
          red_cards?: number
          saves?: number
          second_yellows?: number
          shots?: number
          shots_faced?: number
          shots_on_target?: number
          starts?: number
          sub_appearances?: number
          sweeper_actions?: number
          tackles_attempted?: number
          tackles_won?: number
          team_id?: string
          through_balls?: number
          touches?: number
          xa?: number
          xg?: number
          xg_prevented?: number
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_match_stat_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "fixture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_stat_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_stat_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      player_position: {
        Row: {
          player_id: string
          position: string
          proficiency: number
        }
        Insert: {
          player_id: string
          position: string
          proficiency: number
        }
        Update: {
          player_id?: string
          position?: string
          proficiency?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_position_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      player_season_stat: {
        Row: {
          aerial_duels_attempted: number
          aerial_duels_won: number
          appearances: number
          assists: number
          avg_condition: number
          avg_rating: number
          big_chances_created: number
          big_chances_missed: number
          blocks: number
          catches: number
          clean_sheets: number
          clearances: number
          competition_type: string
          contribution_score: number
          crosses_attempted: number
          crosses_completed: number
          dispossessed: number
          dribbles_attempted: number
          dribbles_completed: number
          errors_leading_to_goal: number
          errors_leading_to_shot: number
          fouls_committed: number
          fouls_drawn: number
          free_kick_goals: number
          goals: number
          goals_conceded: number
          ground_duels_attempted: number
          ground_duels_won: number
          headed_goals: number
          injuries_count: number
          interceptions: number
          key_passes: number
          league_id: string
          long_balls_attempted: number
          long_balls_completed: number
          matches_suspended: number
          minutes_played: number
          motm_awards: number
          offsides: number
          own_goals: number
          passes_attempted: number
          passes_completed: number
          penalties_faced: number
          penalties_saved: number
          penalties_scored: number
          penalties_taken: number
          player_id: string
          punches: number
          red_cards: number
          rounds_injured: number
          saves: number
          season_id: string
          second_yellows: number
          shots: number
          shots_faced: number
          shots_on_target: number
          starts: number
          sub_appearances: number
          sweeper_actions: number
          tackles_attempted: number
          tackles_won: number
          team_id: string
          through_balls: number
          touches: number
          xa: number
          xg: number
          xg_prevented: number
          yellow_cards: number
        }
        Insert: {
          aerial_duels_attempted: number
          aerial_duels_won: number
          appearances: number
          assists: number
          avg_condition: number
          avg_rating: number
          big_chances_created: number
          big_chances_missed: number
          blocks: number
          catches: number
          clean_sheets: number
          clearances: number
          competition_type: string
          contribution_score: number
          crosses_attempted: number
          crosses_completed: number
          dispossessed: number
          dribbles_attempted: number
          dribbles_completed: number
          errors_leading_to_goal: number
          errors_leading_to_shot: number
          fouls_committed: number
          fouls_drawn: number
          free_kick_goals: number
          goals: number
          goals_conceded: number
          ground_duels_attempted: number
          ground_duels_won: number
          headed_goals: number
          injuries_count: number
          interceptions: number
          key_passes: number
          league_id: string
          long_balls_attempted: number
          long_balls_completed: number
          matches_suspended: number
          minutes_played: number
          motm_awards: number
          offsides: number
          own_goals: number
          passes_attempted: number
          passes_completed: number
          penalties_faced: number
          penalties_saved: number
          penalties_scored: number
          penalties_taken: number
          player_id: string
          punches: number
          red_cards: number
          rounds_injured: number
          saves: number
          season_id: string
          second_yellows: number
          shots: number
          shots_faced: number
          shots_on_target: number
          starts: number
          sub_appearances: number
          sweeper_actions: number
          tackles_attempted: number
          tackles_won: number
          team_id: string
          through_balls: number
          touches: number
          xa: number
          xg: number
          xg_prevented: number
          yellow_cards: number
        }
        Update: {
          aerial_duels_attempted?: number
          aerial_duels_won?: number
          appearances?: number
          assists?: number
          avg_condition?: number
          avg_rating?: number
          big_chances_created?: number
          big_chances_missed?: number
          blocks?: number
          catches?: number
          clean_sheets?: number
          clearances?: number
          competition_type?: string
          contribution_score?: number
          crosses_attempted?: number
          crosses_completed?: number
          dispossessed?: number
          dribbles_attempted?: number
          dribbles_completed?: number
          errors_leading_to_goal?: number
          errors_leading_to_shot?: number
          fouls_committed?: number
          fouls_drawn?: number
          free_kick_goals?: number
          goals?: number
          goals_conceded?: number
          ground_duels_attempted?: number
          ground_duels_won?: number
          headed_goals?: number
          injuries_count?: number
          interceptions?: number
          key_passes?: number
          league_id?: string
          long_balls_attempted?: number
          long_balls_completed?: number
          matches_suspended?: number
          minutes_played?: number
          motm_awards?: number
          offsides?: number
          own_goals?: number
          passes_attempted?: number
          passes_completed?: number
          penalties_faced?: number
          penalties_saved?: number
          penalties_scored?: number
          penalties_taken?: number
          player_id?: string
          punches?: number
          red_cards?: number
          rounds_injured?: number
          saves?: number
          season_id?: string
          second_yellows?: number
          shots?: number
          shots_faced?: number
          shots_on_target?: number
          starts?: number
          sub_appearances?: number
          sweeper_actions?: number
          tackles_attempted?: number
          tackles_won?: number
          team_id?: string
          through_balls?: number
          touches?: number
          xa?: number
          xg?: number
          xg_prevented?: number
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_season_stat_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_season_stat_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_season_stat_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_season_stat_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      player_state: {
        Row: {
          active_injury_id: string | null
          condition: number
          familiarity_seasons: number
          fitness: number
          on_loan_team_id: string | null
          player_id: string
          squad_number: number
          suspension_remaining_cup: number
          suspension_remaining_league: number
          team_id: string | null
          yellow_accumulated_cup: number
          yellow_accumulated_league: number
        }
        Insert: {
          active_injury_id?: string | null
          condition: number
          familiarity_seasons: number
          fitness: number
          on_loan_team_id?: string | null
          player_id: string
          squad_number: number
          suspension_remaining_cup: number
          suspension_remaining_league: number
          team_id?: string | null
          yellow_accumulated_cup: number
          yellow_accumulated_league: number
        }
        Update: {
          active_injury_id?: string | null
          condition?: number
          familiarity_seasons?: number
          fitness?: number
          on_loan_team_id?: string | null
          player_id?: string
          squad_number?: number
          suspension_remaining_cup?: number
          suspension_remaining_league?: number
          team_id?: string | null
          yellow_accumulated_cup?: number
          yellow_accumulated_league?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_state_active_injury_id_fkey"
            columns: ["active_injury_id"]
            isOneToOne: false
            referencedRelation: "injury"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_state_on_loan_team_id_fkey"
            columns: ["on_loan_team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_state_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_state_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transaction: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          owner_id: string
          owner_type: string
          reason_code: string
          ref_id: string
          ref_type: string
          season_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at: string
          id?: string
          owner_id: string
          owner_type: string
          reason_code: string
          ref_id: string
          ref_type: string
          season_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          owner_id?: string
          owner_type?: string
          reason_code?: string
          ref_id?: string
          ref_type?: string
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transaction_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          created_at: string
          display_name: string
          id: string
          locale: string
          role: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          locale?: string
          role?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          locale?: string
          role?: string
        }
        Relationships: []
      }
      sanction: {
        Row: {
          effects: Json
          grant_amount: number
          id: string
          sanction_type: string
          season_id: string
          team_id: string
        }
        Insert: {
          effects: Json
          grant_amount: number
          id?: string
          sanction_type: string
          season_id: string
          team_id: string
        }
        Update: {
          effects?: Json
          grant_amount?: number
          id?: string
          sanction_type?: string
          season_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanction_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanction_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      season: {
        Row: {
          ended_at: string | null
          id: string
          phase: string
          regular_ends_at: string | null
          regular_started_at: string | null
          season_number: number
          season_seed: number
          snapshot_id: string | null
          started_at: string | null
          world_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          phase: string
          regular_ends_at?: string | null
          regular_started_at?: string | null
          season_number: number
          season_seed: number
          snapshot_id?: string | null
          started_at?: string | null
          world_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          phase?: string
          regular_ends_at?: string | null
          regular_started_at?: string | null
          season_number?: number
          season_seed?: number
          snapshot_id?: string | null
          started_at?: string | null
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "sim_constant_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "world"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_constant_snapshot: {
        Row: {
          constants: Json
          created_at: string
          first_used_season: number
          id: string
          ref_count: number
          snapshot_hash: string
          world_id: string
        }
        Insert: {
          constants: Json
          created_at: string
          first_used_season: number
          id?: string
          ref_count: number
          snapshot_hash: string
          world_id: string
        }
        Update: {
          constants?: Json
          created_at?: string
          first_used_season?: number
          id?: string
          ref_count?: number
          snapshot_hash?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_constant_snapshot_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "world"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor: {
        Row: {
          balance: number
          bankrupt_at_season: number | null
          id: string
          industry: string
          name: string
          reputation: number
          scale: number
          world_id: string
        }
        Insert: {
          balance: number
          bankrupt_at_season?: number | null
          id?: string
          industry: string
          name: string
          reputation: number
          scale: number
          world_id: string
        }
        Update: {
          balance?: number
          bankrupt_at_season?: number | null
          id?: string
          industry?: string
          name?: string
          reputation?: number
          scale?: number
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "world"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_contract: {
        Row: {
          end_season: number
          id: string
          income_per_season: number
          share_pct: number
          signed_by_owner_id: string
          sponsor_id: string
          start_season: number
          status: string
          team_id: string
        }
        Insert: {
          end_season: number
          id?: string
          income_per_season: number
          share_pct: number
          signed_by_owner_id: string
          sponsor_id: string
          start_season: number
          status: string
          team_id: string
        }
        Update: {
          end_season?: number
          id?: string
          income_per_season?: number
          share_pct?: number
          signed_by_owner_id?: string
          sponsor_id?: string
          start_season?: number
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_contract_signed_by_owner_id_fkey"
            columns: ["signed_by_owner_id"]
            isOneToOne: false
            referencedRelation: "club_owner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_contract_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_contract_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      standing: {
        Row: {
          drawn: number
          fair_play_score: number
          form: string
          ga: number
          gd: number
          gf: number
          league_id: string
          lost: number
          played: number
          points: number
          rank: number
          round: number
          season_id: string
          team_id: string
          tiebreak_applied: number | null
          won: number
        }
        Insert: {
          drawn: number
          fair_play_score: number
          form: string
          ga: number
          gd: number
          gf: number
          league_id: string
          lost: number
          played: number
          points: number
          rank: number
          round: number
          season_id: string
          team_id: string
          tiebreak_applied?: number | null
          won: number
        }
        Update: {
          drawn?: number
          fair_play_score?: number
          form?: string
          ga?: number
          gd?: number
          gf?: number
          league_id?: string
          lost?: number
          played?: number
          points?: number
          rank?: number
          round?: number
          season_id?: string
          team_id?: string
          tiebreak_applied?: number | null
          won?: number
        }
        Relationships: [
          {
            foreignKeyName: "standing_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standing_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standing_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      team: {
        Row: {
          academy_level: number
          balance: number
          color_primary: string
          color_secondary: string
          crest_seed: number
          crisis_consecutive_seasons: number
          fan_base: number
          financial_crisis: boolean
          founded_season: number
          id: string
          name: string
          reputation: number
          short_name: string
          stadium_capacity: number
          stadium_name: string
          world_id: string
        }
        Insert: {
          academy_level: number
          balance: number
          color_primary: string
          color_secondary: string
          crest_seed: number
          crisis_consecutive_seasons: number
          fan_base: number
          financial_crisis: boolean
          founded_season: number
          id?: string
          name: string
          reputation: number
          short_name: string
          stadium_capacity: number
          stadium_name: string
          world_id: string
        }
        Update: {
          academy_level?: number
          balance?: number
          color_primary?: string
          color_secondary?: string
          crest_seed?: number
          crisis_consecutive_seasons?: number
          fan_base?: number
          financial_crisis?: boolean
          founded_season?: number
          id?: string
          name?: string
          reputation?: number
          short_name?: string
          stadium_capacity?: number
          stadium_name?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "world"
            referencedColumns: ["id"]
          },
        ]
      }
      team_season: {
        Row: {
          final_rank: number | null
          league_id: string
          promoted: boolean
          relegated: boolean
          season_id: string
          team_id: string
          tiebreak_applied: number | null
        }
        Insert: {
          final_rank?: number | null
          league_id: string
          promoted: boolean
          relegated: boolean
          season_id: string
          team_id: string
          tiebreak_applied?: number | null
        }
        Update: {
          final_rank?: number | null
          league_id?: string
          promoted?: boolean
          relegated?: boolean
          season_id?: string
          team_id?: string
          tiebreak_applied?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_season_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_season_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_season_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      team_season_stat: {
        Row: {
          academy_level: number
          avg_age: number
          avg_condition: number
          avg_ovr: number
          away_draws: number
          away_goals_against: number
          away_goals_for: number
          away_losses: number
          away_played: number
          away_wins: number
          balance: number
          biggest_loss_fixture_id: string | null
          biggest_loss_goals_against: number | null
          biggest_loss_goals_for: number | null
          biggest_loss_opponent_team_id: string | null
          biggest_win_fixture_id: string | null
          biggest_win_goals_against: number | null
          biggest_win_goals_for: number | null
          biggest_win_opponent_team_id: string | null
          clean_sheets: number
          competition_type: string
          conceding_by_period: Json
          current_form: string
          draws: number
          failed_to_score: number
          fair_play_score: number
          fan_base: number
          fouls: number
          goals_against: number
          goals_for: number
          home_draws: number
          home_goals_against: number
          home_goals_for: number
          home_losses: number
          home_played: number
          home_wins: number
          injuries_active: number
          league_id: string
          longest_unbeaten: number
          longest_win_streak: number
          losses: number
          minutes_distribution: Json
          open_play_goals: number
          penalty_goals: number
          played: number
          points: number
          possession_avg: number
          red_cards: number
          reputation: number
          scoring_by_period: Json
          season_expense: number
          season_id: string
          season_income: number
          seasons_in_tier1: number
          seasons_in_tier2: number
          seasons_in_tier3: number
          set_piece_goals: number
          shots: number
          shots_on_target: number
          sponsor_income: number
          sponsor_payout: number
          squad_market_value: number
          squad_size: number
          suspensions_active: number
          team_id: string
          transfer_income: number
          transfer_spend: number
          trophies_cup: number
          trophies_league: number
          trophies_playoff: number
          wage_bill: number
          wins: number
          xg_against: number
          xg_for: number
          yellow_cards: number
        }
        Insert: {
          academy_level: number
          avg_age: number
          avg_condition: number
          avg_ovr: number
          away_draws: number
          away_goals_against: number
          away_goals_for: number
          away_losses: number
          away_played: number
          away_wins: number
          balance: number
          biggest_loss_fixture_id?: string | null
          biggest_loss_goals_against?: number | null
          biggest_loss_goals_for?: number | null
          biggest_loss_opponent_team_id?: string | null
          biggest_win_fixture_id?: string | null
          biggest_win_goals_against?: number | null
          biggest_win_goals_for?: number | null
          biggest_win_opponent_team_id?: string | null
          clean_sheets: number
          competition_type: string
          conceding_by_period: Json
          current_form: string
          draws: number
          failed_to_score: number
          fair_play_score: number
          fan_base: number
          fouls: number
          goals_against: number
          goals_for: number
          home_draws: number
          home_goals_against: number
          home_goals_for: number
          home_losses: number
          home_played: number
          home_wins: number
          injuries_active: number
          league_id: string
          longest_unbeaten: number
          longest_win_streak: number
          losses: number
          minutes_distribution: Json
          open_play_goals: number
          penalty_goals: number
          played: number
          points: number
          possession_avg: number
          red_cards: number
          reputation: number
          scoring_by_period: Json
          season_expense: number
          season_id: string
          season_income: number
          seasons_in_tier1: number
          seasons_in_tier2: number
          seasons_in_tier3: number
          set_piece_goals: number
          shots: number
          shots_on_target: number
          sponsor_income: number
          sponsor_payout: number
          squad_market_value: number
          squad_size: number
          suspensions_active: number
          team_id: string
          transfer_income: number
          transfer_spend: number
          trophies_cup: number
          trophies_league: number
          trophies_playoff: number
          wage_bill: number
          wins: number
          xg_against: number
          xg_for: number
          yellow_cards: number
        }
        Update: {
          academy_level?: number
          avg_age?: number
          avg_condition?: number
          avg_ovr?: number
          away_draws?: number
          away_goals_against?: number
          away_goals_for?: number
          away_losses?: number
          away_played?: number
          away_wins?: number
          balance?: number
          biggest_loss_fixture_id?: string | null
          biggest_loss_goals_against?: number | null
          biggest_loss_goals_for?: number | null
          biggest_loss_opponent_team_id?: string | null
          biggest_win_fixture_id?: string | null
          biggest_win_goals_against?: number | null
          biggest_win_goals_for?: number | null
          biggest_win_opponent_team_id?: string | null
          clean_sheets?: number
          competition_type?: string
          conceding_by_period?: Json
          current_form?: string
          draws?: number
          failed_to_score?: number
          fair_play_score?: number
          fan_base?: number
          fouls?: number
          goals_against?: number
          goals_for?: number
          home_draws?: number
          home_goals_against?: number
          home_goals_for?: number
          home_losses?: number
          home_played?: number
          home_wins?: number
          injuries_active?: number
          league_id?: string
          longest_unbeaten?: number
          longest_win_streak?: number
          losses?: number
          minutes_distribution?: Json
          open_play_goals?: number
          penalty_goals?: number
          played?: number
          points?: number
          possession_avg?: number
          red_cards?: number
          reputation?: number
          scoring_by_period?: Json
          season_expense?: number
          season_id?: string
          season_income?: number
          seasons_in_tier1?: number
          seasons_in_tier2?: number
          seasons_in_tier3?: number
          set_piece_goals?: number
          shots?: number
          shots_on_target?: number
          sponsor_income?: number
          sponsor_payout?: number
          squad_market_value?: number
          squad_size?: number
          suspensions_active?: number
          team_id?: string
          transfer_income?: number
          transfer_spend?: number
          trophies_cup?: number
          trophies_league?: number
          trophies_playoff?: number
          wage_bill?: number
          wins?: number
          xg_against?: number
          xg_for?: number
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_season_stat_biggest_loss_fixture_id_fkey"
            columns: ["biggest_loss_fixture_id"]
            isOneToOne: false
            referencedRelation: "fixture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_season_stat_biggest_loss_opponent_team_id_fkey"
            columns: ["biggest_loss_opponent_team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_season_stat_biggest_win_fixture_id_fkey"
            columns: ["biggest_win_fixture_id"]
            isOneToOne: false
            referencedRelation: "fixture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_season_stat_biggest_win_opponent_team_id_fkey"
            columns: ["biggest_win_opponent_team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_season_stat_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_season_stat_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_season_stat_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer: {
        Row: {
          fee: number
          from_team_id: string | null
          id: string
          negotiation_log: Json
          player_id: string
          season_id: string
          to_team_id: string
          trade_counterpart_player_id: string | null
          type: string
        }
        Insert: {
          fee: number
          from_team_id?: string | null
          id?: string
          negotiation_log: Json
          player_id: string
          season_id: string
          to_team_id: string
          trade_counterpart_player_id?: string | null
          type: string
        }
        Update: {
          fee?: number
          from_team_id?: string | null
          id?: string
          negotiation_log?: Json
          player_id?: string
          season_id?: string
          to_team_id?: string
          trade_counterpart_player_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_trade_counterpart_player_id_fkey"
            columns: ["trade_counterpart_player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      trophy: {
        Row: {
          id: string
          league_id: string | null
          season_id: string
          team_id: string
          type: string
        }
        Insert: {
          id?: string
          league_id?: string | null
          season_id: string
          team_id: string
          type: string
        }
        Update: {
          id?: string
          league_id?: string | null
          season_id?: string
          team_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "trophy_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trophy_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trophy_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet: {
        Row: {
          balance: number
          currency: string
          lock_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          currency?: string
          lock_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          currency?: string
          lock_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transaction: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          reason: string
          ref_bet_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          reason: string
          ref_bet_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          reason?: string
          ref_bet_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transaction_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      weather: {
        Row: {
          effect_modifiers: Json
          match_id: string
          temperature: number
          type: string
          wind_speed: number
        }
        Insert: {
          effect_modifiers: Json
          match_id: string
          temperature: number
          type: string
          wind_speed: number
        }
        Update: {
          effect_modifiers?: Json
          match_id?: string
          temperature?: number
          type?: string
          wind_speed?: number
        }
        Relationships: [
          {
            foreignKeyName: "weather_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "fixture"
            referencedColumns: ["id"]
          },
        ]
      }
      world: {
        Row: {
          clock_revision: number
          created_at: string
          current_phase: string
          current_season_number: number
          id: string
          is_paused: boolean
          paused_at: string | null
          paused_total_minutes: number
          speed_changed_at: string
          speed_multiplier: number
          world_minutes_at_speed_change: number
          world_seed: number
        }
        Insert: {
          clock_revision: number
          created_at: string
          current_phase: string
          current_season_number: number
          id?: string
          is_paused: boolean
          paused_at?: string | null
          paused_total_minutes: number
          speed_changed_at: string
          speed_multiplier: number
          world_minutes_at_speed_change: number
          world_seed: number
        }
        Update: {
          clock_revision?: number
          created_at?: string
          current_phase?: string
          current_season_number?: number
          id?: string
          is_paused?: boolean
          paused_at?: string | null
          paused_total_minutes?: number
          speed_changed_at?: string
          speed_multiplier?: number
          world_minutes_at_speed_change?: number
          world_seed?: number
        }
        Relationships: []
      }
      youth_prospect: {
        Row: {
          academy_level_at_generation: number
          bonus_applied: boolean
          id: string
          player_id: string
          season_id: string
          team_id: string
        }
        Insert: {
          academy_level_at_generation: number
          bonus_applied: boolean
          id?: string
          player_id: string
          season_id: string
          team_id: string
        }
        Update: {
          academy_level_at_generation?: number
          bonus_applied?: boolean
          id?: string
          player_id?: string
          season_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youth_prospect_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youth_prospect_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youth_prospect_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      match_event_visible: {
        Row: {
          added_time: number | null
          detail: Json | null
          id: string | null
          match_id: string | null
          minute: number | null
          primary_player_id: string | null
          related_event_sequence: number | null
          secondary_player_id: string | null
          sequence: number | null
          team_id: string | null
          type: string | null
          xg: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_event_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "fixture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_event_primary_player_id_fkey"
            columns: ["primary_player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_event_secondary_player_id_fkey"
            columns: ["secondary_player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_event_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_world_minute: { Args: never; Returns: number }
      is_event_elapsed: {
        Args: { p_added_time: number; p_match_id: string; p_minute: number }
        Returns: boolean
      }
      tick_run: { Args: never; Returns: Json }
      wallet_apply_transaction: {
        Args: {
          p_amount: number
          p_reason: string
          p_ref_bet_id?: string
          p_user_id: string
        }
        Returns: {
          balance: number
          lock_version: number
          transaction_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
