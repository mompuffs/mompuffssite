"use client";

import { useEffect, useRef, useState } from "react";
import { COMPOSER_EMOJIS } from "@/lib/reactions";

export default function EmojiPicker({
  onPick,
}: {
  onPick: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-brand-600 hover:underline text-xs">
        {open ? "Close emoji" : "+ Emoji"}
      </button>
      {open && (
        <div className="absolute left-0 bottom-full mb-1 z-20 bg-white border rounded-xl shadow-lg p-2 w-56 grid grid-cols-8 gap-1">
          {COMPOSER_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onPick(emoji);
                setOpen(false);
              }}
              className="text-lg leading-none p-1 rounded hover:bg-gray-100"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
