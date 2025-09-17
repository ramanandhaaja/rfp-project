# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 starter template with authentication built using the App Router. The project includes:

- **Authentication**: NextAuth.js with credentials provider backed by Supabase PostgreSQL database
- **Database**: Supabase with bcrypt password hashing for secure user storage
- **UI Framework**: Tailwind CSS v4 with shadcn/ui components (New York style, Neutral base color)
- **Build Tool**: Next.js with Turbopack enabled for faster development
- **TypeScript**: Full TypeScript support throughout the project

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production version with Turbopack
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

### Authentication Flow
- NextAuth.js configured in `src/lib/auth.ts` and `src/app/api/auth/[...nextauth]/route.ts`
- Supabase database integration via `src/lib/supabase.ts` helper functions
- Session management uses JWT strategy with user data from Supabase
- Custom pages: `/auth/signin` and `/auth/signup` with real user registration
- Protected routes redirect unauthenticated users to sign-in
- SessionProvider wraps the app in `src/app/providers.tsx`
- Password hashing with bcrypt (12 rounds) for security

### Route Structure
- **Landing page** (`/`): Welcome page with navigation to auth pages
- **Authentication pages** (`/auth/signin`, `/auth/signup`): Custom auth forms
- **Dashboard** (`/dashboard`): Protected page showing user info after login
- **API routes** (`/api/auth/[...nextauth]`): NextAuth.js endpoints

### Key Configuration Files
- `components.json`: shadcn/ui configuration with path aliases (@/components, @/lib, etc.)
- `.env`: Contains Supabase URL and anon key, NextAuth URL and secret
- `supabase-schema.sql`: Database schema for users table (run in Supabase SQL Editor)

### Database & Authentication Implementation
- Users table with UUID primary keys, encrypted passwords, and proper indexing
- Row Level Security (RLS) enabled for data protection
- Helper functions for user creation, authentication, and management in `src/lib/supabase.ts`
- Real-time password validation against hashed database values
- User session includes id, email, and name from database
- All auth pages include proper error handling, validation, and loading states
- Sign-up creates actual database records with proper password hashing

### Supabase Setup Required
1. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL Editor
2. Ensure environment variables are set correctly in `.env`

### UI Components
- Uses shadcn/ui component system with Tailwind CSS v4
- Responsive design with dark mode support
- Glass morphism effects on navigation with backdrop-blur
- Mobile-responsive navigation menu