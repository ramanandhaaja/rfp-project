-- Create companies and products tables
-- Run this SQL in your Supabase SQL Editor

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(200),
  description TEXT,
  capabilities TEXT[],
  certifications TEXT[],
  employee_count INTEGER,
  revenue BIGINT,
  founded_year INTEGER,
  website TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  achievements TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(200),
  description TEXT,
  specifications JSONB,
  features TEXT[],
  price_range VARCHAR(100),
  availability VARCHAR(100),
  compliance_standards TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for companies
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);

-- Create indexes for products
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Companies RLS policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own companies" ON companies;
  DROP POLICY IF EXISTS "Users can insert their own companies" ON companies;
  DROP POLICY IF EXISTS "Users can update their own companies" ON companies;
  DROP POLICY IF EXISTS "Users can delete their own companies" ON companies;
END $$;

CREATE POLICY "Users can view their own companies" ON companies
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert their own companies" ON companies
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Users can update their own companies" ON companies
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Users can delete their own companies" ON companies
  FOR DELETE USING (user_id IN (SELECT id FROM users WHERE id = user_id));

-- Products RLS policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own products" ON products;
  DROP POLICY IF EXISTS "Users can insert their own products" ON products;
  DROP POLICY IF EXISTS "Users can update their own products" ON products;
  DROP POLICY IF EXISTS "Users can delete their own products" ON products;
END $$;

CREATE POLICY "Users can view their own products" ON products
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert their own products" ON products
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Users can update their own products" ON products
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Users can delete their own products" ON products
  FOR DELETE USING (user_id IN (SELECT id FROM users WHERE id = user_id));

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO authenticated;

COMMENT ON TABLE companies IS 'Stores user company profiles and capabilities';
COMMENT ON TABLE products IS 'Stores company products and their specifications';
