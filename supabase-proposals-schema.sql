-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES tender_documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'submitted', 'won', 'lost')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, tender_id)
);

-- Create NvI questions table
CREATE TABLE IF NOT EXISTS nvi_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES tender_documents(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  lens TEXT NOT NULL,
  issue TEXT NOT NULL,
  question TEXT NOT NULL,
  priority_score INTEGER NOT NULL,
  ko_risk INTEGER NOT NULL CHECK (ko_risk >= 0 AND ko_risk <= 3),
  meat_impact INTEGER NOT NULL CHECK (meat_impact >= 0 AND meat_impact <= 3),
  euro_impact INTEGER NOT NULL CHECK (euro_impact >= 0 AND euro_impact <= 3),
  time_impact INTEGER NOT NULL CHECK (time_impact >= 0 AND time_impact <= 3),
  evidence_risk INTEGER NOT NULL CHECK (evidence_risk >= 0 AND evidence_risk <= 3),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'answered')),
  answer TEXT,
  answered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE nvi_questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for proposals
CREATE POLICY "Users can view their own proposals" ON proposals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own proposals" ON proposals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own proposals" ON proposals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own proposals" ON proposals
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for nvi_questions
CREATE POLICY "Users can view their own NvI questions" ON nvi_questions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own NvI questions" ON nvi_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own NvI questions" ON nvi_questions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own NvI questions" ON nvi_questions
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_proposals_user_id ON proposals(user_id);
CREATE INDEX idx_proposals_tender_id ON proposals(tender_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_nvi_questions_user_id ON nvi_questions(user_id);
CREATE INDEX idx_nvi_questions_tender_id ON nvi_questions(tender_id);
CREATE INDEX idx_nvi_questions_proposal_id ON nvi_questions(proposal_id);
CREATE INDEX idx_nvi_questions_priority_score ON nvi_questions(priority_score DESC);
