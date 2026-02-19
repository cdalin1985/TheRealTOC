export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ChallengeStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'expired'
  | 'venue_proposed'
  | 'countered'
  | 'locked';

export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'disputed' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          profile_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      ranks: {
        Row: {
          id: string;
          player_id: string;
          rank_position: number;
          points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          rank_position: number;
          points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          rank_position?: number;
          points?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ranks_player_id_fkey";
            columns: ["player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ];
      };
      venues: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      challenges: {
        Row: {
          id: string;
          challenger_player_id: string;
          challenged_player_id: string;
          discipline_id: string;
          race_to: number;
          status: ChallengeStatus;
          venue_id: string | null;
          scheduled_at: string | null;
          proposed_by_player_id: string | null;
          locked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenger_player_id: string;
          challenged_player_id: string;
          discipline_id: string;
          race_to: number;
          status?: ChallengeStatus;
          venue_id?: string | null;
          scheduled_at?: string | null;
          proposed_by_player_id?: string | null;
          locked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenger_player_id?: string;
          challenged_player_id?: string;
          discipline_id?: string;
          race_to?: number;
          status?: ChallengeStatus;
          venue_id?: string | null;
          scheduled_at?: string | null;
          proposed_by_player_id?: string | null;
          locked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "challenges_challenger_player_id_fkey";
            columns: ["challenger_player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenges_challenged_player_id_fkey";
            columns: ["challenged_player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenges_venue_id_fkey";
            columns: ["venue_id"];
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenges_proposed_by_player_id_fkey";
            columns: ["proposed_by_player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ];
      };
      matches: {
        Row: {
          id: string;
          challenge_id: string;
          challenger_player_id: string;
          challenged_player_id: string;
          discipline_id: string;
          race_to: number;
          venue_id: string;
          scheduled_at: string;
          status: MatchStatus;
          challenger_games: number | null;
          challenged_games: number | null;
          challenger_submitted_at: string | null;
          challenged_submitted_at: string | null;
          finalized_at: string | null;
          livestream_url: string | null;
          disputed_reason: string | null;
          winner_player_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          challenger_player_id: string;
          challenged_player_id: string;
          discipline_id: string;
          race_to: number;
          venue_id: string;
          scheduled_at: string;
          status?: MatchStatus;
          challenger_games?: number | null;
          challenged_games?: number | null;
          challenger_submitted_at?: string | null;
          challenged_submitted_at?: string | null;
          finalized_at?: string | null;
          livestream_url?: string | null;
          disputed_reason?: string | null;
          winner_player_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          challenger_player_id?: string;
          challenged_player_id?: string;
          discipline_id?: string;
          race_to?: number;
          venue_id?: string;
          scheduled_at?: string;
          status?: MatchStatus;
          challenger_games?: number | null;
          challenged_games?: number | null;
          challenger_submitted_at?: string | null;
          challenged_submitted_at?: string | null;
          finalized_at?: string | null;
          livestream_url?: string | null;
          disputed_reason?: string | null;
          winner_player_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_challenge_id_fkey";
            columns: ["challenge_id"];
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_challenger_player_id_fkey";
            columns: ["challenger_player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_challenged_player_id_fkey";
            columns: ["challenged_player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_venue_id_fkey";
            columns: ["venue_id"];
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_winner_player_id_fkey";
            columns: ["winner_player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      ensure_profile_and_player: {
        Args: Record<string, never>;
        Returns: Json;
      };
      create_challenge: {
        Args: {
          p_challenged_player_id: string;
          p_discipline_id: string;
          p_race_to: number;
        };
        Returns: Json;
      };
      cancel_challenge: {
        Args: {
          p_challenge_id: string;
        };
        Returns: Json;
      };
      decline_challenge: {
        Args: {
          p_challenge_id: string;
        };
        Returns: Json;
      };
      propose_challenge_details: {
        Args: {
          p_challenge_id: string;
          p_venue_id: string;
          p_scheduled_at: string;
        };
        Returns: Json;
      };
      confirm_challenge: {
        Args: {
          p_challenge_id: string;
        };
        Returns: Json;
      };
      submit_match_result: {
        Args: {
          p_match_id: string;
          p_my_games: number;
          p_opponent_games: number;
          p_livestream_url?: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      challenge_status: ChallengeStatus;
      match_status: MatchStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Player = Database['public']['Tables']['players']['Row'];
export type Rank = Database['public']['Tables']['ranks']['Row'];
export type Venue = Database['public']['Tables']['venues']['Row'];
export type Challenge = Database['public']['Tables']['challenges']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
