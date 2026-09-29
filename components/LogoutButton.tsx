"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true);
    setError("");
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      router.replace("/");
      router.refresh();
      setBusy(false);
    } catch {
      setError("Could not log out. Try again.");
      setBusy(false);
    }
  }
  return (
    <div className="auth-control">
      <button
        className="button button-outline"
        onClick={logout}
        disabled={busy}
      >
        {busy ? "Logging out..." : "Log out"}
      </button>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
