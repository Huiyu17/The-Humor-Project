"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export default function AvatarUpload({
  userId,
  currentAvatarUrl,
}: {
  userId: string;
  currentAvatarUrl: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [failed, setFailed] = useState(false);
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    if (!extensions[file.type] || file.size > 2 * 1024 * 1024) {
      setMessage("Choose a JPG, PNG, or WebP image under 2 MB.");
      event.target.value = "";
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.id !== userId)
        throw new Error("Please sign in again before uploading.");
      const path = `${user.id}/avatar-${crypto.randomUUID()}.${extensions[file.type]}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError)
        throw new Error(
          "Photo upload failed. Please try again or contact the site owner.",
        );
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      const { data, error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .select("id")
        .single();
      if (error || !data) {
        await supabase.storage.from("avatars").remove([path]);
        throw new Error(
          "Your photo could not be saved to your profile. Please try again.",
        );
      }
      setAvatarUrl(publicUrl);
      setFailed(false);
      setMessage("Your new photo is saved.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not upload. Please try again.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }
  return (
    <div className="avatar-editor">
      {avatarUrl && !failed ? (
        <>
          {/* User-uploaded URLs are dynamic; render without the image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="avatar"
            src={avatarUrl}
            alt="Your profile photo"
            onError={() => setFailed(true)}
          />
        </>
      ) : (
        <div
          className="avatar avatar-placeholder"
          aria-label="No profile photo"
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="36"
              cy="25"
              r="12"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M13 61c0-14 10-22 23-22s23 8 23 22"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
      <h2>Profile photo</h2>
      <p className="muted small">Put a face to your funny side.</p>
      <label className="upload-label" htmlFor="avatar">
        {uploading ? "Uploading..." : "Choose a photo"}
        <input
          id="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={upload}
          disabled={uploading}
        />
      </label>
      <p className="muted fine">JPG, PNG or WebP. Up to 2 MB.</p>
      {message && (
        <p role="status" className="small">
          {message}
        </p>
      )}
    </div>
  );
}
