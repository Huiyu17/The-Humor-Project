"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { generateCaption } from "@/app/actions/generate";
import CaptionImageUpload, { type CaptionImage } from "./CaptionImageUpload";

export default function GenerateCaptionForm({ images }: { images: CaptionImage[] }) {
  const [imageOptions, setImageOptions] = useState(images);
  const [imageId, setImageId] = useState(images[0]?.id ?? "");
  const [context, setContext] = useState("");
  const [style, setStyle] = useState("relatable");
  const [error, setError] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const selected = imageOptions.find((image) => image.id === imageId);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || uploading) return;
    submitting.current = true;
    const data = new FormData(event.currentTarget);
    setError("");
    setCaption("");
    startTransition(async () => {
      try {
        const result = await generateCaption(data);
        if (result.error) setError(result.error);
        else if (result.content) setCaption(result.content);
      } catch {
        setError("Connection interrupted. Check the caption collection before trying again.");
      } finally {
        submitting.current = false;
      }
    });
  }

  return (
    <div className="create-layout">
      <aside className="panel create-preview">
        {selected ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected.url} alt={selected.alt_text} />
        ) : <div className="empty-state">Upload a photo to get started.</div>}
        <div className="create-preview-copy">
          <span className="eyebrow">THE SETUP</span>
          <p>{selected?.alt_text}</p>
          <p className="muted small">{selected?.storage_path
            ? "AI will look at your photo and use your scene to write the caption."
            : "This preset uses its image description and your scene to write the caption."}</p>
        </div>
      </aside>
      <section className="panel details-panel">
        <CaptionImageUpload disabled={pending} onBusyChange={setUploading} onUploaded={(image) => {
          setImageOptions((current) => [image, ...current.filter((item) => item.id !== image.id)]);
          setImageId(image.id);
          setCaption("");
          setError("");
        }} />
        <form onSubmit={submit} className="create-form" aria-busy={pending}>
          <fieldset disabled={pending || uploading}>
            <label htmlFor="imageId">1. Pick your image</label>
            <select id="imageId" name="imageId" required value={imageId} onChange={(e) => { setImageId(e.target.value); setCaption(""); }}>
              {!imageOptions.length && <option value="">Upload a photo first</option>}
              {imageOptions.map((image, index) => <option key={image.id} value={image.id}>{index + 1}. {image.alt_text || "Untitled image"}</option>)}
            </select>
            <label htmlFor="context">2. Set the scene</label>
            <textarea id="context" name="context" required minLength={5} maxLength={500} rows={5}
              value={context} onChange={(e) => setContext(e.target.value)}
              placeholder="When you leave Butler at 2 AM and still have an 8:40 class."
              aria-describedby="scene-help" />
            <p id="scene-help" className="muted small">A dorm moment, a subway surprise, or your latest campus struggle. {context.length}/500</p>
            <label htmlFor="style">3. Choose the humor</label>
            <select id="style" name="style" value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="relatable">Too relatable</option>
              <option value="deadpan">Dry &amp; deadpan</option>
              <option value="absurd">Absolutely absurd</option>
            </select>
            <p className="muted small">Your generated caption will be published to the collection for everyone to rate.</p>
            <button type="submit" className="button button-dark" disabled={pending || uploading || !selected || context.trim().length < 5}>
              {pending ? "Writing your punchline..." : "Generate & publish"}
            </button>
          </fieldset>
          {pending && <p role="status" className="muted small">This may take a few moments. Keep this page open.</p>}
          {error && <p role="alert" className="notice error">{error}</p>}
          {caption && <div role="status" className="notice success">
            <strong>Published! Your caption is ready for votes.</strong>
            <p className="generated-caption">{caption}</p>
            <Link href="/#captions" className="text-link">See it in the collection &rarr;</Link>
          </div>}
        </form>
      </section>
    </div>
  );
}
