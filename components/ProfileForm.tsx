"use client";
import { useState } from "react";
import Link from "next/link";
import { saveProfile } from "@/app/profile/actions";
export default function ProfileForm({
  initialFirstName,
  initialLastName,
}: {
  initialFirstName: string | null;
  initialLastName: string | null;
}) {
  const [firstName, setFirstName] = useState(initialFirstName ?? "");
  const [lastName, setLastName] = useState(initialLastName ?? "");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setSaved(false);
    try {
      const result = await saveProfile(firstName, lastName);
      if (result.error) setMessage(result.error);
      else {
        setSaved(true);
        setMessage("All saved. You are ready to rate captions.");
      }
    } catch {
      setMessage("Could not connect. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="profile-form">
      <div className="form-grid">
        <label htmlFor="firstName">
          First name
          <input
            id="firstName"
            autoComplete="given-name"
            required
            maxLength={80}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Your first name"
          />
        </label>
        <label htmlFor="lastName">
          Last name
          <input
            id="lastName"
            autoComplete="family-name"
            required
            maxLength={80}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Your last name"
          />
        </label>
      </div>
      <p className="muted small">
        A little introduction before you join the fun.
      </p>
      <div className="form-actions">
        <button disabled={saving} className="button button-dark">
          {saving ? "Saving..." : "Save changes"}
        </button>
        {saved && (
          <Link href="/" className="text-link">
            Explore captions
          </Link>
        )}
      </div>
      {message && (
        <p role="status" className={saved ? "notice success" : "notice error"}>
          {message}
        </p>
      )}
    </form>
  );
}
