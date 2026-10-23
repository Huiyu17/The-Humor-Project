# Week 6 feedback: Trash and restore

## Feedback received

The feedback group leader suggested adding a **recover** feature: users and
admins should be able to bring back captions that a user deleted. On the main
site, My humor should have a **Trash** section where users can restore their
deleted captions. The admin panel's *Withdrawn* tab should offer the same
restore action.

## What changed

- **My humor → Trash** (`/my-humor?view=trash`) is a third collection next to
  My captions and Liked captions, with a count. It lists the user's deleted
  captions, newest deletion first, with the deletion date and a **↺ Restore**
  button. The photos are greyed out to show the caption is inactive. Empty and
  paginated states match the other collections.
- **Delete is now "Move to Trash".** The confirmation dialog and success message
  explain that the caption is hidden from Explore and liked collections and can
  be restored from Trash. The old dialog said it could not be undone.
- **Restore** puts the caption back in Explore and in My captions. Its
  original votes reappear, and so do other users' likes, because a My humor
  delete was always a soft delete (`deleted_at` / `withdrawn_at`). Nothing was
  erased, so nothing is lost.
- **Admin panel:** the Withdrawn tab and the caption detail page have a
  **↺ Restore** button that does the same thing for any user's caption.
  The admin's *Delete permanently* stays irreversible and its dialog says so.

## Database (`supabase/010_trash_and_restore.sql`)

Run once in the Supabase SQL Editor. The same file is in both repositories.

| Function | Purpose | Who can call it |
| --- | --- | --- |
| `humor_list_trash(limit, offset)` | List the caller's own deleted captions | Signed-in users (own rows only) |
| `humor_restore_caption(id)` | Restore one of the caller's own captions | Signed-in owner |
| `admin_restore_caption(id)` | Restore any author-deleted caption | `is_superadmin` only |
| `humor_restore_caption_internal` | Shared restore step | Nobody directly |

All functions are `SECURITY DEFINER`, because withdrawn captions are hidden by
a restrictive RLS policy. Each function checks ownership or `is_superadmin()`
itself. Restore takes the same advisory lock as publish and delete, so the
operations cannot interleave. A repeated restore is a safe no-op.

## Verification

`columbia-chuckles-admin/scripts/trash-db-test.sql` runs 28 checks against a
local PostgreSQL 16 database rebuilt from migrations 001–010. The checks cover:

- Trash listing and paging.
- Isolation: other users and anonymous visitors cannot list or restore.
- The internal helper cannot be called directly.
- Restore, including an idempotent retry.
- Likes reappearing after restore.
- Delete again after restore.
- A stale Publish still being blocked while the caption is in Trash.
- Admin restore.
- Permanently deleted captions not being restorable.

## Follow-up: admin deletes are reversible too (migration 011)

Admin deletion used to be one irreversible click. It is now two steps, matching
the "deletions should be recoverable" spirit of the feedback:

1. **Remove** (the default on live captions in the admin panel) hides the caption
   from everyone and keeps its votes. It is recorded as `deleted_by = 'admin'`.
2. **Delete permanently** is offered only for captions that are already hidden.

Who removed a caption decides who may bring it back:

| Hidden by | Shown in the author's Trash as | Author can restore | Admin can restore |
| --- | --- | --- | --- |
| Author (My humor → Delete) | "In Trash" with **↺ Restore** | Yes | Yes |
| Admin (Backstage → Remove) | "Removed by a moderator", no Restore button | **No** | Yes |

Without this distinction, an author could undo a moderator's removal from their
own Trash. The database enforces the rule, not just the UI:
`humor_restore_caption` refuses admin removals, an author "deleting" an
admin-removed caption cannot downgrade it to `'author'`, and a CHECK constraint
keeps `deleted_at` and `deleted_by` consistent.

`supabase/011_admin_soft_remove.sql` (same file in both repositories) adds the
column and backfills existing hidden captions as `'author'`. It also adds
`admin_remove_caption` and updates the delete, restore and list functions.
Re-running 008 or 010 after 011 fails and rolls back without changing anything,
so an older migration cannot silently undo these rules.

Verified with `columbia-chuckles-admin/scripts/removal-db-test.sql` (42 checks).
The checks cover:

- Only admins can remove.
- Votes are kept.
- The author cannot restore, re-publish or edit `deleted_by`.
- The author's own Trash still works.
- An admin restore brings votes and likes back.
- Seed captions can be removed and restored.
- Permanent delete as the second step.

The existing suites still pass with 011 applied (Trash 28/28, admin 41/41).
