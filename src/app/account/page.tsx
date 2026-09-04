"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ImageInput from "@/components/ImageInput";
import AccountSidebar from "@/components/AccountSidebar";

type LinkRow = { label: string; url: string };
type Profile = {
  displayName: string;
  avatarUrl: string | null;
  email: string;
  username: string;
  bio: string | null;
  work: string | null;
  location: string | null;
  birthdate: string | null;
  links: LinkRow[];
  contactEmail: string | null;
  contactPhone: string | null;
  showWork: boolean;
  showLocation: boolean;
  showBirthdate: boolean;
  showLinks: boolean;
  showContact: boolean;
  showBio: boolean;
};

export default function AccountPage() {
  const { status, update: updateSession } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [work, setWork] = useState("");
  const [showWork, setShowWork] = useState(false);
  const [location, setLocation] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [birthdate, setBirthdate] = useState("");
  const [showBirthdate, setShowBirthdate] = useState(false);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [showLinks, setShowLinks] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [showBio, setShowBio] = useState(true);
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

  function loadProfile() {
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((data: Profile) => {
        setProfile(data);
        setDisplayName(data.displayName ?? "");
        setAvatarUrl(data.avatarUrl ?? "");
        setBio(data.bio ?? "");
        setWork(data.work ?? "");
        setShowWork(data.showWork);
        setLocation(data.location ?? "");
        setShowLocation(data.showLocation);
        setBirthdate(data.birthdate ?? "");
        setShowBirthdate(data.showBirthdate);
        setLinks(data.links ?? []);
        setShowLinks(data.showLinks);
        setContactEmail(data.contactEmail ?? "");
        setContactPhone(data.contactPhone ?? "");
        setShowContact(data.showContact);
        setShowBio(data.showBio !== false);
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

  function addLinkRow() {
    setLinks((rows) => [...rows, { label: "", url: "" }]);
  }
  function updateLinkRow(i: number, field: keyof LinkRow, value: string) {
    setLinks((rows) => rows.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }
  function removeLinkRow(i: number) {
    setLinks((rows) => rows.filter((_, idx) => idx !== i));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName, avatarUrl, bio, work, showWork, location, showLocation,
        birthdate: birthdate || null, showBirthdate, links, showLinks,
        contactEmail, contactPhone, showContact, showBio,
      }),
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My account</h1>
      <div className="grid md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={saveProfile} className="bg-white rounded-xl shadow p-4 space-y-4">
            <div className="space-y-2">
              <h2 className="font-semibold text-sm">Profile</h2>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Profile picture</label>
                <ImageInput value={avatarUrl} onChange={setAvatarUrl} placeholder="Image URL" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Display name</label>
                <input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <p className="text-xs text-gray-500">Username: <span className="font-medium">@{profile?.username}</span> (can't be changed)</p>
            </div>
            <div className="border-t pt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">About me</label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input type="checkbox" checked={showBio} onChange={(e) => setShowBio(e.target.checked)} />
                  Show on profile
                </label>
              </div>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell people a bit about yourself" className="w-full border rounded px-3 py-2 text-sm resize-none" />
            </div>
            <div className="border-t pt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Work</label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input type="checkbox" checked={showWork} onChange={(e) => setShowWork(e.target.checked)} /> Show on profile
                </label>
              </div>
              <input value={work} onChange={(e) => setWork(e.target.value)} placeholder="e.g. Owner at MomPuffs" className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="border-t pt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Location</label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input type="checkbox" checked={showLocation} onChange={(e) => setShowLocation(e.target.checked)} /> Show on profile
                </label>
              </div>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Denver, CO" className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="border-t pt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Birthdate</label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input type="checkbox" checked={showBirthdate} onChange={(e) => setShowBirthdate(e.target.checked)} /> Show on profile
                </label>
              </div>
              <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="border-t pt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Links</label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input type="checkbox" checked={showLinks} onChange={(e) => setShowLinks(e.target.checked)} /> Show on profile
                </label>
              </div>
              {links.map((row, i) => (
                <div key={i} className="flex gap-1.5">
                  <input placeholder="Label (e.g. Instagram)" value={row.label} onChange={(e) => updateLinkRow(i, "label", e.target.value)} className="w-2/5 border rounded px-2 py-1.5 text-xs" />
                  <input placeholder="https://…" value={row.url} onChange={(e) => updateLinkRow(i, "url", e.target.value)} className="flex-1 border rounded px-2 py-1.5 text-xs" />
                  <button type="button" onClick={() => removeLinkRow(i)} className="text-red-500 text-xs hover:underline flex-shrink-0">Remove</button>
                </div>
              ))}
              <button type="button" onClick={addLinkRow} className="text-brand-600 hover:underline text-xs">+ Add link</button>
            </div>
            <div className="border-t pt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Contact info</label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input type="checkbox" checked={showContact} onChange={(e) => setShowContact(e.target.checked)} /> Show on profile
                </label>
              </div>
              <input type="email" placeholder="Public contact email (optional, separate from your login email)" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              <input placeholder="Public contact phone (optional)" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            {profileError && <p className="text-red-600 text-sm">{profileError}</p>}
            {profileSaved && <p className="text-green-700 text-sm">Saved.</p>}
            <button type="submit" disabled={savingProfile} className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
              {savingProfile ? "Saving…" : "Save profile"}
            </button>
          </form>
          <form onSubmit={changeEmail} className="bg-white rounded-xl shadow p-4 space-y-2">
            <h2 className="font-semibold text-sm">Change email</h2>
            <p className="text-xs text-gray-500">Current email: {profile?.email}</p>
            <input required type="email" placeholder="New email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            <input required type="password" placeholder="Current password (to confirm)" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} autoComplete="current-password" className="w-full border rounded px-3 py-2 text-sm" />
            {emailError && <p className="text-red-600 text-sm">{emailError}</p>}
            <button type="submit" disabled={savingEmail} className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60">{savingEmail ? "Saving…" : "Change email"}</button>
          </form>
          <form onSubmit={changePassword} className="bg-white rounded-xl shadow p-4 space-y-2">
            <h2 className="font-semibold text-sm">Change password</h2>
            <input required type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" className="w-full border rounded px-3 py-2 text-sm" />
            <input required type="password" placeholder="New password (min 8 characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" className="w-full border rounded px-3 py-2 text-sm" />
            <input required type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className="w-full border rounded px-3 py-2 text-sm" />
            {passwordError && <p className="text-red-600 text-sm">{passwordError}</p>}
            <button type="submit" disabled={savingPassword} className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60">{savingPassword ? "Saving…" : "Change password"}</button>
          </form>
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-sm mb-1">Order history</h2>
            <Link href="/orders" className="text-brand-600 hover:underline text-sm">View your orders →</Link>
          </div>
        </div>
        <div className="md:col-span-1">
          <AccountSidebar />
        </div>
      </div>
    </div>
  );
}
