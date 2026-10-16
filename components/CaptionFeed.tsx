"use client";
import { useState } from "react";
import Link from "next/link";
import { vote } from "@/app/actions/votes";
import type { Caption } from "@/lib/captions";
import CaptionPhoto from "./CaptionPhoto";
function CaptionCard({
  caption,
  index,
  allowed,
  signedIn,
  initialVote,
  ratingUnavailable,
}: {
  caption: Caption;
  index: number;
  allowed: boolean;
  signedIn: boolean;
  initialVote?: number;
  ratingUnavailable: boolean;
}) {
  const [selected, setSelected] = useState(initialVote);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [voteFailed, setVoteFailed] = useState(false);
  async function rate(value: number) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setVoteFailed(false);
    try {
      const result = await vote(caption.id, value);
      if (result.error) {
        setMessage(result.error);
        setVoteFailed(true);
      }
      else {
        setSelected(result.value);
        setMessage(result.value === 1 ? "Liked! Find it in My humor." : "Vote saved.");
      }
    } catch {
      setMessage("Connection interrupted. Please try again.");
      setVoteFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="caption-card">
      <CaptionPhoto image={caption.image} />
      <div className="caption-body">
        <span className="eyebrow">
          CAPTION {String(index + 1).padStart(2, "0")}
        </span>
        <h3>{caption.content}</h3>
        {ratingUnavailable ? (
          <p className="vote-gate">Refresh to load your ratings.</p>
        ) : allowed ? (
          <div className="vote-buttons" role="group" aria-label="Rate this caption" aria-busy={busy}>
            <button
              disabled={busy}
              aria-pressed={selected === 1}
              className={
                selected === 1 ? "vote-button vote-like selected" : "vote-button vote-like"
              }
              onClick={() => rate(1)}
            >
              Made me laugh
              <svg className="vote-icon" viewBox="0 0 24 24" aria-hidden="true" fill={selected === 1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
              </svg>
            </button>
            <button
              disabled={busy}
              aria-pressed={selected === -1}
              className={
                selected === -1 ? "vote-button vote-dislike selected" : "vote-button vote-dislike"
              }
              onClick={() => rate(-1)}
            >
              Not quite
              <svg className="vote-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" fill={selected === -1 ? "currentColor" : "none"} />
                <path d="M8 12h8" stroke={selected === -1 ? "#fff" : "currentColor"} />
              </svg>
            </button>
          </div>
        ) : (
          <Link className="vote-gate" href={signedIn ? "/profile" : "#join"}>
            {signedIn
              ? "Complete your profile to rate"
              : "Sign in to share your verdict"}{" "}
            &rarr;
          </Link>
        )}
        {allowed && !ratingUnavailable && (
          <p role={voteFailed ? "alert" : "status"} className={`vote-status${voteFailed ? " vote-error" : ""}`}>
            {busy ? "Saving your vote..." : message || (selected ? "Your vote is saved. You can change it anytime." : "Choose the reaction that fits.")}
          </p>
        )}
      </div>
    </article>
  );
}
export default function CaptionFeed({
  captions,
  signedIn,
  complete,
  votes,
  ratingUnavailable = false,
}: {
  captions: Caption[];
  signedIn: boolean;
  complete: boolean;
  votes: Record<string, number>;
  ratingUnavailable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const searchTerm = query.trim().toLowerCase();
  const visible = captions.filter((c) =>
    c.content.toLowerCase().includes(searchTerm),
  );
  return (
    <section id="captions" className="feed-section">
      <div className="feed-heading">
        <div>
          <span className="eyebrow">FROM AROUND CAMPUS</span>
          <h2>
            The Campus Laugh Files
            <span className="count-badge">{captions.length}</span>
          </h2>
        </div>
        <label className="search-box">
          <span className="sr-only">Search loaded captions</span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="10"
              cy="10"
              r="6"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path d="m15 15 5 5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <input
            type="search"
            placeholder="Find a caption..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {searchTerm && <p className="search-results" role="status">
        {visible.length} {visible.length === 1 ? "match" : "matches"} in {captions.length} loaded captions.
        <button type="button" className="text-link search-clear" onClick={() => setQuery("")}>Clear search</button>
      </p>}
      {visible.length ? (
        <div className="caption-grid">
          {visible.map((caption, index) => (
            <CaptionCard
              key={caption.id}
              caption={caption}
              index={index}
              signedIn={signedIn}
              allowed={signedIn && complete}
              initialVote={votes[caption.id]}
              ratingUnavailable={ratingUnavailable}
            />
          ))}
        </div>
      ) : (
        <div className="panel empty-state">
          <h3>
            {searchTerm ? "No matching captions." : "The next laugh is on its way."}
          </h3>
          <p className="muted">
            {searchTerm
              ? "Try a different search."
              : "There are no captions in the collection yet. Check back soon."}
          </p>
          {!searchTerm && <Link href="/create" className="button button-dark">Create a caption &rarr;</Link>}
        </div>
      )}
      <p className="collection-note">
        Showing up to 60 of the latest captions. Every opinion counts.
      </p>
    </section>
  );
}
