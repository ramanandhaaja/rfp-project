#!/bin/bash

# Script to fix Supabase client creation in API routes
# This prevents build-time errors when deploying to Vercel

echo "Fixing Supabase client imports in API routes..."

# Array of files to fix
files=(
  "src/app/api/companies/route.ts"
  "src/app/api/products/route.ts"
  "src/app/api/products/import-csv/route.ts"
  "src/app/api/proposals/generate/route.ts"
  "src/app/api/proposals/get/route.ts"
  "src/app/api/nvi/generate/route.ts"
  "src/app/api/tenders/import/route.ts"
  "src/app/api/tenders/analyze/route.ts"
  "src/app/api/tenders/legal-analysis/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."

    # Replace the import
    sed -i.bak 's/import { createClient } from .@supabase\/supabase-js.;/import { getSupabaseClient } from '\''@\/lib\/supabase-server'\'';/g' "$file"

    # Replace the const supabase = createClient(...) with getSupabaseClient()
    # This is trickier - we'll use perl for multi-line replacement
    perl -i.bak2 -0pe 's/const supabase = createClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!\s*\);/\/\/ Supabase client created lazily to prevent build-time errors\nconst getSupabase = () => getSupabaseClient();/gs' "$file"

    # Now replace all instances of 'supabase.' with 'getSupabase().'
    # But be careful not to replace it in comments
    sed -i.bak3 's/\bsupabase\./getSupabase()./g' "$file"

    # Clean up backup files
    rm -f "$file.bak" "$file.bak2" "$file.bak3"

    echo "✓ Fixed $file"
  else
    echo "✗ File not found: $file"
  fi
done

echo "Done! All API routes have been updated."
echo "Please review the changes and test locally before deploying."
