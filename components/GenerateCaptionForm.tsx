"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { generateCaption, publishCaption } from "@/app/actions/generate";
import CaptionImageUpload, { type CaptionImage, type PendingPhoto } from "./CaptionImageUpload";

export default function GenerateCaptionForm({ images }: { images: CaptionImage[] }) {
  const [imageOptions, setImageOptions] = useState(images);
  const [imageId, setImageId] = useState(images[0]?.id ?? "");
  const [category, setCategory] = useState<"samples" | "mine">(
    images.some((image) => image.user_id === null) ? "samples" : "mine",
  );
  const [context, setContext] = useState("");
  const [style, setStyle] = useState("relatable");
  const [error, setError] = useState("");
  const [sceneError, setSceneError] = useState("");
  const sceneInput = useRef<HTMLTextAreaElement>(null);
  const [caption, setCaption] = useState("");
  const [generationId, setGenerationId] = useState("");
  const [published, setPublished] = useState(false);
  const [operation, setOperation] = useState<"generate" | "publish">("generate");
  const [uploading, setUploading] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (generationId) {
      resultHeading.current?.focus({ preventScroll: true });
      resultHeading.current?.scrollIntoView({ block: "nearest" });
    }
  }, [generationId]);
  const selected = imageOptions.find((image) => image.id === imageId);
  const visibleImages = imageOptions.filter((image) =>
    category === "samples" ? image.user_id === null : image.user_id !== null,
  );

  function changeCategory(value: "samples" | "mine") {
    setCategory(value);
    const options = imageOptions.filter((image) => value === "samples"
      ? image.user_id === null : image.user_id !== null);
    if (!options.some((image) => image.id === imageId)) {
      setImageId(options[0]?.id ?? "");
      setCaption("");
      setError("");
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || uploading) return;
    if (!selected) {
      setError("Choose a sample photo or upload your own photo first.");
      return;
    }
    if (context.trim().length < 5 || context.trim().length > 500) {
      setSceneError("Describe your scene in 5–500 characters, excluding spaces at the beginning and end. For example: When finals are finally over.");
      sceneInput.current?.focus();
      return;
    }
    setSceneError("");
    submitting.current = true;
    const data = new FormData(event.currentTarget);
    setError("");
    setOperation("generate");
    startTransition(async () => {
      try {
        const result = await generateCaption(data);
        if (result.error) setError(result.error);
        else if (result.content && result.generationId) {
          setCaption(result.content);
          setGenerationId(result.generationId);
          setPublished(false);
        }
      } catch {
        setError("We lost the response from the server, so we couldn't confirm a new preview. Check your connection, wait about 15 seconds, then try again. Nothing new has been published.");
      } finally {
        submitting.current = false;
      }
    });
  }

  function publish() {
    if (submitting.current || uploading || !generationId || published) return;
    submitting.current = true;
    setOperation("publish");
    setError("");
    startTransition(async () => {
      try {
        const result = await publishCaption(generationId);
        if (result.error) setError(result.error);
        else if (result.captionId) setPublished(true);
      } catch {
        setError("Connection interrupted. Retry Publish to confirm; it will not create a duplicate.");
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
          <span className="eyebrow">{selected ? selected.user_id === null ? "SAMPLE PHOTO" : "MY PHOTO" : "YOUR PHOTO PREVIEW"}</span>
          <p>{selected?.alt_text}</p>
          <p className="muted small">{selected?.storage_path
            ? "AI will look at your photo and use your scene to write the caption."
            : selected ? "This sample uses its image description and your scene to write the caption." : "Choose a photo from the library to see it here."}</p>
        </div>
      </aside>
      <section className="panel details-panel">
        <section className="photo-picker" aria-labelledby="photo-picker-heading">
          <h2 id="photo-picker-heading">1. Choose your photo</h2>
          <p className="muted small">Use a sample or your own upload. Photos shared by other people are available to browse in Explore.</p>
          <div className="photo-categories" role="group" aria-label="Photo source">
            <button type="button" aria-pressed={category === "samples"} disabled={pending || uploading}
              onClick={() => changeCategory("samples")}>Sample photos <span>{imageOptions.filter((image) => image.user_id === null).length}</span></button>
            <button type="button" aria-pressed={category === "mine"} disabled={pending || uploading}
              onClick={() => changeCategory("mine")}>My photos <span>{imageOptions.filter((image) => image.user_id !== null).length}</span></button>
          </div>
          <p className="muted small">{category === "samples" ? "A collection provided for everyone to create with." : "Your latest uploads, ready for another caption."}</p>
          {visibleImages.length || (category === "mine" && pendingPhoto) ? <div className="photo-grid" role="group" aria-label={category === "samples" ? "Sample photos" : "My photos"}>
            {category === "mine" && pendingPhoto && <div className="photo-option photo-pending">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingPhoto.url} alt={`Local preview: ${pendingPhoto.name}`} />
              <span className="photo-option-caption">{pendingPhoto.name}<span className="photo-pending-help">Upload to use this photo.</span></span>
              <span className="photo-selected photo-pending-badge" role="status">{uploading ? "Uploading..." : "Pending upload"}</span>
            </div>}
            {visibleImages.map((image) => <button type="button" key={image.id} className="photo-option"
              aria-pressed={imageId === image.id} disabled={pending || uploading}
              onClick={() => { setImageId(image.id); setCaption(""); setError(""); }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" loading="lazy" />
              <span className="photo-option-caption">{image.alt_text || "Untitled photo"}</span>
              {imageId === image.id && <span className="photo-selected" aria-hidden="true">✓ Selected</span>}
            </button>)}
          </div> : <div className="photo-empty"><strong>{category === "mine" ? "Your photo collection starts here." : "No sample photos yet."}</strong>
            <p className="muted small">{category === "mine" ? "Upload your first photo below to get started." : "Switch to My photos to upload a photo of your own."}</p></div>}
        <div hidden={category !== "mine"}>
        <CaptionImageUpload disabled={pending || category !== "mine"} onBusyChange={setUploading} onPreviewChange={setPendingPhoto} onUploaded={(image) => {
          setPendingPhoto(null);
          setImageOptions((current) => [image, ...current.filter((item) => item.id !== image.id)]);
          setImageId(image.id);
          setCaption("");
          setError("");
        }} />
        </div>
        </section>
        <form id="caption-form" onSubmit={submit} className="create-form" aria-busy={pending} noValidate>
          <fieldset disabled={pending || uploading}>
            <input type="hidden" name="imageId" value={imageId} />
            <label htmlFor="context">2. Set the scene</label>
            <textarea ref={sceneInput} id="context" name="context" required minLength={5} maxLength={500} rows={3}
              value={context} onChange={(e) => { setContext(e.target.value); setCaption(""); setError(""); setSceneError(""); }}
              placeholder="When you leave Butler at 2 AM and still have an 8:40 class."
              aria-invalid={!!sceneError} aria-describedby={sceneError ? "scene-help scene-error" : "scene-help"} />
            <p id="scene-help" className="muted small">Describe a dorm moment, a subway surprise, or your latest campus struggle. Use 5–500 characters. {context.trim().length}/500</p>
            {sceneError && <p id="scene-error" role="alert" className="notice error">{sceneError}</p>}
            <label htmlFor="style">3. Choose the humor</label>
            <select id="style" name="style" value={style} onChange={(e) => { setStyle(e.target.value); setCaption(""); setError(""); }}>
              <option value="relatable">Too relatable</option>
              <option value="deadpan">Dry &amp; deadpan</option>
              <option value="absurd">Absolutely absurd</option>
            </select>
            <p className="muted small">Preview your caption first. It only appears in Explore when you choose Publish.</p>
            {(!caption || published) && <button type="submit" className="button button-dark" disabled={pending || uploading}>
              {pending && operation === "generate" ? "Writing your punchline..." : "Generate caption"}
            </button>}
          </fieldset>
          {uploading && <p role="status" className="muted small">Uploading your photo. You can generate a caption when the upload finishes.</p>}
          {pending && <p role="status" className="muted small">{operation === "publish" ? "Publishing your caption..." : "Writing your preview. This may take a few moments."}</p>}
          {error && !caption && <div role="alert" className="notice generation-notice"><strong>Caption could not be generated</strong><p>{error}</p><p className="small">Your photo and scene are still here.</p></div>}
        </form>
      </section>
      <section className="panel caption-result" aria-labelledby="caption-result-heading" aria-busy={pending}>
            <div className="caption-result-header">
              <h2 id="caption-result-heading" ref={resultHeading} tabIndex={-1}>Caption preview</h2>
              <span className="caption-status" role="status">{pending ? operation === "publish" ? "Publishing..." : "Writing..." : caption ? published ? "Published" : "Not published" : "Awaiting caption"}</span>
            </div>
          {caption ? <>
            <p className="generated-caption">{caption}</p>
            {published ? <div role="status"><p className="muted small">Your caption is published and ready for votes.</p><Link href="/#captions" className="text-link">View in Explore &rarr;</Link></div> : <>
              <p className="muted small">Only you can see this caption. Publish it to Explore when you’re happy with it, or try another version.</p>
              <div className="caption-result-actions">
              <button type="button" className="button button-dark" disabled={pending || uploading} onClick={publish}>
                {pending && operation === "publish" ? "Publishing..." : "Publish caption"}
              </button>
              <button type="submit" form="caption-form" className="button button-outline" disabled={pending || uploading}>
                {pending && operation === "generate" ? "Writing your punchline..." : "Try another caption"}
              </button>
              </div>
            </>}
          </> : <p className="muted caption-placeholder">{pending ? "Writing your preview. This may take a few moments." : "Your punchline goes here. Set the scene and select Generate caption to see your preview."}</p>}
          {error && caption && <div role="alert" className={`notice ${operation === "generate" ? "generation-notice" : "error"}`}>
            <strong>{operation === "generate" ? "Your current preview is still here" : "Publication needs another try"}</strong>
            <p>{error}</p>
            {operation === "generate" && <p className="small">Your current preview has not changed. You can still publish it.</p>}
          </div>}
      </section>
    </div>
  );
}
