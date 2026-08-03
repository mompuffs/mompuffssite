"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import PostModal from "@/components/PostModal";
import FloatingChatWidget from "@/components/FloatingChatWidget";

// Desktop gets a Messenger-style floating chat box in the corner; below this
// width there's no room for it, so it navigates to the full thread page instead.
const DESKTOP_BREAKPOINT = 768;

type OverlayContextValue = {
  openPost: (postId: string) => void;
  openChat: (username: string) => void;
};

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay must be used within OverlayProvider");
  return ctx;
}

export default function OverlayProvider({ children }: { children: ReactNode }) {
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [openChatUsername, setOpenChatUsername] = useState<string | null>(null);

  function openPost(postId: string) {
    setOpenPostId(postId);
  }

  function openChat(username: string) {
    if (typeof window !== "undefined" && window.innerWidth < DESKTOP_BREAKPOINT) {
      window.location.href = `/messages/${username}`;
      return;
    }
    setOpenChatUsername(username);
  }

  return (
    <OverlayContext.Provider value={{ openPost, openChat }}>
      {children}
      {openPostId && <PostModal postId={openPostId} onClose={() => setOpenPostId(null)} />}
      {openChatUsername && (
        <FloatingChatWidget username={openChatUsername} onClose={() => setOpenChatUsername(null)} />
      )}
    </OverlayContext.Provider>
  );
}
