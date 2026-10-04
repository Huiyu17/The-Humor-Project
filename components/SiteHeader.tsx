import Link from "next/link";
import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";
export default function SiteHeader({
  signedIn = false,
  active = "explore",
}: {
  signedIn?: boolean;
  active?: "explore" | "profile" | "create";
}) {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark">
          h<span>!</span>
        </span>
        the humor project<span className="brand-dot">.</span>
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
