import { createClient } from "@/lib/supabase/server";
export type Caption = {
  id: string;
  content: string;
  created_at: string;
  image: { url: string; alt_text: string } | null;
};
export async function getCaptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("captions")
    .select("id, content, created_at, image:images(url, alt_text)")
    .order("created_at", { ascending: false })
    .limit(60);
  return {
    captions: (data ?? []) as unknown as Caption[],
    error: Boolean(error),
  };
}
