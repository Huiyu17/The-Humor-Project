"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type CaptionImage = {
  id: string;
  url: string;
  alt_text: string;
  storage_path: string | null;
};

export default function CaptionImageUpload({ onUploaded, onBusyChange, disabled }: {
  onUploaded: (image: CaptionImage) => void;
  onBusyChange: (busy: boolean) => void;
  disabled: boolean;
}) {
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const uploading = useRef(false);
  // Retain the path after a metadata failure so retrying does not upload another file.
  const uploaded = useRef<{ path: string; userId: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading.current || disabled) return;
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    };
    if (!file || !extensions[file.type] || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setFailed(true);
      setMessage("Choose a JPG, PNG, or WebP image up to 5 MB.");
      return;
    }
    if (!description.trim() || description.trim().length > 300) {
      setFailed(true);
      setMessage("Add a short image description (up to 300 characters).");
      return;
    }
    uploading.current = true;
    setBusy(true);
    onBusyChange(true);
    setMessage("");
    setFailed(false);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Please sign in again before uploading.");
      if (uploaded.current && uploaded.current.userId !== user.id) uploaded.current = null;
      if (!uploaded.current) {
        const path = `${user.id}/${crypto.randomUUID()}.${extensions[file.type]}`;
        const { error } = await supabase.storage.from("caption-images")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw new Error("Photo upload failed. Check your connection and try again.");
        uploaded.current = { path, userId: user.id };
      }
      const path = uploaded.current.path;
      const { data: { publicUrl } } = supabase.storage.from("caption-images").getPublicUrl(path);
      // Recover a completed metadata write if its response was interrupted.
      const { data: existing, error: lookupError } = await supabase.from("images")
        .select("id, url, alt_text, storage_path").eq("user_id", user.id)
        .eq("storage_path", path).maybeSingle();
      if (lookupError) throw new Error("Photo uploaded, but its record could not be checked. Click Upload photo to retry.");
      let image = existing;
      if (!image) {
        const { data, error } = await supabase.from("images")
          .insert({ url: publicUrl, alt_text: description.trim(), user_id: user.id, storage_path: path })
          .select("id, url, alt_text, storage_path").single();
        if (error || !data) throw new Error("Photo uploaded, but its record could not be saved. Click Upload photo to retry.");
        image = data;
      }
      onUploaded(image as CaptionImage);
      uploaded.current = null;
      setFile(null);
      setDescription("");
      if (fileInput.current) fileInput.current.value = "";
      setMessage("Photo saved and selected. Add your scene below to generate a caption.");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Upload interrupted. Please try again.");
    } finally {
      uploading.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <details className="caption-upload">
      <summary>Or upload your own photo</summary>
      <form className="create-form" onSubmit={upload} aria-busy={busy}>
        <fieldset disabled={disabled || busy}>
          <label htmlFor="caption-photo">Choose a photo</label>
          <input ref={fileInput} id="caption-photo" type="file" accept="image/jpeg,image/png,image/webp" required
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); uploaded.current = null; setMessage(""); }} />
          <p className="muted small">JPG, PNG or WebP, up to 5 MB. Uploaded photos are accessible by public link. AI will receive your photo when you generate a caption.</p>
          <label htmlFor="photo-description">Describe the photo</label>
          <input id="photo-description" type="text" required maxLength={300} value={description}
            onChange={(e) => setDescription(e.target.value)} placeholder="A squirrel holding a bagel on campus" />
          <p className="muted small">A short description helps people using screen readers.</p>
          <button className="button button-outline" type="submit" disabled={disabled || busy || !file || !description.trim()}>
            {busy ? "Uploading photo..." : "Upload photo"}
          </button>
        </fieldset>
        {message && <p role={failed ? "alert" : "status"} className={`notice ${failed ? "error" : "success"}`}>{message}</p>}
      </form>
    </details>
  );
}
