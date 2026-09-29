"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export async function saveProfile(firstName: string, lastName: string) {
  if (
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    !firstName.trim() ||
    !lastName.trim() ||
    firstName.trim().length > 80 ||
    lastName.trim().length > 80
  )
    return { error: "Enter both names, using at most 80 characters each." };
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return { error: "Please sign in again before saving." };
  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("id")
    .single();
  if (error || !data)
    return {
      error:
        "Your profile could not be saved. Please try again or contact the site owner.",
    };
  revalidatePath("/profile");
  revalidatePath("/");
  return { success: true };
}
