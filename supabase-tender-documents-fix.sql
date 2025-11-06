-- Fix VARCHAR(50) limitations in tender_documents table
-- Run this SQL in your Supabase SQL Editor to fix the "value too long" error

-- The error occurs because some fields have VARCHAR(50) limits
-- This migration increases the limits to more reasonable values

-- If the table doesn't exist yet, create it
CREATE TABLE IF NOT EXISTS tender_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  reference_number VARCHAR(200),  -- Increased from VARCHAR(50)
  tender_type VARCHAR(200),         -- Increased from VARCHAR(50)
  description TEXT,
  requirements JSONB,
  specifications JSONB,
  evaluation_criteria JSONB,
  budget_info JSONB,
  deadlines JSONB,
  contact_info JSONB,
  municipalities TEXT[],
  categories TEXT[],
  cpv_code VARCHAR(100),           -- Increased from VARCHAR(50)
  file_path TEXT,
  file_size BIGINT,
  mime_type VARCHAR(100),
  processed_content TEXT,
  extracted_sections JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- If the table already exists, alter the columns
ALTER TABLE tender_documents
  ALTER COLUMN reference_number TYPE VARCHAR(200),
  ALTER COLUMN tender_type TYPE VARCHAR(200),
  ALTER COLUMN cpv_code TYPE VARCHAR(100),
  ALTER COLUMN mime_type TYPE VARCHAR(100);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tender_documents_user_id ON tender_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_tender_documents_created_at ON tender_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tender_documents_reference_number ON tender_documents(reference_number);

-- Enable RLS
ALTER TABLE tender_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own tender documents" ON tender_documents;
  DROP POLICY IF EXISTS "Users can insert their own tender documents" ON tender_documents;
  DROP POLICY IF EXISTS "Users can update their own tender documents" ON tender_documents;
  DROP POLICY IF EXISTS "Users can delete their own tender documents" ON tender_documents;
END $$;

CREATE POLICY "Users can view their own tender documents" ON tender_documents
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert their own tender documents" ON tender_documents
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Users can update their own tender documents" ON tender_documents
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Users can delete their own tender documents" ON tender_documents
  FOR DELETE USING (user_id IN (SELECT id FROM users WHERE id = user_id));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_tender_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tender_documents_updated_at ON tender_documents;

CREATE TRIGGER update_tender_documents_updated_at
  BEFORE UPDATE ON tender_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_tender_documents_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tender_documents TO authenticated;

COMMENT ON TABLE tender_documents IS 'Stores uploaded tender documents with AI-extracted metadata';
