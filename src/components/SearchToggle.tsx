"use client";

import { useEffect, useRef, useState } from "react";
import SearchBar from "@/components/SearchBar";

// Header magnifying glass: click to drop a site-search box below it (same
// live results as the old header search bar; Enter goes to /search).
export default function SearchToggle() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="lg:relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close search" : "Search the site"}
        aria-expanded={open}
        className="flex items-center hover:text-white p-1"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      </button>
      {open && (
        // Phones/tablets: full width just under the header (positioned against
        // the <nav>) with 16px gutters.
        // Desktop: a box hanging below the icon.
        <div className="absolute inset-x-4 top-full mt-1 lg:absolute lg:inset-x-auto lg:right-0 lg:top-full lg:mt-3 lg:w-80 bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-40 font-normal">
          <SearchBar variant="desktop" autoFocus onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
