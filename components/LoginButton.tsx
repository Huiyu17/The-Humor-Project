"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export default function LoginButton({ next }: { next?: "/create" } = {}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login() {
    setBusy(true);
    setError("");
    try {
      const callback = new URL("/auth/callback", window.location.origin);
      if (next === "/create") callback.searchParams.set("next", next);
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString() },
      });
      if (error) throw error;
    } catch {
      setError("Could not start sign-in. Please try again.");
      setBusy(false);
    }
  }
  return (
    <div className="auth-control">
      <button className="button button-dark" onClick={login} disabled={busy}>
        <span className="google-g" aria-hidden="true">
          G
        </span>
        {busy ? "Connecting..." : "Continue with Google"}
      </button>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
