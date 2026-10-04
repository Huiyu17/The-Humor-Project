import Link from "next/link";
import LoginButton from "@/components/LoginButton";
import SiteHeader from "@/components/SiteHeader";
import GenerateCaptionForm from "@/components/GenerateCaptionForm";
import { createClient } from "@/lib/supabase/server";

export default async function CreatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <>
        <SiteHeader />
        <main className="narrow-page">
          <section className="panel empty-state">
            <span className="eyebrow">YOUR NEXT PUNCHLINE STARTS HERE</span>
            <h1>Sign in to create a caption.</h1>
            <p className="muted">Turn a campus moment into an AI caption and let the community rate it. After signing in, you will return here to create.</p>
            <LoginButton next="/create" />
            <Link href="/#captions" className="text-link">Explore captions first &rarr;</Link>
          </section>
        </main>
      </>
    );
  }

  const { data: images, error } = await supabase
    .from("images")
    .select("id, url, alt_text, storage_path")
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <>
      <SiteHeader signedIn active="create" />
      <main className="profile-page">
        <Link href="/" className="text-link muted">Back to captions</Link>
        <div className="page-heading">
          <span className="eyebrow">YOUR SCENE. AI&apos;S PUNCHLINE.</span>
          <h1>Make campus life <span className="serif">caption-worthy.</span></h1>
          <p className="muted">Pick a preset or upload your own photo, set the scene, and turn your NYC moment into a caption.</p>
        </div>
        {error ? (
          <div role="alert" className="notice error">Images could not be loaded. Please refresh to try again.</div>
        ) : <GenerateCaptionForm images={images ?? []} />}
      </main>
    </>
  );
}
