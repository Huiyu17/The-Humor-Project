import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import LoginButton from "@/components/LoginButton";
import MyHumorLibrary from "@/components/MyHumorLibrary";
import { createClient } from "@/lib/supabase/server";
import type { Caption } from "@/lib/captions";

export const metadata = { title: "My humor | Columbia Chuckles" };
const pageSize = 12;

export default async function MyHumorPage({ searchParams }: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "liked" ? "liked" : "published";
  const rawPage = Number(params.page ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 100000) : 1;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <>
    <SiteHeader active="my-humor" />
    <main className="narrow-page panel empty-state">
      <span className="eyebrow">YOUR PERSONAL COLLECTION</span>
      <h1>Keep your humor close.</h1>
      <p className="muted">Sign in to find your published captions and the ones that made you laugh.</p>
      <LoginButton next="/my-humor" />
      <Link href="/" className="text-link">Back to Explore &rarr;</Link>
    </main>
  </>;

  const start = (page - 1) * pageSize;
  const [published, liked] = await Promise.all([
    supabase.from("captions")
      .select("id, content, created_at, image:images(url, alt_text), generation:generations!inner(user_id)", { count: "exact" })
      .eq("generation.user_id", user.id)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(view === "published" ? start : 0, view === "published" ? start + pageSize - 1 : 0),
    supabase.from("caption_votes")
      .select("caption:captions!inner(id, content, created_at, image:images(url, alt_text))", { count: "exact" })
      .eq("user_id", user.id).eq("value", 1)
      .order("updated_at", { ascending: false }).order("caption_id", { ascending: false })
      .range(view === "liked" ? start : 0, view === "liked" ? start + pageSize - 1 : 0),
  ]);
  // Only caption fields cross the client boundary; private generation prompts never do.
  const publishedCaptions = (published.data ?? []).map(({ id, content, created_at, image }) => ({ id, content, created_at, image })) as unknown as Caption[];
  const likedCaptions = (liked.data ?? []).map((row) => row.caption) as unknown as Caption[];
  return <>
    <SiteHeader signedIn active="my-humor" />
    <main className="humor-page">
      <div className="page-heading humor-heading">
        <div><span className="eyebrow">YOUR PERSONAL COLLECTION</span>
          <h1>My <span className="serif">humor.</span></h1>
          <p className="muted">The captions you shared. The ones you keep coming back to.</p>
        </div>
      </div>
      <MyHumorLibrary key={`${view}-${page}`} view={view} page={page} pageSize={pageSize}
        captions={view === "published" ? publishedCaptions : likedCaptions}
        publishedCount={published.error ? null : published.count ?? 0}
        likedCount={liked.error ? null : liked.count ?? 0}
        loadFailed={Boolean(view === "published" ? published.error : liked.error)} />
    </main>
  </>;
}
