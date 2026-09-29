import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import LoginButton from "@/components/LoginButton";
import CaptionFeed from "@/components/CaptionFeed";
import { createClient } from "@/lib/supabase/server";
import { getCaptions } from "@/lib/captions";
export default async function Home() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { captions, error },
  ] = await Promise.all([supabase.auth.getUser(), getCaptions()]);
  let complete = false;
  let votes: Record<string, number> = {};
  let voteError = false;
  if (user) {
    const [{ data: profile }, { data: userVotes, error: loadError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("caption_votes")
          .select("caption_id, value")
          .eq("user_id", user.id)
          .in(
            "caption_id",
            captions.length
              ? captions.map((c) => c.id)
              : ["00000000-0000-0000-0000-000000000000"],
          ),
      ]);
    complete = Boolean(
      profile?.first_name?.trim() && profile?.last_name?.trim(),
    );
    votes = Object.fromEntries(
      (userVotes ?? []).map((v) => [v.caption_id, v.value]),
    );
    voteError = Boolean(loadError);
  }
  return (
    <>
      <SiteHeader signedIn={Boolean(user)} />
      <main className="home-page">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="live-dot" /> A LITTLE LESS SERIOUS. A LOT MORE
              FUNNY.
            </span>
            <h1>
              Good image.
              <br />
              Better <span className="serif">punchline.</span>
            </h1>
            <p>
              A picture sets the scene. A caption steals the show.
              <br className="desktop-break" /> You decide what deserves a laugh.
            </p>
            <a className="button button-dark hero-cta" href="#captions">
              Explore captions <span aria-hidden="true">&darr;</span>
            </a>
            <div className="hero-note">
              <span className="mini-face" aria-hidden="true">
                :)
              </span>{" "}
              A home for people with a sense of humor.
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
            <div className="art-label">
              HUMOR IS SUBJECTIVE.
              <br />
              THAT&apos;S THE POINT.
            </div>
            <div className="smile-sticker">
              <div className="eyes">
                <i />
                <i />
              </div>
              <div className="smile" />
            </div>
            <span className="art-spark spark-one">*</span>
            <span className="art-spark spark-two">*</span>
            <div className="caption-sticker">
              Certified chuckle material.<span>YOU BE THE JUDGE &rarr;</span>
            </div>
            <span className="art-edition">
              THE HUMOR PROJECT / CAPTION CLUB
            </span>
          </div>
        </section>
        <div className="how-strip">
          <span>
            <b>01</b> Find a caption
          </span>
          <span>
            <b>02</b> Trust your funny bone
          </span>
          <span>
            <b>03</b> Make your vote count
          </span>
        </div>
        {!user ? (
          <section id="join" className="join-banner">
            <div>
              <span className="eyebrow">
                EVERYONE&apos;S A CRITIC. YOU&apos;RE INVITED.
              </span>
              <h2>Your sense of humor belongs here.</h2>
              <p>
                Browse freely. Sign in to rate captions and make the collection
                better.
              </p>
            </div>
            <LoginButton />
          </section>
        ) : !complete ? (
          <section className="join-banner">
            <div>
              <h2>One introduction before the laughs.</h2>
              <p>Add your first and last name to unlock caption rating.</p>
            </div>
            <Link href="/profile" className="button button-dark">
              Complete your profile &rarr;
            </Link>
          </section>
        ) : null}
        {error ? (
          <section id="captions" className="panel empty-state">
            <span className="eyebrow">THE CAPTION COLLECTION</span>
            <h2>We could not load the captions.</h2>
            <p className="muted">Please try again in a moment.</p>
            <Link href="/" className="button button-outline">
              Try again
            </Link>
          </section>
        ) : (
          <>
            {voteError && (
              <p role="alert" className="notice error">
                Your previous ratings could not be loaded. Refresh before rating
                again.
              </p>
            )}
            <CaptionFeed
              captions={captions}
              signedIn={Boolean(user)}
            complete={complete}
            ratingUnavailable={voteError}
              votes={votes}
            />
          </>
        )}
      </main>
      <footer className="site-footer">
        <Link className="brand" href="/">
          the humor project.
        </Link>
        <span>Serious about not being serious.</span>
        <span>Made for a good laugh.</span>
      </footer>
    </>
  );
}
