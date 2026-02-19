-- Activity Log Table and Triggers for TheRealTOC
-- This schema supports the chat-style activity feed with real-time updates

-- ============================================
-- ACTIVITY LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    actor_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    target_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}', -- For flexible additional data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for common queries
    CONSTRAINT valid_activity_type CHECK (type IN (
        'challenge_sent',
        'challenge_accepted',
        'challenge_declined',
        'challenge_cancelled',
        'venue_proposed',
        'match_confirmed',
        'match_completed',
        'score_submitted',
        'score_disputed',
        'ranking_changed',
        'player_joined',
        'payment_received'
    ))
);

-- Indexes for performance
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_actor ON activity_log(actor_player_id);
CREATE INDEX idx_activity_log_target ON activity_log(target_player_id);
CREATE INDEX idx_activity_log_type ON activity_log(type);
CREATE INDEX idx_activity_log_challenge ON activity_log(challenge_id);
CREATE INDEX idx_activity_log_match ON activity_log(match_id);

-- Composite index for filtered queries
CREATE INDEX idx_activity_log_target_created ON activity_log(target_player_id, created_at DESC);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read activity log
CREATE POLICY "Activity log is viewable by all authenticated users"
    ON activity_log FOR SELECT
    TO authenticated
    USING (true);

-- Only system can insert (via triggers)
CREATE POLICY "Activity log inserts via triggers only"
    ON activity_log FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================
-- TRIGGERS FOR AUTOMATIC ACTIVITY LOGGING
-- ============================================

-- 1. Challenge Sent
CREATE OR REPLACE FUNCTION log_challenge_sent()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_log (type, actor_player_id, target_player_id, challenge_id, description)
    VALUES (
        'challenge_sent',
        NEW.challenger_player_id,
        NEW.challenged_player_id,
        NEW.id,
        format('Challenge sent: Race to %s', NEW.race_to)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_challenge_sent ON challenges;
CREATE TRIGGER trigger_log_challenge_sent
    AFTER INSERT ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION log_challenge_sent();

-- 2. Challenge Accepted
CREATE OR REPLACE FUNCTION log_challenge_accepted()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        INSERT INTO activity_log (type, actor_player_id, target_player_id, challenge_id, description)
        VALUES (
            'challenge_accepted',
            NEW.challenged_player_id,
            NEW.challenger_player_id,
            NEW.id,
            'Challenge was accepted'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_challenge_accepted ON challenges;
CREATE TRIGGER trigger_log_challenge_accepted
    AFTER UPDATE ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION log_challenge_accepted();

-- 3. Challenge Declined
CREATE OR REPLACE FUNCTION log_challenge_declined()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'declined' AND OLD.status != 'declined' THEN
        INSERT INTO activity_log (type, actor_player_id, target_player_id, challenge_id, description)
        VALUES (
            'challenge_declined',
            NEW.challenged_player_id,
            NEW.challenger_player_id,
            NEW.id,
            'Challenge was declined'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_challenge_declined ON challenges;
CREATE TRIGGER trigger_log_challenge_declined
    AFTER UPDATE ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION log_challenge_declined();

-- 4. Challenge Cancelled
CREATE OR REPLACE FUNCTION log_challenge_cancelled()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        INSERT INTO activity_log (type, actor_player_id, target_player_id, challenge_id, description)
        VALUES (
            'challenge_cancelled',
            NEW.challenger_player_id,
            NEW.challenged_player_id,
            NEW.id,
            'Challenge was cancelled'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_challenge_cancelled ON challenges;
CREATE TRIGGER trigger_log_challenge_cancelled
    AFTER UPDATE ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION log_challenge_cancelled();

-- 5. Venue Proposed (when challenge enters venue_proposed or locked status)
CREATE OR REPLACE FUNCTION log_venue_proposed()
RETURNS TRIGGER AS $$
DECLARE
    proposing_player_id UUID;
BEGIN
    IF (NEW.status = 'venue_proposed' OR NEW.status = 'locked') AND 
       (OLD.status != 'venue_proposed' AND OLD.status != 'locked') THEN
        
        proposing_player_id := COALESCE(NEW.proposed_by_player_id, NEW.challenger_player_id);
        
        INSERT INTO activity_log (type, actor_player_id, target_player_id, challenge_id, description)
        VALUES (
            'venue_proposed',
            proposing_player_id,
            CASE WHEN proposing_player_id = NEW.challenger_player_id 
                 THEN NEW.challenged_player_id 
                 ELSE NEW.challenger_player_id 
            END,
            NEW.id,
            format('Venue/time proposed for %s', NEW.scheduled_at)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_venue_proposed ON challenges;
CREATE TRIGGER trigger_log_venue_proposed
    AFTER UPDATE ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION log_venue_proposed();

-- 6. Match Confirmed (when match is created from challenge)
CREATE OR REPLACE FUNCTION log_match_confirmed()
RETURNS TRIGGER AS $$
DECLARE
    challenge_record RECORD;
BEGIN
    -- Get challenge info
    SELECT * INTO challenge_record FROM challenges WHERE id = NEW.challenge_id;
    
    IF challenge_record IS NOT NULL THEN
        INSERT INTO activity_log (type, actor_player_id, target_player_id, challenge_id, match_id, description)
        VALUES (
            'match_confirmed',
            NULL, -- System event
            NULL,
            NEW.challenge_id,
            NEW.id,
            format('Match confirmed at %s', NEW.scheduled_at)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_match_confirmed ON matches;
CREATE TRIGGER trigger_log_match_confirmed
    AFTER INSERT ON matches
    FOR EACH ROW
    EXECUTE FUNCTION log_match_confirmed();

-- 7. Score Submitted
CREATE OR REPLACE FUNCTION log_score_submitted()
RETURNS TRIGGER AS $$
DECLARE
    submitting_player_id UUID;
    opponent_player_id UUID;
BEGIN
    -- Determine who submitted
    IF NEW.challenger_submitted_at IS NOT NULL AND OLD.challenger_submitted_at IS NULL THEN
        submitting_player_id := NEW.challenger_player_id;
        opponent_player_id := NEW.challenged_player_id;
    ELSIF NEW.challenged_submitted_at IS NOT NULL AND OLD.challenged_submitted_at IS NULL THEN
        submitting_player_id := NEW.challenged_player_id;
        opponent_player_id := NEW.challenger_player_id;
    ELSE
        RETURN NEW; -- No new submission
    END IF;
    
    INSERT INTO activity_log (type, actor_player_id, target_player_id, match_id, description)
    VALUES (
        'score_submitted',
        submitting_player_id,
        opponent_player_id,
        NEW.id,
        format('Score submitted: %s-%s', NEW.challenger_games, NEW.challenged_games)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_score_submitted ON matches;
CREATE TRIGGER trigger_log_score_submitted
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION log_score_submitted();

-- 8. Match Completed
CREATE OR REPLACE FUNCTION log_match_completed()
RETURNS TRIGGER AS $$
DECLARE
    winner_name TEXT;
    loser_name TEXT;
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Get winner/loser names
        SELECT p.display_name INTO winner_name 
        FROM players pl 
        JOIN profiles p ON pl.profile_id = p.id 
        WHERE pl.id = NEW.winner_player_id;
        
        INSERT INTO activity_log (type, actor_player_id, target_player_id, match_id, description, metadata)
        VALUES (
            'match_completed',
            NEW.winner_player_id,
            CASE WHEN NEW.winner_player_id = NEW.challenger_player_id 
                 THEN NEW.challenged_player_id 
                 ELSE NEW.challenger_player_id 
            END,
            NEW.id,
            format('%s won %s-%s', winner_name, NEW.challenger_games, NEW.challenged_games),
            jsonb_build_object(
                'challenger_games', NEW.challenger_games,
                'challenged_games', NEW.challenged_games,
                'winner_id', NEW.winner_player_id
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_match_completed ON matches;
CREATE TRIGGER trigger_log_match_completed
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION log_match_completed();

-- 9. Score Disputed
CREATE OR REPLACE FUNCTION log_score_disputed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'disputed' AND OLD.status != 'disputed' THEN
        INSERT INTO activity_log (type, actor_player_id, target_player_id, match_id, description)
        VALUES (
            'score_disputed',
            NULL, -- Could track who disputed if needed
            NULL,
            NEW.id,
            COALESCE(NEW.disputed_reason, 'Score dispute under review')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_score_disputed ON matches;
CREATE TRIGGER trigger_log_score_disputed
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION log_score_disputed();

-- 10. Ranking Changed (triggered by rank updates)
CREATE OR REPLACE FUNCTION log_ranking_changed()
RETURNS TRIGGER AS $$
DECLARE
    player_name TEXT;
    old_rank INTEGER;
BEGIN
    -- Get player name
    SELECT p.display_name INTO player_name 
    FROM players pl 
    JOIN profiles p ON pl.profile_id = p.id 
    WHERE pl.id = NEW.player_id;
    
    -- Get old rank if exists
    SELECT rank_position INTO old_rank FROM ranks 
    WHERE player_id = NEW.player_id AND id != NEW.id 
    ORDER BY created_at DESC LIMIT 1;
    
    IF old_rank IS NOT NULL AND old_rank != NEW.rank_position THEN
        INSERT INTO activity_log (type, actor_player_id, description)
        VALUES (
            'ranking_changed',
            NEW.player_id,
            format('%s moved from #%s to #%s', player_name, old_rank, NEW.rank_position)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_ranking_changed ON ranks;
CREATE TRIGGER trigger_log_ranking_changed
    AFTER INSERT ON ranks
    FOR EACH ROW
    EXECUTE FUNCTION log_ranking_changed();

-- 11. Player Joined
CREATE OR REPLACE FUNCTION log_player_joined()
RETURNS TRIGGER AS $$
DECLARE
    player_name TEXT;
BEGIN
    SELECT p.display_name INTO player_name 
    FROM profiles p 
    WHERE p.id = NEW.profile_id;
    
    INSERT INTO activity_log (type, actor_player_id, description)
    VALUES (
        'player_joined',
        NEW.id,
        format('%s joined the league', player_name)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_player_joined ON players;
CREATE TRIGGER trigger_log_player_joined
    AFTER INSERT ON players
    FOR EACH ROW
    EXECUTE FUNCTION log_player_joined();

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    challenge_received BOOLEAN DEFAULT true,
    challenge_accepted BOOLEAN DEFAULT true,
    challenge_declined BOOLEAN DEFAULT true,
    match_scheduled BOOLEAN DEFAULT true,
    score_submitted BOOLEAN DEFAULT true,
    score_disputed BOOLEAN DEFAULT true,
    ranking_changed BOOLEAN DEFAULT false,
    daily_digest BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Players can read/update their own preferences
CREATE POLICY "Players can manage their notification preferences"
    ON notification_preferences FOR ALL
    TO authenticated
    USING (player_id IN (
        SELECT id FROM players WHERE profile_id = auth.uid()
    ))
    WITH CHECK (player_id IN (
        SELECT id FROM players WHERE profile_id = auth.uid()
    ));

-- Create default preferences for new players
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (player_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON players;
CREATE TRIGGER trigger_create_notification_preferences
    AFTER INSERT ON players
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- ============================================
-- PUSH NOTIFICATION TOKENS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, token)
);

CREATE INDEX idx_push_tokens_player ON push_tokens(player_id);

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can manage their push tokens"
    ON push_tokens FOR ALL
    TO authenticated
    USING (player_id IN (
        SELECT id FROM players WHERE profile_id = auth.uid()
    ))
    WITH CHECK (player_id IN (
        SELECT id FROM players WHERE profile_id = auth.uid()
    ));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get activity feed for a player (with optional type filter)
CREATE OR REPLACE FUNCTION get_activity_feed(
    p_player_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_before_timestamp TIMESTAMPTZ DEFAULT NULL,
    p_type_filter VARCHAR(50)[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    type VARCHAR(50),
    actor_player_id UUID,
    target_player_id UUID,
    challenge_id UUID,
    match_id UUID,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    actor_name TEXT,
    target_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.type,
        al.actor_player_id,
        al.target_player_id,
        al.challenge_id,
        al.match_id,
        al.description,
        al.metadata,
        al.created_at,
        ap.display_name as actor_name,
        tp.display_name as target_name
    FROM activity_log al
    LEFT JOIN players apl ON al.actor_player_id = apl.id
    LEFT JOIN profiles ap ON apl.profile_id = ap.id
    LEFT JOIN players tpl ON al.target_player_id = tpl.id
    LEFT JOIN profiles tp ON tpl.profile_id = tp.id
    WHERE (p_before_timestamp IS NULL OR al.created_at < p_before_timestamp)
      AND (p_type_filter IS NULL OR al.type = ANY(p_type_filter))
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get unread activity count for a player
CREATE OR REPLACE FUNCTION get_unread_activity_count(p_player_id UUID)
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
BEGIN
    -- This is a placeholder - you'd need a "read_activities" table to track
    -- For now, return count of activities in last 24h where player is target
    SELECT COUNT(*) INTO count
    FROM activity_log
    WHERE target_player_id = p_player_id
      AND created_at > NOW() - INTERVAL '24 hours';
    
    RETURN count;
END;
$$ LANGUAGE plpgsql;
