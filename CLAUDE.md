# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered RFP (Request for Proposal) management platform built with Next.js 15. The application helps users analyze tender documents, match them with company capabilities, and generate professional proposals using AI.

**Core Technologies:**
- **Framework**: Next.js 15 with App Router and Turbopack
- **Authentication**: NextAuth.js with credentials provider backed by Supabase PostgreSQL
- **Database**: Supabase PostgreSQL with bcrypt password hashing
- **AI/ML**: OpenAI GPT-4 for analysis and proposal generation, text-embedding-ada-002 for embeddings
- **Vector Database**: Pinecone for semantic search of companies, products, and tenders
- **UI Framework**: Tailwind CSS v4 with shadcn/ui components (New York style, Neutral base color)
- **TypeScript**: Full TypeScript support throughout

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production version with Turbopack
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables Required

Create a `.env` file with the following variables (see `.env.example` for reference):

```
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI
OPENAI_API_KEY=your-openai-api-key-here

# Pinecone
NEXT_PINECODE_API=your-pinecone-api-key-here
```

## Architecture

### Application Flow

1. **User Authentication** → Users sign in with email/password (stored in Supabase `users` table)
2. **Company & Product Setup** → Users upload company profiles and product catalogs (CSV support)
3. **Tender Upload** → Users upload tender documents (PDF parsing with AI extraction)
4. **AI Analysis** → System analyzes tender requirements against user capabilities using:
   - Vector embeddings (Pinecone) for semantic matching
   - GPT-4 for detailed gap analysis, risk assessment, and strategic recommendations
5. **Proposal Generation** → Multi-agent AI system generates professional proposal sections
6. **NvI Question Generation** → AI generates "Need vs Insight" questions for tender clarification

### Authentication System

**Location**: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`

- NextAuth.js with JWT strategy
- Credentials provider authenticates against Supabase `users` table
- Password hashing with bcrypt (12 rounds)
- Custom sign-in/sign-up pages at `/auth/signin` and `/auth/signup`
- SessionProvider wraps app in `src/app/providers.tsx`
- Protected routes redirect unauthenticated users to sign-in

**Database Helper Functions**: `src/lib/supabase.ts`
- `createUser()` - Register new user with hashed password
- `authenticateUser()` - Verify credentials and return user
- `getUserById()` - Fetch user by ID
- `updateUser()` - Update user profile

### Database Schema

**Two main schemas**:

1. **`supabase-schema.sql`** - User authentication table
   - `users` table with UUID primary keys, email index, password hashing
   - RLS disabled for NextAuth.js compatibility

2. **`supabase-proposals-schema.sql`** - Core application tables
   - `tender_documents` - Uploaded tender PDFs with extracted metadata
   - `tender_analysis` - AI-generated analysis results (cached)
   - `proposals` - Generated proposal content
   - `nvi_questions` - Need vs Insight questions for tenders
   - `companies` - User's company profiles
   - `products` - Company product catalogs
   - RLS enabled with user-level policies

**Important**: The `supabase-proposals-schema.sql` references `auth.users(id)` which suggests it expects Supabase Auth. However, the application uses a custom `users` table with NextAuth.js. When working with foreign keys, verify which user system is being referenced.

### AI & Vector Embeddings Architecture

**Location**: `src/lib/embeddings.ts`, `src/lib/pinecone.ts`

**Pinecone Setup**:
- Index name: `company-knowledge`
- Dimension: 1536 (OpenAI embedding size)
- Metric: cosine similarity
- Namespaces: `companies`, `products`, `tenders`, `legal`

**Key Functions**:
- `generateEmbedding()` - Creates vector embeddings using OpenAI
- `createCompanyEmbedding()` - Embeds company data into Pinecone
- `createProductEmbedding()` - Embeds product data into Pinecone
- `createTenderEmbedding()` - Embeds tender requirements into Pinecone
- `findRelevantCapabilities()` - Semantic search across companies and products
- `searchSimilarContent()` - Generic vector similarity search

**Embedding Strategy**:
- Companies: Combines name, industry, description, capabilities
- Products: Combines name, category, description, features
- Tenders: Combines title, description, requirements, specifications, CPV codes

### Tender Analysis System

**Location**: `src/app/api/tenders/analyze/route.ts`

**Analysis Pipeline**:
1. Fetch tender document from Supabase
2. Check for cached analysis (unless `forceReanalyze=true`)
3. Create search query from tender requirements
4. Vector search for relevant companies/products (top 20 results)
5. Parallel AI analysis:
   - **Gap Analysis Agent** - Compares tender requirements with user capabilities
   - **Product Matching Agent** - Maps specific products to tender specifications
6. Cache results in `tender_analysis` table

**AI Analysis Output**:
- Overall match percentage (0-100)
- Competitiveness rating (High/Medium/Low)
- Recommendation (Should bid / Consider bidding / Don't bid)
- Strengths, gaps, opportunities, risks
- Action items for improving bid chances
- Budget assessment, timeline feasibility
- Strategic advice
- Matching products with match scores

### Proposal Generation System

**Location**: `src/app/api/proposals/generate/route.ts`

**Multi-Agent Architecture**:
The proposal generation uses 7 specialized AI agents running in parallel:

1. **Company Introduction Agent** - Background, experience, mission
2. **Executive Summary Agent** - Key requirements mapped to solutions (table format)
3. **Methodology Agent** - Phased execution plan (Mobilisation → Design → Implementation → Handover)
4. **Organization Agent** - Team structure and governance
5. **Risk Management Agent** - Risk matrix with mitigation strategies
6. **Sustainability Agent** - EU Green Deal, circular economy, CO2 reduction
7. **Differentiation Agent** - "Why Choose Us" competitive positioning

**Output Format**:
- Structured JSON with sections, tables, phases, team structure, risk matrix
- Saved to `proposals` table in Supabase
- Can be rendered as PDF using `src/lib/pdf-generator.ts`

**Important**: All agents use robust JSON parsing with fallbacks (`cleanJsonResponse()` and `safeJsonParse()`) to handle malformed AI responses.

### Dashboard Structure

**Location**: `src/app/dashboard/page.tsx`

**Main Sections** (client-side navigation):
- **Overview** - Dashboard summary
- **Company Profile** - Manage company information
- **Tender Management** - Upload and analyze tenders
- **Proposal & NvI** - Generate proposals and NvI questions

**Component Organization**:
- Dashboard sections: `src/components/dashboard/*Section.tsx`
- Modal components: `src/components/dashboard/*Modal.tsx`
- Reusable UI: `src/components/ui/`

### File Processing

**PDF Processing** (`src/lib/pdf-processor.ts`):
- Uses `pdf-parse-fork` for text extraction
- Extracts structured data from tender PDFs using GPT-4
- **Shape Extraction**: Automatically detects product shapes from Dutch names:
  - "Kofferarmaturen" → Box-shaped/Rectangular
  - "Paaltoparmaturen" → Cylindrical/Pole-top
  - "Bolderarmaturen" → Spherical/Round
- Extracts physical specifications: shape, dimensions, housing, mounting, optics, weight
- 12-lens tender analysis framework for risk identification

**CSV Processing** (`src/lib/csv-parser.ts`):
- Uses `papaparse` for CSV parsing
- Supports bulk product imports

**PDF Generation** (`src/lib/pdf-generator.ts`):
- Uses `jspdf` and `html2canvas`
- Exports proposals as professional PDFs

### API Routes Structure

**Authentication**: `/api/auth/[...nextauth]` - NextAuth.js endpoints

**Companies**: `/api/companies` - CRUD for company profiles

**Products**:
- `/api/products` - CRUD for products
- `/api/products/import-csv` - Bulk CSV import

**Tenders**:
- `/api/tenders/import` - Upload and parse tender PDFs
- `/api/tenders/analyze` - AI analysis of tender requirements
- `/api/tenders/legal-analysis` - Legal compliance analysis

**Proposals**:
- `/api/proposals/generate` - Multi-agent proposal generation
- `/api/proposals/get` - Retrieve saved proposals

**NvI Questions**: `/api/nvi/generate` - Generate clarification questions

### shadcn/ui Configuration

**Location**: `components.json`

- Style: New York
- Base color: Neutral
- RSC: Enabled
- Path aliases: `@/components`, `@/lib`, `@/ui`, `@/hooks`
- Icon library: lucide-react

### Key Considerations

1. **Database Schema Mismatch**: The proposals schema references `auth.users(id)` but the app uses a custom `users` table. Verify foreign key relationships when modifying database schema.

2. **AI Response Parsing**: The proposal generation includes extensive JSON cleaning and fallback parsing due to GPT-4 occasionally returning malformed JSON. Don't remove these safety mechanisms.

3. **Vector Search Performance**: Pinecone embeddings enable semantic matching. When adding new content types, ensure embeddings are created and namespaced properly.

4. **Caching Strategy**: Tender analysis results are cached in the database. Use `forceReanalyze=true` to bypass cache when needed.

5. **Multi-Agent Parallelization**: All proposal generation agents run in parallel using `Promise.all()` for efficiency. Maintain this pattern when adding new agents.

6. **Environment Variables**: The app requires multiple external services (OpenAI, Pinecone, Supabase). Ensure all API keys are configured before running.

7. **Dutch Tender Focus**: The application is designed for Dutch public procurement. AI prompts include references to EU compliance, Dutch business style, and municipal tender requirements.
