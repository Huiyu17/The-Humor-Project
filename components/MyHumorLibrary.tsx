"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CaptionPhoto from "./CaptionPhoto";
import type { Caption } from "@/lib/captions";
import { deleteCaption, removeLikedCaption } from "@/app/actions/my-humor";

export default function MyHumorLibrary({ view, captions, publishedCount, likedCount, loadFailed, page, pageSize }: {
  view: "published" | "liked";
  captions: Caption[];
  publishedCount: number | null;
  likedCount: number | null;
  loadFailed: boolean;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [candidate, setCandidate] = useState<Caption | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const inFlight = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const publishedView = view === "published";
  const total = (publishedView ? publishedCount : likedCount) ?? 0;
  const href = (target: string, targetPage = 1) => `/my-humor?view=${target}&page=${targetPage}`;

  useEffect(() => {
    if (candidate) dialog.current?.showModal();
    else dialog.current?.close();
  }, [candidate]);

  function mutate(caption: Caption, deleting: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusyId(caption.id);
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const result = await (deleting ? deleteCaption(caption.id) : removeLikedCaption(caption.id));
        if (result.error) { setError(result.error); return; }
        setCandidate(null);
        setMessage(deleting ? "Caption deleted from Explore and liked collections." : "Removed from your likes. Your positive vote has been cleared.");
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

  return <div className="humor-layout">
    <aside className="humor-sidebar">
      <nav className="panel humor-nav" aria-label="My humor collections">
        <Link href={href("published")} className={publishedView ? "humor-nav-link active" : "humor-nav-link"} aria-current={publishedView ? "page" : undefined}>
          <span>My captions<small>Shared with the community</small></span><span className="humor-count">{publishedCount ?? "—"}</span>
        </Link>
        <Link href={href("liked")} className={!publishedView ? "humor-nav-link active" : "humor-nav-link"} aria-current={!publishedView ? "page" : undefined}>
          <span>Liked captions<small>Your favorite laughs</small></span><span className="humor-count">{likedCount ?? "—"}</span>
        </Link>
      </nav>
      <p className="humor-sidebar-note">A little collection of your sense of humor.</p>
    </aside>
    <section className="humor-content" aria-labelledby="humor-collection-heading" aria-busy={pending}>
      <div className="humor-section-heading">
        <h2 id="humor-collection-heading">{publishedView ? "Made by you" : "Made you laugh"}</h2>
        <p className="muted small">{publishedView
          ? "Your published captions, newest first. Your photos stay available if you delete a caption."
          : "Captions you rated Made me laugh. If an author deletes a caption, it leaves this collection."}</p>
        {!publishedView && <p id="remove-like-help" className="muted small">
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
          {captions.map((caption) => <article className="caption-card" key={caption.id}>
            <CaptionPhoto image={caption.image} />
            <div className="caption-body">
              <span className="eyebrow">{publishedView ? "YOUR CAPTION" : "MADE YOU LAUGH"}</span>
              <h3>{caption.content}</h3>
              <div className="humor-card-footer">
                <time dateTime={caption.created_at}>{new Date(caption.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</time>
                {publishedView ? <button type="button" className="humor-delete" disabled={pending} onClick={() => { setError(""); setCandidate(caption); }}>Delete caption</button>
                  : <button type="button" className="humor-unlike" aria-describedby="remove-like-help" disabled={pending} onClick={() => mutate(caption, false)}>{busyId === caption.id ? "Removing..." : "Remove like"}</button>}
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
        <span className="humor-empty-icon" aria-hidden="true">{publishedView ? "✦" : "♡"}</span>
        <h3>{page > 1 ? "No captions on this page." : publishedView ? "Your first punchline starts here." : "Find your kind of funny."}</h3>
        <p className="muted">{page > 1 ? "The collection may have changed. Head back to the first page." : publishedView ? "Create a caption, preview it, and publish when it feels right. Your published work will live here." : "Choose Made me laugh on a caption in Explore to keep it here for another laugh."}</p>
        <Link className="button button-dark" href={page > 1 ? href(view) : publishedView ? "/create" : "/#captions"}>{page > 1 ? "First page" : publishedView ? "Create your first caption" : "Explore captions"} &rarr;</Link>
      </div>}
    </section>
    <dialog ref={dialog} className="humor-delete-dialog" aria-labelledby="delete-caption-title" aria-describedby="delete-caption-description"
      onCancel={(event) => { if (pending) event.preventDefault(); else setCandidate(null); }}>
      <span className="eyebrow">MANAGE YOUR CAPTION</span>
      <h2 id="delete-caption-title">Delete this caption?</h2>
      <p id="delete-caption-description" className="muted">It will be removed from Explore and everyone’s liked captions. You can’t undo this here. Your original photo will stay in My photos.</p>
      <blockquote>{candidate?.content}</blockquote>
      {error && <p role="alert" className="notice error">{error}</p>}
      <div className="humor-dialog-actions">
        <button type="button" autoFocus className="button button-outline" disabled={pending} onClick={() => setCandidate(null)}>Keep caption</button>
        <button type="button" className="button button-danger" disabled={pending} onClick={() => candidate && mutate(candidate, true)}>{pending ? "Deleting..." : "Delete caption"}</button>
      </div>
    </dialog>
  </div>;
}
