import Link from "next/link";
import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";
export default function SiteHeader({
  signedIn = false,
  active = "explore",
}: {
  signedIn?: boolean;
  active?: "explore" | "profile" | "create" | "my-humor";
}) {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden="true">
          c<span>!</span>
        </span>
        Columbia Chuckles<span className="brand-dot">.</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link
          href="/"
          className={active === "explore" ? "nav-link active" : "nav-link"}
        >
          Explore captions
        </Link>
        {signedIn ? (
          <>
            <Link href="/create" className={active === "create" ? "nav-link active" : "nav-link"}>
              Create a caption
            </Link>
            <Link
              href="/my-humor"
              className={active === "my-humor" ? "nav-link active" : "nav-link"}
            >
              My humor
            </Link>
            <Link
              href="/profile"
              className={active === "profile" ? "nav-link active" : "nav-link"}
            >
              My profile
            </Link>
            <LogoutButton />
          </>
        ) : (
          <LoginButton />
        )}
      </nav>
    </header>
  );
}
