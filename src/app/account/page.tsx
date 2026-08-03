"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ImageInput from "@/components/ImageInput";

export default function AccountPage() {
  const { status, update: updateSession } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<{ displayName: string; avatarUrl: string | null; email: string; username: string } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Read straight from the database rather than the session token, which
  // only carries what was true at sign-in and can go stale after an edit.
  function loadProfile() {
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setDisplayName(data.displayName ?? "");
        setAvatarUrl(data.avatarUrl ?? "");
      });
  }

  useEffect(() => {
    if (status === "authenticated") loadProfile();
  }, [status]);

  if (status === "loading" || (status === "authenticated" && !profile)) {
    return <p className="text-center text-gray-500 mt-12">Loading…</p>;
  }
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, avatarUrl }),
    });
    setSavingProfile(false);
    if (!res.ok) {
      const data = await res.json();
      setProfileError(data.error ?? "Could not save.");
      return;
    }
    loadProfile();
    await updateSession();
    setProfileSaved(true);
    router.refresh();
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    setSavingEmail(true);
    setEmailError(null);
    const res = await fetch("/api/account/email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail, currentPassword: emailPassword }),
    });
    setSavingEmail(false);
    if (!res.ok) {
      const data = await res.json();
      setEmailError(data.error ?? "Could not change email.");
      return;
    }
    await signOut({ redirect: false });
    router.push("/login?emailChanged=1");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }
    setSavingPassword(true);
    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSavingPassword(false);
    if (!res.ok) {
      const data = await res.json();
      setPasswordError(data.error ?? "Could not change password.");
      return;
    }
    await signOut({ redirect: false });
    router.push("/login?passwordChanged=1");
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My account</h1>

      <form onSubmit={saveProfile} className="bg-white rounded-xl shadow p-4 space-y-2">
        <h2 className="font-semibold text-sm">Profile</h2>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Profile picture</label>
          <ImageInput value={avatarUrl} onChange={setAvatarUrl} placeholder="Image URL" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Display name</label>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <p className="text-xs text-gray-500">
          Username: <span className="font-medium">@{profile?.username}</span> (can't be changed)
        </p>
        {profileError && <p className="text-red-600 text-sm">{profileError}</p>}
        {profileSaved && <p className="text-green-700 text-sm">Saved.</p>}
        <button
          type="submit"
          disabled={savingProfile}
          className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {savingProfile ? "Saving…" : "Save profile"}
        </button>
      </form>

      <form onSubmit={changeEmail} className="bg-white rounded-xl shadow p-4 space-y-2">
        <h2 className="font-semibold text-sm">Change email</h2>
        <p className="text-xs text-gray-500">Current email: {profile?.email}</p>
        <input
          required
          type="email"
          placeholder="New email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <input
          required
          type="password"
          placeholder="Current password (to confirm)"
          value={emailPassword}
          onChange={(e) => setEmailPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full border rounded px-3 py-2 text-sm"
        />
        {emailError && <p className="text-red-600 text-sm">{emailError}</p>}
        <button
          type="submit"
          disabled={savingEmail}
          className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {savingEmail ? "Saving…" : "Change email"}
        </button>
        <p className="text-xs text-gray-500">You'll be signed out and need to log in again with the new email.</p>
      </form>

      <form onSubmit={changePassword} className="bg-white rounded-xl shadow p-4 space-y-2">
        <h2 className="font-semibold text-sm">Change password</h2>
        <input
          required
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <input
          required
          type="password"
          placeholder="New password (min 8 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <input
          required
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full border rounded px-3 py-2 text-sm"
        />
        {passwordError && <p className="text-red-600 text-sm">{passwordError}</p>}
        <button
          type="submit"
          disabled={savingPassword}
          className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {savingPassword ? "Saving…" : "Change password"}
        </button>
        <p className="text-xs text-gray-500">You'll be signed out and need to log in again with the new password.</p>
      </form>

      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold text-sm mb-1">Order history</h2>
        <p className="text-sm text-gray-500 mb-2">See every order you've placed and which shop it was from.</p>
        <Link href="/orders" className="text-brand-600 hover:underline text-sm">
          View your orders →
        </Link>
      </div>
    </div>
  );
}
