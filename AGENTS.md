# Agent Instructions for Tribeca

This document provides guidance for AI agents working on this codebase.

## Project Overview

Tribeca is a triathlon race results application with:
- **Frontend**: Next.js 16 with React 19, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Purpose**: Display race results, filter by division/team/gender, upload CSV results via admin

---

## Common Tasks

### Running the App

```bash
npm run dev     # Development server
npm run build   # Production build
npm run start  # Start production server
npm run lint   # Lint code
npm run test   # Run tests in watch mode
npm run test:run  # Run tests once
```

### Database Schema

The main tables are defined in `supabase/schema.sql`:
- `races` - Race metadata (name, type, date, distances)
- `athletes` - Athlete info (name, team, city, gender)
- `results` - Race results with times for each segment

Key: `results` uses `athlete_bib` + `race_id` as unique key.

### RLS Policies

Defined in `supabase/rls-policies.sql`:
- Public read access to all tables
- Admin insert access (currently handled via server-side API route)

### Admin Upload

The admin page (`/admin`) allows uploading CSV files:
1. Select CSV file
2. Map columns (auto-detected, can save presets)
3. Enter race metadata (name, type, distances)
4. Submit → POST to `/api/upload` → server handles DB inserts

The upload API uses the service role key to bypass RLS.

---

## Testing

Tests use Vitest. Key test file:
- `src/lib/triathlon.test.ts` - Tests for time parsing, formatting, data transformation

To add tests:
1. Create `.test.ts` or `.test.tsx` files in `src/`
2. Run `npm run test:run` to execute

---

## Important Notes

### Schema Updates

If you modify the database schema:
1. Update `supabase/schema.sql`
2. Run the SQL in Supabase SQL Editor
3. Update TypeScript types in `src/lib/triathlon.ts` (RawResult, DisplayRow)
4. Update queries in pages if column names change
5. Update tests if needed

### Env Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - **Secret** - for server-side admin operations
- `NEXT_PUBLIC_ADMIN_EMAIL` - Admin login email

### Style Guidelines

- Use **Tailwind CSS** for styling (already configured)
- Follow existing code patterns in each file
- No need for extensive comments
- ESLint warnings are allowed (configured in `eslint.config.mjs`)

### Avoid Scope Creep

This is a small internal tool. Don't add:
- CI/CD pipelines
- E2E testing
- Complex authentication beyond simple email/password
- Feature creep beyond race results display and upload

---

## Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Dashboard/home page |
| `src/app/races/page.tsx` | Race results table with filters |
| `src/app/admin/page.tsx` | CSV upload interface |
| `src/app/api/upload/route.ts` | Server-side upload handler |
| `src/lib/triathlon.ts` | Types and helper functions |
| `src/lib/supabase.ts` | Supabase client |
| `src/lib/auth/AuthContext.tsx` | Authentication |
| `supabase/schema.sql` | Database schema |
| `supabase/rls-policies.sql` | RLS policies |