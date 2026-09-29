import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import AvatarUpload from "@/components/AvatarUpload";
import SiteHeader from "@/components/SiteHeader";
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const complete = profile?.first_name?.trim() && profile?.last_name?.trim();
  return (
    <>
      <SiteHeader signedIn active="profile" />
      <main className="profile-page">
        <Link href="/" className="text-link muted">
          Back to captions
        </Link>
        <div className="page-heading">
          <span className="eyebrow">YOUR LITTLE CORNER</span>
          <h1>
            Make yourself <span className="serif">known.</span>
          </h1>
          <p className="muted">Good taste in humor. A face to go with it.</p>
        </div>
        {!complete && (
          <div className="notice onboarding">
            <strong>Welcome to the club.</strong> Add your first and last name
            to start rating captions.
          </div>
        )}
        {error || !profile ? (
          <div role="alert" className="notice error">
            We could not load your profile. Please try refreshing. If this
            continues, contact the site owner.
          </div>
        ) : (
          <div className="profile-layout">
            <aside className="panel photo-panel">
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={profile.avatar_url}
              />
              <span className="member-badge">THE HUMOR PROJECT MEMBER</span>
            </aside>
            <section className="panel details-panel">
              <div className="section-heading">
                <div>
                  <h2>Personal details</h2>
                  <p className="muted small">
                    The person behind the punchline.
                  </p>
                </div>
                <span className="pill">
                  {complete ? "Profile complete" : "One more step"}
                </span>
              </div>
              <ProfileForm
                initialFirstName={profile.first_name}
                initialLastName={profile.last_name}
              />
              <div className="account-detail">
                <span className="eyebrow">CONNECTED ACCOUNT</span>
                <p>{user.email}</p>
                <span className="muted small">Signed in with Google</span>
              </div>
            </section>
          </div>
        )}
        <p className="profile-footnote">
          A good caption is better with an audience. Glad you are here.
        </p>
      </main>
    </>
  );
}
