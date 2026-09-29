import Link from "next/link";
import LoginButton from "@/components/LoginButton";
import SiteHeader from "@/components/SiteHeader";
export default function AuthError() {
  return (
    <>
      <SiteHeader />
      <main className="narrow-page">
        <div className="panel empty-state">
          <span className="eyebrow">LET US TRY THAT AGAIN</span>
          <h1>Sign-in did not finish.</h1>
          <p>
            Your sign-in link may have expired, or access was cancelled. Start
            again in the same browser.
          </p>
          <LoginButton />
          <Link className="text-link" href="/">
            Back to captions
          </Link>
        </div>
      </main>
    </>
  );
}
