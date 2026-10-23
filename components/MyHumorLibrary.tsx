"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CaptionPhoto from "./CaptionPhoto";
import type { Caption } from "@/lib/captions";
import { deleteCaption, removeLikedCaption, restoreCaption } from "@/app/actions/my-humor";

export type HumorView = "published" | "liked" | "trash";
export type LibraryCaption = Caption & { deleted_at?: string; removed_by_admin?: boolean };
type Action = "delete" | "unlike" | "restore";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

const copy: Record<HumorView, { heading: string; intro: string; eyebrow: string }> = {
  published: {
    heading: "Made by you", eyebrow: "YOUR CAPTION",
    intro: "Your published captions, newest first. Deleted captions move to Trash, where you can restore them.",
  },
  liked: {
    heading: "Made you laugh", eyebrow: "MADE YOU LAUGH",
    intro: "Captions you rated Made me laugh. If an author deletes a caption, it leaves this collection.",
  },
  trash: {
    heading: "Trash", eyebrow: "IN TRASH",
    intro: "Captions you deleted. They are hidden from everyone. Restore one to put it back in Explore with its votes and likes. Captions a moderator removed are listed too, but only a moderator can restore them.",
  },
};

export default function MyHumorLibrary({ view, captions, publishedCount, likedCount, trashCount, loadFailed, page, pageSize }: {
  view: HumorView;
  captions: LibraryCaption[];
  publishedCount: number | null;
  likedCount: number | null;
  trashCount: number | null;
  loadFailed: boolean;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [candidate, setCandidate] = useState<LibraryCaption | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const inFlight = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const counts: Record<HumorView, number | null> = { published: publishedCount, liked: likedCount, trash: trashCount };
  const total = counts[view] ?? 0;
  const href = (target: HumorView, targetPage = 1) => `/my-humor?view=${target}&page=${targetPage}`;

  useEffect(() => {
    if (candidate) dialog.current?.showModal();
    else dialog.current?.close();
  }, [candidate]);

  function mutate(caption: LibraryCaption, action: Action) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusyId(caption.id);
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const run = action === "delete" ? deleteCaption : action === "restore" ? restoreCaption : removeLikedCaption;
        const result = await run(caption.id);
        if (result.error) { setError(result.error); return; }
        setCandidate(null);
        setMessage(action === "delete"
          ? "Moved to Trash. It's hidden from Explore and liked collections — you can restore it from Trash."
          : action === "restore"
            ? "Restored! It's back in Explore and in My captions, with its votes and likes."
            : "Removed from your likes. Your positive vote has been cleared.");
        if (captions.length === 1 && page > 1) router.replace(href(view, page - 1));
        else router.refresh();
      } catch {
        setError("Connection interrupted. Refresh or retry to confirm the change.");
      } finally {
        inFlight.current = false;
        setBusyId("");
      }
    });
  }

  const nav: { view: HumorView; label: string; hint: string }[] = [
    { view: "published", label: "My captions", hint: "Shared with the community" },
    { view: "liked", label: "Liked captions", hint: "Your favorite laughs" },
    { view: "trash", label: "Trash", hint: "Restore deleted captions" },
  ];

  const empty = {
    published: { icon: "✦", title: "Your first punchline starts here.", text: "Create a caption, preview it, and publish when it feels right. Your published work will live here.", link: "/create", cta: "Create your first caption" },
    liked: { icon: "♡", title: "Find your kind of funny.", text: "Choose Made me laugh on a caption in Explore to keep it here for another laugh.", link: "/#captions", cta: "Explore captions" },
    trash: { icon: "↺", title: "Trash is empty.", text: "Captions you delete land here, so you can bring them back anytime.", link: href("published"), cta: "Back to My captions" },
  }[view];

  return <div className="humor-layout">
    <aside className="humor-sidebar">
      <nav className="panel humor-nav" aria-label="My humor collections">
        {nav.map((item) => (
          <Link key={item.view} href={href(item.view)} aria-current={view === item.view ? "page" : undefined}
            className={`humor-nav-link${view === item.view ? " active" : ""}${item.view === "trash" ? " humor-nav-trash" : ""}`}>
            <span>{item.label}<small>{item.hint}</small></span><span className="humor-count">{counts[item.view] ?? "—"}</span>
          </Link>
        ))}
      </nav>
      <p className="humor-sidebar-note">A little collection of your sense of humor.</p>
    </aside>
    <section className="humor-content" aria-labelledby="humor-collection-heading" aria-busy={pending}>
      <div className="humor-section-heading">
        <h2 id="humor-collection-heading">{copy[view].heading}</h2>
        <p className="muted small">{copy[view].intro}</p>
        {view === "liked" && <p id="remove-like-help" className="muted small">
          <strong>Remove like</strong> removes the caption from this collection and clears your positive vote. It does not count as a <strong>Not quite</strong> vote.
        </p>}
      </div>
      {message && <p role="status" className="notice success">{message}</p>}
      {error && !candidate && <p role="alert" className="notice error">{error}</p>}
      {loadFailed ? <div className="panel empty-state">
        <h3>Your collection could not be loaded.</h3>
        <p className="muted">Please try again. Your saved captions have not been changed.</p>
        <button className="button button-outline" onClick={() => router.refresh()}>Try again</button>
      </div> : captions.length ? <>
        <div className="humor-grid">
          {captions.map((caption) => <article className={view === "trash" ? `caption-card in-trash${caption.removed_by_admin ? " removed-by-admin" : ""}` : "caption-card"} key={caption.id}>
            <CaptionPhoto image={caption.image} />
            <div className="caption-body">
              <span className="eyebrow">{view === "trash" && caption.removed_by_admin ? "REMOVED BY A MODERATOR" : copy[view].eyebrow}</span>
              <h3>{caption.content}</h3>
              <div className="humor-card-footer">
                <time dateTime={caption.deleted_at ?? caption.created_at}>
                  {view === "trash" && caption.deleted_at
                    ? `${caption.removed_by_admin ? "Removed" : "Deleted"} ${formatDate(caption.deleted_at)}`
                    : formatDate(caption.created_at)}
                </time>
                {view === "published" && <button type="button" className="humor-delete" disabled={pending}
                  onClick={() => { setError(""); setCandidate(caption); }}>Delete caption</button>}
                {view === "liked" && <button type="button" className="humor-unlike" aria-describedby="remove-like-help" disabled={pending}
                  onClick={() => mutate(caption, "unlike")}>{busyId === caption.id ? "Removing..." : "Remove like"}</button>}
                {view === "trash" && !caption.removed_by_admin && <button type="button" className="button button-dark humor-restore" disabled={pending}
                  onClick={() => mutate(caption, "restore")}>{busyId === caption.id ? "Restoring..." : "↺ Restore"}</button>}
                {view === "trash" && caption.removed_by_admin && <span className="humor-removed-note"
                  title="A moderator removed this caption. Only a moderator can restore it.">Only a moderator can restore this</span>}
              </div>
            </div>
          </article>)}
        </div>
        <nav className="humor-pagination" aria-label="Collection pages">
          {page > 1 ? <Link href={href(view, page - 1)} className="button button-outline">&larr; Previous</Link> : <span />}
          <span className="muted small">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
          {page * pageSize < total ? <Link href={href(view, page + 1)} className="button button-outline">Next &rarr;</Link> : <span />}
        </nav>
      </> : <div className="panel empty-state humor-empty">
        <span className="humor-empty-icon" aria-hidden="true">{empty.icon}</span>
        <h3>{page > 1 ? "No captions on this page." : empty.title}</h3>
        <p className="muted">{page > 1 ? "The collection may have changed. Head back to the first page." : empty.text}</p>
        <Link className="button button-dark" href={page > 1 ? href(view) : empty.link}>{page > 1 ? "First page" : empty.cta} &rarr;</Link>
      </div>}
    </section>
    <dialog ref={dialog} className="humor-delete-dialog" aria-labelledby="delete-caption-title" aria-describedby="delete-caption-description"
      onCancel={(event) => { if (pending) event.preventDefault(); else setCandidate(null); }}>
      <span className="eyebrow">MANAGE YOUR CAPTION</span>
      <h2 id="delete-caption-title">Move this caption to Trash?</h2>
      <p id="delete-caption-description" className="muted">It will be hidden from Explore and everyone’s liked captions. You can restore it anytime from <strong>Trash</strong>, with its votes. Your original photo stays in My photos.</p>
      <blockquote>{candidate?.content}</blockquote>
      {error && <p role="alert" className="notice error">{error}</p>}
      <div className="humor-dialog-actions">
        <button type="button" autoFocus className="button button-outline" disabled={pending} onClick={() => setCandidate(null)}>Keep caption</button>
        <button type="button" className="button button-danger" disabled={pending} onClick={() => candidate && mutate(candidate, "delete")}>{pending ? "Moving..." : "Move to Trash"}</button>
      </div>
    </dialog>
  </div>;
}
