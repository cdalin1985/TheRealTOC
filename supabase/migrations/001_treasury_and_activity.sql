-- Treasury and Activity Feed Tables
-- Run this in Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TREASURY TABLES
-- ============================================

-- Transaction categories
CREATE TYPE transaction_category AS ENUM (
  'match_fee',
  'membership_dues', 
  'venue_rental',
  'trophy_purchase',
  'equipment',
  'payout',
  'other'
);

-- Transaction types
CREATE TYPE transaction_type AS ENUM ('income', 'expense');

-- Main transactions table
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  category transaction_category NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  related_match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  balance_after integer NOT NULL
);

-- Player financial summary (auto-updated via trigger)
CREATE TABLE player_financial_summary (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  total_match_fees_paid integer DEFAULT 0,
  total_winnings_received integer DEFAULT 0,
  total_membership_paid integer DEFAULT 0,
  net_contribution integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- ACTIVITY FEED TABLE
-- ============================================

CREATE TYPE activity_type AS ENUM (
  'challenge_sent',
  'challenge_accepted',
  'challenge_declined',
  'challenge_cancelled',
  'venue_proposed',
  'match_confirmed',
  'match_completed',
  'score_submitted',
  'ranking_changed',
  'player_joined',
  'payment_received'
);

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type activity_type NOT NULL,
  actor_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  target_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  challenge_id uuid REFERENCES challenges(id) ON DELETE SET NULL,
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_transactions_player_id ON transactions(player_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_actor ON activity_log(actor_player_id);

-- ============================================
-- AUTO-LOGGING TRIGGERS
-- ============================================

-- Trigger: Log when challenge is created
CREATE OR REPLACE FUNCTION log_challenge_created()
RETURNS TRIGGER AS $$
DECLARE
  challenger_name text;
  challenged_name text;
BEGIN
  SELECT p.display_name INTO challenger_name
  FROM profiles p
  JOIN players pl ON pl.profile_id = p.id
  WHERE pl.id = NEW.challenger_player_id;
  
  SELECT p.display_name INTO challenged_name
  FROM profiles p
  JOIN players pl ON pl.profile_id = p.id
  WHERE pl.id = NEW.challenged_player_id;
  
  INSERT INTO activity_log (type, actor_player_id, target_player_id, challenge_id, description)
  VALUES (
    'challenge_sent',
    NEW.challenger_player_id,
    NEW.challenged_player_id,
    NEW.id,
    challenger_name || ' challenged ' || challenged_name || ' to ' || NEW.discipline_id || ', race to ' || NEW.race_to
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER challenge_created_trigger
AFTER INSERT ON challenges
FOR EACH ROW
EXECUTE FUNCTION log_challenge_created();

-- Trigger: Log when match is completed and add match fees
CREATE OR REPLACE FUNCTION log_match_completed()
RETURNS TRIGGER AS $$
DECLARE
  winner_name text;
  loser_name text;
  winner_id uuid;
  loser_id uuid;
  current_balance integer;
  match_fee integer := 1000; -- $10.00 in cents
BEGIN
  -- Determine winner and loser
  winner_id := NEW.winner_player_id;
  IF winner_id = NEW.challenger_player_id THEN
    loser_id := NEW.challenged_player_id;
  ELSE
    loser_id := NEW.challenger_player_id;
  END IF;
  
  -- Get names
  SELECT p.display_name INTO winner_name
  FROM profiles p
  JOIN players pl ON pl.profile_id = p.id
  WHERE pl.id = winner_id;
  
  SELECT p.display_name INTO loser_name
  FROM profiles p
  JOIN players pl ON pl.profile_id = p.id
  WHERE pl.id = loser_id;
  
  -- Log activity
  INSERT INTO activity_log (type, actor_player_id, target_player_id, match_id, description)
  VALUES (
    'match_completed',
    winner_id,
    loser_id,
    NEW.id,
    winner_name || ' beat ' || loser_name || ' ' || NEW.challenger_games || '-' || NEW.challenged_games
  );
  
  -- Add match fees to treasury (both players)
  SELECT COALESCE(MAX(balance_after), 0) INTO current_balance FROM transactions;
  
  -- Challenger fee
  INSERT INTO transactions (player_id, type, category, amount, description, related_match_id, balance_after)
  VALUES (NEW.challenger_player_id, 'income', 'match_fee', match_fee, 
    'Match fee: ' || winner_name || ' vs ' || loser_name, NEW.id, current_balance + match_fee);
  
  -- Challenged fee
  INSERT INTO transactions (player_id, type, category, amount, description, related_match_id, balance_after)
  VALUES (NEW.challenged_player_id, 'income', 'match_fee', match_fee,
    'Match fee: ' || winner_name || ' vs ' || loser_name, NEW.id, current_balance + match_fee * 2);
  
  -- Update player financial summaries
  INSERT INTO player_financial_summary (player_id, total_match_fees_paid, net_contribution)
  VALUES (NEW.challenger_player_id, match_fee, match_fee)
  ON CONFLICT (player_id) DO UPDATE SET
    total_match_fees_paid = player_financial_summary.total_match_fees_paid + match_fee,
    net_contribution = player_financial_summary.net_contribution + match_fee,
    updated_at = now();
    
  INSERT INTO player_financial_summary (player_id, total_match_fees_paid, net_contribution)
  VALUES (NEW.challenged_player_id, match_fee, match_fee)
  ON CONFLICT (player_id) DO UPDATE SET
    total_match_fees_paid = player_financial_summary.total_match_fees_paid + match_fee,
    net_contribution = player_financial_summary.net_contribution + match_fee,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER match_completed_trigger
AFTER UPDATE OF status ON matches
FOR EACH ROW WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION log_match_completed();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_financial_summary ENABLE ROW LEVEL SECURITY;

-- Everyone can read transactions (transparency)
CREATE POLICY "Transactions visible to all authenticated users"
  ON transactions FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert transactions
CREATE POLICY "Only admins can add transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- Everyone can read activity log
CREATE POLICY "Activity log visible to all authenticated users"
  ON activity_log FOR SELECT
  TO authenticated
  USING (true);

-- Everyone can read player financial summaries
CREATE POLICY "Financial summaries visible to all authenticated users"
  ON player_financial_summary FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get current league balance
CREATE OR REPLACE FUNCTION get_league_balance()
RETURNS integer AS $$
BEGIN
  RETURN COALESCE((SELECT balance_after FROM transactions ORDER BY created_at DESC LIMIT 1), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get total income
CREATE OR REPLACE FUNCTION get_total_income()
RETURNS integer AS $$
BEGIN
  RETURN COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'income'), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get total expenses
CREATE OR REPLACE FUNCTION get_total_expenses()
RETURNS integer AS $$
BEGIN
  RETURN COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'expense'), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;
