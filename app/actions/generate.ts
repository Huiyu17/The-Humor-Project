"use server";

import { GoogleGenAI } from "@google/genai";
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generationErrorMessage } from "@/lib/generation-error";
import { buildCaptionPrompt, captionProblem, jokeAngles, type HumorStyle } from "@/lib/caption-prompt";

const styles = ["relatable", "deadpan", "absurd"] as const;

export async function generateCaption(formData: FormData) {
  const imageId = formData.get("imageId");
  const context = formData.get("context");
  const style = formData.get("style");

  if (
    typeof imageId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageId) ||
    typeof context !== "string" ||
    context.trim().length < 5 ||
    context.trim().length > 500 ||
    typeof style !== "string" ||
    !styles.some((option) => option === style)
  ) {
    return { error: "Choose an image and style, and describe your scene in 5–500 characters." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please sign in to generate a caption." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return { error: "Your profile could not be loaded. Please sign in again." };
  }

  const { data: image, error: imageError } = await supabase
    .from("images")
    .select("id, alt_text, user_id, storage_path")
    .eq("id", imageId)
    .single();
  if (imageError || !image) return { error: "That image is unavailable. Please choose another." };
  if (image.user_id && image.user_id !== user.id) {
    return { error: "Choose a preset or a photo you uploaded yourself." };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: "Caption generation is not configured yet." };
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  let photo: { type: "image"; data: string; mime_type: "image/jpeg" | "image/png" | "image/webp" } | undefined;
  if (image.storage_path) {
    if (!image.user_id || !image.storage_path.startsWith(`${user.id}/`)) {
      return { error: "This photo's storage path is invalid. Please upload it again." };
    }
    try {
      // Download only from our configured bucket, never an arbitrary user-supplied URL.
      const { data: blob, error: downloadError } = await supabase.storage
        .from("caption-images").download(image.storage_path);
      if (downloadError || !blob || blob.size === 0 || blob.size > 5 * 1024 * 1024) {
        return { error: "Your photo could not be read. Upload a JPG, PNG, or WebP up to 5 MB." };
      }
      const bytes = Buffer.from(await blob.arrayBuffer());
      const mime = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "image/jpeg"
        : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "image/png"
        : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "image/webp"
        : null;
      if (!mime) return { error: "This file is not a supported photo. Please upload a JPG, PNG, or WebP." };
      photo = { type: "image", data: bytes.toString("base64"), mime_type: mime };
    } catch {
      return { error: "The photo download was interrupted. Please try again." };
    }
  }

  // Include only this user's recent previews, never another user's private drafts.
  // This is optional context: a history-read failure must not block creation.
  const { data: recent, error: historyError } = await supabase.from("generations")
    .select("generated_content").eq("user_id", user.id)
    .not("generated_content", "is", null)
    .order("created_at", { ascending: false }).limit(8);
  const recentCaptions = historyError ? [] : (recent ?? [])
    .map((row) => row.generated_content)
    .filter((text): text is string => typeof text === "string" && text.length > 0);
  // Save the exact prompt, including the selected angle, for later evaluation.
  const prompt = buildCaptionPrompt({
    style: style as HumorStyle, scene: context, imageDescription: image.alt_text,
    hasPhoto: Boolean(photo), recentCaptions,
    angle: jokeAngles[randomInt(jokeAngles.length)],
  });

  let content: string;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.interactions.create(
      { model, input: photo ? [{ type: "text", text: prompt }, photo] : prompt, store: false },
      { timeout: 45_000, retries: { strategy: "none" } },
    );
    content = result.output_text?.trim() ?? "";
    const problem = captionProblem(content, recentCaptions);
    if (problem === "length") return { error: "The AI didn't return a short, usable caption this time. Try another version; your photo and scene are still here." };
    if (problem === "duplicate") return { error: "That result repeated one of your recent captions. Try another version for a fresh take. Nothing new has been published." };
  } catch (error) {
    return { error: generationErrorMessage(error) };
  }

  const { data: draft, error: saveError } = await supabase.from("generations")
    .insert({ user_id: user.id, image_id: image.id, user_input: context.trim(),
      prompt, model, generated_content: content })
    .select("id").single();
  if (saveError || !draft) {
    return { error: "Your preview could not be saved. Nothing has been published. Please try again." };
  }

  return { generationId: draft.id as string, content };
}

export async function publishCaption(generationId: string) {
  if (typeof generationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(generationId)) {
    return { error: "Generate a preview before publishing." };
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please sign in to publish your caption." };
  // The RPC reads the saved text, verifies ownership and makes retries idempotent.
  const { data: captionId, error } = await supabase.rpc("humor_publish_preview", {
    p_generation_id: generationId,
  });
  if (error || typeof captionId !== "string") {
    return { error: "Publishing could not be confirmed. You can retry Publish safely." };
  }

  revalidatePath("/");
  revalidatePath("/my-humor");
  return { captionId };
}
