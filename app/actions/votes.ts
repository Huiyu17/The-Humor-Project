"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export async function vote(captionId: string, value: number) {
  if (
    typeof captionId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(captionId) ||
    ![1, -1].includes(value)
  )
    return { error: "Invalid vote." };
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Please sign in to vote." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.first_name?.trim() || !profile?.last_name?.trim())
    return { error: "Complete your name in My profile before voting." };
  const { data, error } = await supabase
    .from("caption_votes")
    .upsert(
      {
        caption_id: captionId,
        user_id: user.id,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,caption_id" },
    )
    .select("value")
    .single();
  if (error || !data)
    return { error: "Your vote was not saved. Please try again." };
  revalidatePath("/");
  return { value: data.value as number };
}
