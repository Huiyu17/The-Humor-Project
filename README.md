# The Humor Project

A Next.js + Supabase caption rating app. Browse captions publicly, sign in with Google, complete a profile, upload an avatar, and save a personal vote on each caption.

## Setup

See [the step-by-step Week 3 guide (中文)](docs/week3-guide.zh-CN.md) for database setup, Google callbacks, Storage, Vercel, and the submission checklist.

1. Keep using the existing Supabase and Vercel projects.
2. Inspect the existing schema with `supabase/000_inspect.sql`.
3. Review `supabase/001_profiles.sql` and the proposed `supabase/002_caption_rating.sql`. Do not run the latter if the course supplies a different schema. These scripts do not change RLS policies/settings.
4. Add real image and caption records in Supabase. No fake feed or vote data is bundled.
5. Configure `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
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
- `supabase/`: SQL to review and run manually, not automatically applied.

The legacy jokes table is retained. No RLS policies are created, enabled, disabled, or modified; existing profile and Storage policies still need review in the appropriate course phase.
