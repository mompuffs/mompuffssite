"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
};

export default function AdminUserRow({ user }: { user: AdminUser }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);
  const isSelf = (session?.user as any)?.id === user.id;

  async function toggleAdmin() {
    const next = !user.isAdmin;
    if (!confirm(next ? `Make ${user.displayName} an admin?` : `Remove admin access from ${user.displayName}?`)) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (
      !confirm(
        `Delete ${user.displayName} (@${user.username})? This removes their account, posts, messages, shop, and that shop's items from existing orders.`
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(typeof data.error === "string" ? data.error : "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2.5 pr-4">
        <Link href={`/profile/${user.username}`} className="font-medium hover:underline">
          {user.displayName}
        </Link>
        <span className="text-gray-400 ml-1.5">@{user.username}</span>
      </td>
      <td className="py-2.5 pr-4 text-gray-500">{user.email}</td>
      <td className="py-2.5 pr-4 text-gray-500">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="py-2.5 pr-4">
        {user.isAdmin ? (
          <span className="inline-block text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
            Admin
          </span>
        ) : (
          <span className="text-xs text-gray-400">Member</span>
        )}
      </td>
      <td className="py-2.5 text-right whitespace-nowrap">
        <button
          onClick={toggleAdmin}
          disabled={busy || (isSelf && user.isAdmin)}
          title={isSelf && user.isAdmin ? "You can't remove your own admin access here." : undefined}
          className="text-xs text-brand-600 hover:underline disabled:opacity-40 disabled:no-underline"
        >
          {user.isAdmin ? "Remove admin" : "Make admin"}
        </button>
        <button
          onClick={handleDelete}
          disabled={busy || isSelf}
          title={isSelf ? "You can't delete your own account from here." : undefined}
          className="text-xs text-red-600 hover:underline disabled:opacity-40 disabled:no-underline ml-3"
        >
          {busy ? "Working…" : "Delete"}
        </button>
      </td>
    </tr>
  );
}
