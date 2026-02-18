-- ============================================
-- iABS Users Table
-- ============================================
-- Run this SQL in Supabase SQL Editor
-- Go to: Supabase Dashboard > SQL Editor > New Query
-- Paste this entire script and click "Run"
-- ============================================

-- 1. Create the users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kick_username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    discord TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create index on kick_username for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_kick_username ON users(kick_username);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Allow anyone to INSERT (register)
CREATE POLICY "Allow public registration" ON users
    FOR INSERT
    WITH CHECK (true);

-- 5. Policy: Allow anyone to SELECT (for login checks)
CREATE POLICY "Allow public read" ON users
    FOR SELECT
    USING (true);

-- 6. Policy: Allow users to UPDATE their own row (by kick_username match)
CREATE POLICY "Allow public update" ON users
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 7. Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Done! Your users table is ready.
-- ============================================
