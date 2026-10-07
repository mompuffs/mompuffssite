"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageInput from "@/components/ImageInput";
import { DAYS, DIRECTORY_CATEGORIES, US_STATES, type DayKey } from "@/lib/directory";

// Empty open/close times on a day that isn't Closed or 24 hours = not listed.
type DayState = { open: string; close: string; closed: boolean; allDay: boolean };

export type ListingFormValues = {
  name: string;
  category: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  menuUrl: string;
  imageUrl: string;
  about: string;
  specials: string;
  hours: Record<string, any> | null;
};

const EMPTY: ListingFormValues = {
  name: "",
  category: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  website: "",
  menuUrl: "",
  imageUrl: "",
  about: "",
  specials: "",
  hours: null,
};

function initialDays(hours: Record<string, any> | null): Record<DayKey, DayState> {
  const out = {} as Record<DayKey, DayState>;
  for (const { key } of DAYS) {
    const d = hours?.[key];
    if (d?.closed) out[key] = { open: "", close: "", closed: true, allDay: false };
    else if (d?.open === "00:00" && d?.close === "23:59") out[key] = { open: "", close: "", closed: false, allDay: true };
    else if (d?.open) out[key] = { open: d.open, close: d.close, closed: false, allDay: false };
    else out[key] = { open: "", close: "", closed: false, allDay: false };
  }
  return out;
}

const input = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const label = "block text-sm font-semibold text-gray-700 mb-1";
const optional = <span className="font-normal text-gray-400">(optional)</span>;

// Marks the fields that only show publicly on Premium listings.
function PremiumTag({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-wide bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded">
      Premium
    </span>
  );
}

export default function DirectoryListingForm({
  listingId,
  initial,
  isAdmin = false,
  isOwner = false,
  showsAll = false,
}: {
  listingId?: string;
  initial?: ListingFormValues;
  isAdmin?: boolean;
  // The listing's claimed owner: edits go live without review.
  isOwner?: boolean;
  // Whether premium fields already show publicly (admin, comped or paid).
  showsAll?: boolean;
}) {
  const tagPremium = !isAdmin && !showsAll;
  const router = useRouter();
  const [v, setV] = useState<ListingFormValues>(initial ?? EMPTY);
  const [days, setDays] = useState(() => initialDays(initial?.hours ?? null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ListingFormValues>(k: K, value: ListingFormValues[K]) {
    setV((prev) => ({ ...prev, [k]: value }));
  }

  function setDay(key: DayKey, patch: Partial<DayState>) {
    setDays((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function copyMondayToAll() {
    setDays((prev) => {
      const next = { ...prev };
      for (const { key } of DAYS) next[key] = { ...prev.mon };
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const hours: Record<string, any> = {};
    for (const { key, label: dayLabel } of DAYS) {
      const d = days[key];
      if (d.closed) hours[key] = { closed: true };
      else if (d.allDay) hours[key] = { open: "00:00", close: "23:59" };
      else if (d.open && d.close) hours[key] = { open: d.open, close: d.close };
      else if (d.open || d.close) {
        setError(`Add both an open and a close time for ${dayLabel}, or leave both blank.`);
        return;
      } else hours[key] = null;
    }
    setSaving(true);

    const res = await fetch(listingId ? `/api/directory/${listingId}` : "/api/directory", {
      method: listingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, hours }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(data.status === "APPROVED" ? `/directory/${data.slug}` : "/directory/mine?submitted=1");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {tagPremium && (
        <p className="text-sm bg-brand-50 text-brand-800 rounded-xl px-4 py-3">
          Fields marked <span className="font-bold">Premium</span> are saved, but only show publicly once the business owner
          {isOwner ? " (you) upgrades" : " claims the listing and upgrades"} to Premium.
        </p>
      )}

      <section className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-bold text-lg">The business</h2>
        <div>
          <label className={label} htmlFor="name">Business name *</label>
          <input id="name" required maxLength={120} value={v.name} onChange={(e) => set("name", e.target.value)} className={input} />
        </div>
        <div>
          <span className={label}>Category *</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DIRECTORY_CATEGORIES.map((c) => (
              <label
                key={c.slug}
                className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer ${
                  v.category === c.slug ? "border-brand-500 bg-brand-50 font-semibold" : "hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={c.slug}
                  checked={v.category === c.slug}
                  onChange={() => set("category", c.slug)}
                  className="accent-brand-600"
                  required
                />
                <span>{c.icon}</span>
                {c.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={label} htmlFor="about">About *</label>
          <textarea
            id="about"
            required
            rows={5}
            maxLength={5000}
            value={v.about}
            onChange={(e) => set("about", e.target.value)}
            placeholder="What they offer, what makes them worth a visit…"
            className={input}
          />
        </div>
        <div>
          <label className={label} htmlFor="specials">Specials {optional}<PremiumTag show={tagPremium} /></label>
          <textarea
            id="specials"
            rows={3}
            maxLength={2000}
            value={v.specials}
            onChange={(e) => set("specials", e.target.value)}
            placeholder="e.g. 20% off pre-rolls every Wednesday"
            className={input}
          />
        </div>
        <div>
          <span className={label}>Photo or logo {optional}</span>
          <ImageInput value={v.imageUrl} onChange={(url) => set("imageUrl", url)} placeholder="Image URL" />
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-bold text-lg">Address</h2>
        <div>
          <label className={label} htmlFor="street">Street address {optional}</label>
          <input id="street" maxLength={160} value={v.street} onChange={(e) => set("street", e.target.value)} placeholder="123 Main St, Suite 4" className={input} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <div className="sm:col-span-3">
            <label className={label} htmlFor="city">City {optional}</label>
            <input id="city" maxLength={80} value={v.city} onChange={(e) => set("city", e.target.value)} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="state">State *</label>
            <select id="state" required value={v.state} onChange={(e) => set("state", e.target.value)} className={input}>
              <option value="">Choose…</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="zip">ZIP {optional}</label>
            <input id="zip" inputMode="numeric" maxLength={10} value={v.zip} onChange={(e) => set("zip", e.target.value)} className={input} />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Only the state is required. With a street address, the business also gets a pin on the map.
        </p>
      </section>

      <section className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-bold text-lg">Contact &amp; links <span className="text-sm font-normal text-gray-400">(all optional)</span></h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="phone">Phone</label>
            <input id="phone" type="tel" maxLength={30} value={v.phone} onChange={(e) => set("phone", e.target.value)} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="email">Email<PremiumTag show={tagPremium} /></label>
            <input id="email" type="email" maxLength={200} value={v.email} onChange={(e) => set("email", e.target.value)} placeholder="hello@example.com" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="website">Website<PremiumTag show={tagPremium} /></label>
            <input id="website" maxLength={500} value={v.website} onChange={(e) => set("website", e.target.value)} placeholder="example.com" className={input} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="menuUrl">Link to menu<PremiumTag show={tagPremium} /></label>
          <input id="menuUrl" maxLength={500} value={v.menuUrl} onChange={(e) => set("menuUrl", e.target.value)} placeholder="https://…" className={input} />
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-bold text-lg">Hours <span className="text-sm font-normal text-gray-400">(optional)</span><PremiumTag show={tagPremium} /></h2>
          <button type="button" onClick={copyMondayToAll} className="text-sm text-brand-600 hover:underline">
            Copy Monday to every day
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">Leave a day blank if you don&apos;t know its hours.</p>
        <div className="divide-y">
          {DAYS.map(({ key, label: dayLabel }) => {
            const d = days[key];
            const noTimes = d.closed || d.allDay;
            return (
              <div key={key} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 text-sm">
                <span className="w-24 font-semibold">{dayLabel}</span>
                <label className="flex items-center gap-1.5">
                  <span className="text-gray-500 w-12 sm:w-auto">Opens</span>
                  <input
                    type="time"
                    value={noTimes ? "" : d.open}
                    disabled={noTimes}
                    onChange={(e) => setDay(key, { open: e.target.value })}
                    className="border rounded-lg px-2 py-1 disabled:bg-gray-100 disabled:text-gray-300"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  <span className="text-gray-500 w-12 sm:w-auto">Closes</span>
                  <input
                    type="time"
                    value={noTimes ? "" : d.close}
                    disabled={noTimes}
                    onChange={(e) => setDay(key, { close: e.target.value })}
                    className="border rounded-lg px-2 py-1 disabled:bg-gray-100 disabled:text-gray-300"
                  />
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={d.closed}
                    onChange={(e) => setDay(key, { closed: e.target.checked, allDay: false })}
                    className="accent-brand-600"
                  />
                  Closed
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={d.allDay}
                    onChange={(e) => setDay(key, { allDay: e.target.checked, closed: false })}
                    className="accent-brand-600"
                  />
                  Open 24 hours
                </label>
              </div>
            );
          })}
        </div>
      </section>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-full hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : listingId ? "Save changes" : "Submit business"}
        </button>
        {!isAdmin && !isOwner && (
          <p className="text-xs text-gray-500">
            {listingId
              ? "Edits are reviewed by our team before they go live."
              : "Listings are reviewed by our team before they appear in the directory."}
          </p>
        )}
      </div>
    </form>
  );
}
