"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deleteCaption(captionId: string) {
  if (typeof captionId !== "string" || !uuid.test(captionId)) return { error: "This caption is unavailable." };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please sign in to delete your caption." };
  // Ownership is checked inside the database, including safe repeated requests.
  const { data, error } = await supabase.rpc("humor_delete_caption", { p_caption_id: captionId });
  if (error || data !== true) return { error: "Deletion could not be confirmed. Refresh or retry. You can only delete your own captions." };
  revalidatePath("/");
  revalidatePath("/my-humor");
  return { success: true };
}

export async function removeLikedCaption(captionId: string) {
  if (typeof captionId !== "string" || !uuid.test(captionId)) return { error: "This caption is unavailable." };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please sign in to manage your likes." };
  const { error } = await supabase.from("caption_votes").delete()
    .eq("user_id", user.id).eq("caption_id", captionId).eq("value", 1);
  if (error) {
    // Log only a diagnostic code, never user/session details or the raw response.
    const code = /^[A-Z0-9]{5,12}$/.test(error.code ?? "") ? error.code : "UNKNOWN";
    console.error("[my-humor/remove-like] database request rejected", { code });
    if (code === "42501") {
      return { error: "The database denied permission to remove this like. Please ask the app owner to check the like-removal permissions. Your vote has not been changed. (Code: 42501)" };
    }
    if (code === "PGRST301" || code === "PGRST303") {
      return { error: "Your sign-in session is no longer valid. Please sign in again before removing this like." };
    }
    return { error: `We couldn't confirm removal of this like. Refresh to check its current state before retrying. If this continues, share this code with the app owner: ${code}.` };
  }
  revalidatePath("/");
  revalidatePath("/my-humor");
  return { success: true };
}

export async function restoreCaption(captionId: string) {
  if (typeof captionId !== "string" || !uuid.test(captionId)) return { error: "This caption is unavailable." };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please sign in to restore your caption." };
  // Ownership is checked inside the database; restoring twice is a safe no-op.
  const { data, error } = await supabase.rpc("humor_restore_caption", { p_caption_id: captionId });
  if (error || data !== true) {
    const code = /^[A-Z0-9]{5,12}$/.test(error?.code ?? "") ? error!.code : "UNKNOWN";
    if (code === "PGRST202") return { error: "Restore isn't set up yet. Ask the app owner to run supabase/010_trash_and_restore.sql. (Code: PGRST202)" };
    if (error?.message?.includes("moderator")) return { error: "A moderator removed this caption, so only a moderator can restore it." };
    return { error: "Restore could not be confirmed. Refresh to check, then retry. You can only restore your own captions." };
  }
  revalidatePath("/");
  revalidatePath("/my-humor");
  return { success: true };
}
