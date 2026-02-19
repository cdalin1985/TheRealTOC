-- Treasury Enhancement Migration
-- Adds match fee configuration and offline support tables

-- ============================================
-- LEAGUE SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS league_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_fee_per_player integer NOT NULL DEFAULT 500, -- $5.00 in cents
  season_name text DEFAULT 'Current Season',
  season_start_date date DEFAULT CURRENT_DATE,
  season_end_date date,
  treasurer_venmo_username text,
  treasurer_cashapp_username text,
  treasurer_zelle_email text,
  treasurer_paypal_email text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Insert default settings if not exists
INSERT INTO league_settings (match_fee_per_player)
SELECT 500
WHERE NOT EXISTS (SELECT 1 FROM league_settings);

-- ============================================
-- FUNCTION: Get Current Match Fee
-- ============================================

CREATE OR REPLACE FUNCTION get_current_match_fee()
RETURNS integer AS $$
BEGIN
  RETURN COALESCE((SELECT match_fee_per_player FROM league_settings LIMIT 1), 500);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Update Match Fee (Admin Only)
-- ============================================

CREATE OR REPLACE FUNCTION update_match_fee(
  p_new_fee integer,
  p_admin_id uuid
)
RETURNS boolean AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can update match fees';
  END IF;
  
  UPDATE league_settings
  SET 
    match_fee_per_player = p_new_fee,
    updated_at = now(),
    updated_by = p_admin_id
  WHERE id = (SELECT id FROM league_settings LIMIT 1);
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE MATCH COMPLETED TRIGGER
-- Use configurable match fee instead of hardcoded value
-- ============================================

CREATE OR REPLACE FUNCTION log_match_completed()
RETURNS TRIGGER AS $$
DECLARE
  winner_name text;
  loser_name text;
  winner_id uuid;
  loser_id uuid;
  current_balance integer;
  match_fee integer;
BEGIN
  -- Get current match fee from settings
  SELECT get_current_match_fee() INTO match_fee;

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

-- ============================================
-- RLS POLICIES FOR LEAGUE SETTINGS
-- ============================================

ALTER TABLE league_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Settings visible to all authenticated users"
  ON league_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update settings
CREATE POLICY "Only admins can update settings"
  ON league_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- ============================================
-- VIEW: League Financial Summary
-- ============================================

CREATE OR REPLACE VIEW league_financial_summary AS
SELECT 
  (SELECT get_league_balance()) as current_balance,
  (SELECT get_total_income()) as total_income,
  (SELECT get_total_expenses()) as total_expenses,
  (SELECT get_total_income() - get_total_expenses()) as net,
  (SELECT COUNT(*) FROM matches WHERE status = 'completed') as total_matches_played,
  (SELECT COUNT(DISTINCT player_id) FROM transactions WHERE category = 'match_fee') as unique_players_paid;

-- ============================================
-- FUNCTION: Export Financial Data (Admin)
-- ============================================

CREATE OR REPLACE FUNCTION export_financial_data(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  transaction_id uuid,
  transaction_date timestamptz,
  player_name text,
  type text,
  category text,
  amount_dollars numeric,
  description text,
  balance_after_dollars numeric
) AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    t.id as transaction_id,
    t.created_at as transaction_date,
    COALESCE(p.display_name, 'N/A') as player_name,
    t.type::text,
    t.category::text,
    t.amount::numeric / 100 as amount_dollars,
    t.description,
    t.balance_after::numeric / 100 as balance_after_dollars
  FROM transactions t
  LEFT JOIN players pl ON t.player_id = pl.id
  LEFT JOIN profiles p ON pl.profile_id = p.id
  WHERE (p_start_date IS NULL OR t.created_at::date >= p_start_date)
    AND (p_end_date IS NULL OR t.created_at::date <= p_end_date)
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
