# The Humor Project

A Next.js + Supabase + Gemini caption app for Columbia students. Browse published captions, sign in with Google, upload a photo or choose a preset, generate a caption, and rate the community's creations.

Week 4 implementation and verification status: [Week 4 guide](docs/week4-status.zh-CN.md).

Week 4 database configuration: [schema and 17 RLS policies](supabase/004_week4_schema_and_rls.sql). This records changes already applied to the hosted project; it is not a request to run them again. See its prerequisites and Storage bucket settings before reproducing elsewhere.

## Setup

See [the step-by-step Week 3 guide (中文)](docs/week3-guide.zh-CN.md) for database setup, Google callbacks, Storage, Vercel, and the submission checklist.

1. Keep using the existing Supabase and Vercel projects.
2. Inspect the existing schema with `supabase/000_inspect.sql`.
3. Review `supabase/001_profiles.sql` and the proposed `supabase/002_caption_rating.sql`. Do not run the latter if the course supplies a different schema. These scripts do not change RLS policies/settings.
4. Add real image and caption records in Supabase. No fake feed or vote data is bundled.
5. Configure `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `GEMINI_API_KEY`. Optional `GEMINI_MODEL` overrides the default model. Configure these separately in Vercel for the deployment environment; never commit their values.
6. Run `npm install`, then `npm run dev`.

## Checks

```sh
npm run lint
npm run build
```

Google login and authenticated writes need end-to-end testing against the configured Supabase project. Production access and the exact deployment callback must also be tested in an incognito browser before submission.

## Structure

- `app/page.tsx`: public caption collection and auth-gated rating UI.
- `app/profile/`: protected profile page and authenticated name update action.
- `app/auth/callback/`: PKCE exchange and onboarding redirect.
- `proxy.ts`: refreshes auth cookies; authorization also happens at each protected page/action.
- `lib/captions.ts`: database read adapter; adjust here if course schema differs.
- `app/actions/votes.ts`: authenticated vote persistence.
- `app/create/`: creation form and sign-in gate.
- `app/actions/generate.ts`: authenticated Gemini request, saved prompt and caption.
- `components/CaptionImageUpload.tsx`: uploads to the user's Storage folder and saves image metadata.
- `supabase/`: SQL to review and run manually, not automatically applied.

The legacy jokes table is retained. The Week 3 SQL files are historical setup scripts, not the full Week 4 configuration. Week 4 RLS and schema changes were applied manually in the Supabase SQL Editor and verified incrementally. Do not rerun the original table-creation script against the existing database. See the Week 4 guide for the configured permissions and outstanding verification.
