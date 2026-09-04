"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ImageInput from "@/components/ImageInput";

type ShopValues = { name: string; description: string; bannerUrl: string };
type AccountValues = { displayName: string };

export default function AdminSettingsForm({ shop, account }: { shop: ShopValues; account: AccountValues }) {
  const router = useRouter();

  const [shopForm, setShopForm] = useState(shop);
  const [shopSaving, setShopSaving] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);
  const [shopSaved, setShopSaved] = useState(false);

  const [displayName, setDisplayName] = useState(account.displayName);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSaved, setAccountSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  async function handleShopSave(e: React.FormEvent) {
    e.preventDefault();
    setShopSaving(true);
    setShopError(null);
    setShopSaved(false);
    const res = await fetch("/api/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shopForm),
    });
    setShopSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setShopError(data.error ?? "Could not save.");
      return;
    }
    setShopSaved(true);
    router.refresh();
  }

  async function handleAccountSave(e: React.FormEvent) {
    e.preventDefault();
    setAccountSaving(true);
    setAccountError(null);
    setAccountSaved(false);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    setAccountSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setAccountError(data.error ?? "Could not save.");
      return;
    }
    setAccountSaved(true);
    router.refresh();
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }
    setPasswordSaving(true);
    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setPasswordSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setPasswordError(data.error ?? "Could not change password.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaved(true);
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/shop" className="text-sm text-brand-600 hover:underline">
          ← My Shop
        </Link>
        <h1 className="text-2xl font-bold mt-1">Shop settings</h1>
      </div>

      <form onSubmit={handleShopSave} className="bg-white rounded-xl shadow p-4 space-y-3">
        <h3 className="font-semibold text-sm">Store details</h3>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Store name</label>
          <input
            required
            value={shopForm.name}
            onChange={(e) => setShopForm((v) => ({ ...v, name: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea
            value={shopForm.description}
            onChange={(e) => setShopForm((v) => ({ ...v, description: e.target.value }))}
            rows={3}
            className="w-full border rounded px-3 py-2 text-sm resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Banner image</label>
          <ImageInput
            value={shopForm.bannerUrl}
            onChange={(url) => setShopForm((v) => ({ ...v, bannerUrl: url }))}
            placeholder="Banner image URL"
          />
        </div>
        {shopError && <p className="text-red-600 text-sm">{shopError}</p>}
        {shopSaved && <p className="text-green-700 text-sm">Saved.</p>}
        <button
          type="submit"
          disabled={shopSaving}
          className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {shopSaving ? "Saving…" : "Save store details"}
        </button>
      </form>

      <form onSubmit={handleAccountSave} className="bg-white rounded-xl shadow p-4 space-y-3">
        <h3 className="font-semibold text-sm">Account</h3>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Display name</label>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <p className="text-xs text-gray-500">
          Email and username live on{" "}
          <Link href="/account" className="text-brand-600 hover:underline">
            your account page
          </Link>
          .
        </p>
        {accountError && <p className="text-red-600 text-sm">{accountError}</p>}
        {accountSaved && <p className="text-green-700 text-sm">Saved.</p>}
        <button
          type="submit"
          disabled={accountSaving}
          className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {accountSaving ? "Saving…" : "Save account"}
        </button>
      </form>

      <form onSubmit={handlePasswordSave} className="bg-white rounded-xl shadow p-4 space-y-3">
        <h3 className="font-semibold text-sm">Change password</h3>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Current password</label>
          <input
            required
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
          <input
            required
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Confirm new password</label>
          <input
            required
            type="password"
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        {passwordError && <p className="text-red-600 text-sm">{passwordError}</p>}
        {passwordSaved && <p className="text-green-700 text-sm">Password changed.</p>}
        <button
          type="submit"
          disabled={passwordSaving}
          className="bg-brand-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {passwordSaving ? "Saving…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
