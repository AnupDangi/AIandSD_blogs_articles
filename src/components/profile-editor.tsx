"use client";

import { useEffect, useState } from "react";

type Profile = { displayName: string | null; bio: string | null; updatedAt: string };
type LoadState = "loading" | "guest" | "error" | "ready";
type SaveState = "idle" | "saving" | "saved" | "error";

export function ProfileEditor({ signedIn }: { signedIn: boolean }) {
  const [load, setLoad] = useState<LoadState>(signedIn ? "loading" : "guest");
  const [attempt, setAttempt] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [save, setSave] = useState<SaveState>("idle");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me/profile", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) return { kind: "guest" as const };
        if (!response.ok) return { kind: "error" as const };
        const data = await response.json() as { profile: Profile | null };
        return { kind: "ready" as const, profile: data.profile };
      })
      .catch(() => ({ kind: "error" as const }))
      .then((next) => {
        if (controller.signal.aborted) return;
        if (next.kind === "ready") {
          setProfile(next.profile);
          setDisplayName(next.profile?.displayName ?? "");
          setBio(next.profile?.bio ?? "");
          setSave("idle");
          setLoad("ready");
          return;
        }
        if (next.kind === "guest" || (next.kind === "error" && !signedIn)) {
          setLoad("guest");
          return;
        }
        setLoad("error");
      });
    return () => controller.abort();
  }, [signedIn, attempt]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSave("saving");
    try {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: displayName.slice(0, 80), bio: bio.slice(0, 400) }),
      });
      if (response.status === 401) { setSave("idle"); setLoad("guest"); return; }
      if (!response.ok) { setSave("error"); return; }
      const data = await response.json() as { profile: Profile };
      setProfile(data.profile);
      setDisplayName(data.profile?.displayName ?? "");
      setBio(data.profile?.bio ?? "");
      setSave("saved");
    } catch {
      setSave("error");
    }
  }

  if (load === "guest") return <div className="settings-card"><h2>Your learner profile</h2><p>Sign in to add a display name and a short bio. They are saved to your account.</p></div>;

  if (load === "loading") return <div className="settings-card" aria-busy="true"><h2>Your learner profile</h2><p role="status">Loading your saved profile…</p></div>;

  if (load === "error") return <div className="settings-card"><h2>Your learner profile</h2><p>We could not load your saved profile. Nothing on this page has been changed.</p><button className="button-secondary" type="button" onClick={() => { setLoad("loading"); setAttempt((number) => number + 1); }}>Try again</button></div>;

  const statusText = save === "saving" ? "Saving your profile…" : save === "saved" ? "Profile saved." : save === "error" ? "We could not save your profile. Check the limits and try again." : "";

  return <div className="settings-card"><h2>Your learner profile</h2><p>{profile === null ? "This profile is empty. Add a display name the workspace can greet you by, and a short bio for your saved records." : `Last updated ${profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "recently"}. A display name is not a credential, so your sign-in stays the same.`}</p>
    <form className="settings-profile" onSubmit={(event) => void submit(event)}>
      <label htmlFor="profile-display-name">Display name<span className="settings-profile-count">{displayName.length}/80</span></label>
      <input id="profile-display-name" name="displayName" maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={save === "saving"} autoComplete="nickname" />
      <label htmlFor="profile-bio">About you<span className="settings-profile-count">{bio.length}/400</span></label>
      <textarea id="profile-bio" name="bio" maxLength={400} value={bio} onChange={(event) => setBio(event.target.value)} disabled={save === "saving"} rows={4} />
      <div className="settings-profile-actions"><button className="button-primary" type="submit" disabled={save === "saving"}>{save === "saving" ? "Saving…" : "Save profile"}</button><span className="settings-profile-status" role="status" aria-live="polite">{statusText}</span></div>
    </form>
  </div>;
}
