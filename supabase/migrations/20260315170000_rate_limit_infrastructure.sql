-- =============================================================================
-- Migration: Rate Limit Infrastructure
-- Description: Creates rate_limit_entries table and check_rate_limit RPC function
--              for database-backed rate limiting on Edge Functions.
-- =============================================================================

-- Rate limit entries table
CREATE TABLE IF NOT EXISTS rate_limit_entries (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_entries_window_start
  ON rate_limit_entries (window_start);

ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- No direct access via RLS — only accessible through SECURITY DEFINER functions
CREATE POLICY "rate_limit_entries no direct access"
  ON rate_limit_entries
  FOR ALL
  TO authenticated, anon
  USING (false);

-- Atomic rate limit check function
-- Returns TRUE if the request is allowed, FALSE if rate limited
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max_requests INT,
  p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ;
  v_count INT;
BEGIN
  -- Try to insert or update atomically
  INSERT INTO rate_limit_entries (key, window_start, request_count)
  VALUES (p_key, v_now, 1)
  ON CONFLICT (key) DO UPDATE
  SET
    request_count = CASE
      WHEN rate_limit_entries.window_start + (p_window_seconds || ' seconds')::INTERVAL < v_now
      THEN 1  -- Window expired, reset
      ELSE rate_limit_entries.request_count + 1
    END,
    window_start = CASE
      WHEN rate_limit_entries.window_start + (p_window_seconds || ' seconds')::INTERVAL < v_now
      THEN v_now  -- Window expired, reset
      ELSE rate_limit_entries.window_start
    END
  RETURNING window_start, request_count INTO v_window_start, v_count;

  RETURN v_count <= p_max_requests;
END;
$$;

-- Cleanup function for expired entries (run periodically via pg_cron or manual)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_entries()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM rate_limit_entries
  WHERE window_start < now() - INTERVAL '10 minutes';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
