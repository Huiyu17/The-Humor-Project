# My humor

## Behavior

- `/my-humor` is a private collection page. Signed-out visitors see a sign-in
  prompt; OAuth returns them to this page using an explicit allowed destination.
- My captions lists the current user's published captions through the owning
  generation. Source-photo ownership is not treated as caption authorship.
  Older seeded captions without an owning generation are not assigned to anyone.
- Liked captions uses existing `caption_votes.value = 1` (Made me laugh). There is
  no separate bookmark system. Removing a like clears that positive vote; it does
  not create a negative vote. Changing a vote to Not quite removes it from likes.
- Each collection has a count, stable sorting and pages of 12. Desktop uses a
  left navigation rail and two columns; small screens use top navigation and one
  card column. Empty collections and failed reads have explicit recovery actions.
- The author confirms deletion in a modal. Deletion withdraws the publication
  from Explore, My captions and all liked collections, with no placeholder cards.
  Other open browser tabs update on their next refresh/navigation; this is not a
  realtime subscription feature. The user's photo remains available for reuse.

## Database installation (required before testing mutations)

Run `supabase/007_my_humor.sql` in Supabase SQL Editor after migration 006.
This migration adds nullable deletion timestamps, policies, and functions; it
does not delete existing content during installation. Expected function results:

| Function | Security type |
| --- | --- |
| humor_delete_caption | DEFINER |
| humor_publish_preview | INVOKER |

The deletion RPC deliberately uses DEFINER because it must update a row that
becomes hidden by SELECT RLS and must accept a retry after a lost response. It
checks `auth.uid()` against the generation owner, uses an empty search path,
accepts only a caption UUID, and grants execution only to authenticated users.
It does not grant clients general caption or generation UPDATE permissions.
See [Supabase database function guidance](https://supabase.com/docs/guides/database/functions).

Deletion is a soft withdrawal, not physical data erasure. The backend keeps the
caption, votes, generation text and source image, but RLS hides withdrawn captions
and their votes from app users. No restore operation is exposed. A withdrawal
marker plus the same advisory lock used for publication prevents stale Publish
retries from bringing the deleted publication back. Existing public read policies
are narrowed using restrictive policies rather than relying on UI filtering.

## Verification performed locally

- ESLint and TypeScript passed for the changed app components; production build
  included the new `/my-humor` route.
- `node scripts/check-my-humor-db.mjs`: 20 checks passed against an isolated
  PostgreSQL-compatible PGlite database reconstructed from migrations 002–007.
  Covers ownership, private generations, removing own vs. others' votes, deletion
  retries, hidden captions/votes, preserved images, denied anonymous calls,
  denied voting on deleted captions, and denied stale or direct republication.
  Migration 007 is also applied twice to verify safe reapplication.
- `node scripts/check-my-humor-ui.mjs`: actual components rendered with fixture
  data at 1440px and 390px in Chrome. Screenshots were inspected. Both collection
  views have equal image frames and no horizontal overflow; empty state checked.
  This fixture does not exercise authenticated server actions or OAuth.
- Temporary test dependencies are isolated under the ignored artifacts directory:
  `npm install --prefix artifacts/my-humor-check --no-save --package-lock=false @electric-sql/pglite playwright`.

## Hosted acceptance still required

1. Install migration 007, sign in, and open My humor. Confirm your published
   captions appear and another account's captions do not appear in My captions.
2. Click Made me laugh in Explore, open Liked captions, then refresh: it persists.
3. Remove the like, return to Explore, and confirm the positive vote is cleared.
4. Cancel a deletion and confirm nothing changes. Confirm a deletion and refresh
   Explore and both users' liked lists: the caption is absent, photo still exists.
5. Check deletion cannot be performed by another user or a signed-out visitor.
6. Sign out, open `/my-humor`, and sign in from the prompt: verify the return path.

No hosted migration or live account mutations were performed by the local tests.
