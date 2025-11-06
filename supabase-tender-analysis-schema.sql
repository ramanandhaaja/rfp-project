-- Create tender_analysis table for storing AI analysis results
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tender_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES tender_documents(id) ON DELETE CASCADE,
  overall_match VARCHAR(50),
  competitiveness VARCHAR(50),
  recommendation TEXT,
  strengths TEXT[],
  gaps TEXT[],
  opportunities TEXT[],
  risks TEXT[],
  action_items TEXT[],
  budget_assessment TEXT,
  timeline_assessment TEXT,
  strategic_advice TEXT,
  matching_products JSONB,
  relevant_companies JSONB,
  relevant_products JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, tender_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tender_analysis_user_id ON tender_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_tender_analysis_tender_id ON tender_analysis(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_analysis_created_at ON tender_analysis(created_at DESC);

-- Enable RLS
ALTER TABLE tender_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own tender analysis" ON tender_analysis;
  DROP POLICY IF EXISTS "Users can insert their own tender analysis" ON tender_analysis;
  DROP POLICY IF EXISTS "Users can update their own tender analysis" ON tender_analysis;
  DROP POLICY IF EXISTS "Users can delete their own tender analysis" ON tender_analysis;
END $$;

CREATE POLICY "Users can view their own tender analysis" ON tender_analysis
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert their own tender analysis" ON tender_analysis
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Users can update their own tender analysis" ON tender_analysis
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Users can delete their own tender analysis" ON tender_analysis
  FOR DELETE USING (user_id IN (SELECT id FROM users WHERE id = user_id));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_tender_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tender_analysis_updated_at ON tender_analysis;

CREATE TRIGGER update_tender_analysis_updated_at
  BEFORE UPDATE ON tender_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_tender_analysis_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tender_analysis TO authenticated;

COMMENT ON TABLE tender_analysis IS 'Stores AI-generated analysis results for tender documents';
