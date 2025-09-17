-- Create users table for authentication
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- For NextAuth.js custom user management, we'll use simpler RLS policies
-- or disable RLS entirely since we're managing authentication through NextAuth

-- Option 1: Disable RLS for NextAuth.js (simpler approach)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Option 2: If you prefer to keep RLS enabled, use these policies instead:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- 
-- -- Allow all operations for now since NextAuth handles the security layer
-- CREATE POLICY "Allow all operations" ON users USING (true) WITH CHECK (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions for NextAuth.js operations
GRANT SELECT, INSERT, UPDATE ON users TO anon, authenticated;