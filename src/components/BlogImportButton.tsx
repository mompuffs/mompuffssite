"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BlogImportButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/blog/import", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Import failed." });
      return;
    }
    setMsg({ ok: true, text: `${data.created} new, ${data.updated} updated (${data.total} published in Socrates).` });
    router.refresh();
  }

  return (
    <div className="sm:text-right shrink-0">
      <button
        onClick={run}
        disabled={busy || disabled}
        className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-brand-700 disabled:opacity-40"
      >
        {busy ? "Importing…" : "Import from Socrates"}
      </button>
      {msg && <p className={`text-xs mt-2 ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
    </div>
  );
}
