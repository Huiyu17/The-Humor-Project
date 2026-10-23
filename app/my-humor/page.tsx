import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import LoginButton from "@/components/LoginButton";
import MyHumorLibrary, { type HumorView, type LibraryCaption } from "@/components/MyHumorLibrary";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My humor | Columbia Chuckles" };
const pageSize = 12;

type TrashRow = {
  id: string; content: string; created_at: string; deleted_at: string;
  image_url: string | null; image_alt: string | null; removed_by_admin?: boolean; total_count: number;
};

export default async function MyHumorPage({ searchParams }: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const params = await searchParams;
  const view: HumorView = params.view === "liked" ? "liked" : params.view === "trash" ? "trash" : "published";
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
  const [published, liked, trashCount, trashPage] = await Promise.all([
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
    // Withdrawn captions are hidden by RLS; this owner-checked function lists them.
    supabase.rpc("humor_list_trash", { p_limit: 1, p_offset: 0 }),
    view === "trash"
      ? supabase.rpc("humor_list_trash", { p_limit: pageSize, p_offset: start })
      : Promise.resolve({ data: [] as TrashRow[], error: null }),
  ]);

  // Only caption fields cross the client boundary; private generation prompts never do.
  const publishedCaptions = (published.data ?? []).map(({ id, content, created_at, image }) => ({ id, content, created_at, image })) as unknown as LibraryCaption[];
  const likedCaptions = (liked.data ?? []).map((row) => row.caption) as unknown as LibraryCaption[];
  const trashCaptions: LibraryCaption[] = ((trashPage.data ?? []) as TrashRow[]).map((row) => ({
    id: row.id, content: row.content, created_at: row.created_at, deleted_at: row.deleted_at,
    image: row.image_url ? { url: row.image_url, alt_text: row.image_alt ?? "" } : null,
    removed_by_admin: Boolean(row.removed_by_admin),
  }));
  const trashTotal = trashCount.error ? null : Number(((trashCount.data ?? []) as TrashRow[])[0]?.total_count ?? 0);

  const captions = view === "published" ? publishedCaptions : view === "liked" ? likedCaptions : trashCaptions;
  const loadFailed = Boolean(view === "published" ? published.error : view === "liked" ? liked.error : trashPage.error);

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
        captions={captions}
        publishedCount={published.error ? null : published.count ?? 0}
        likedCount={liked.error ? null : liked.count ?? 0}
        trashCount={trashTotal}
        loadFailed={loadFailed} />
    </main>
  </>;
}
