"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";
import PostModal from "@/components/PostModal";
import FloatingChatWidget from "@/components/FloatingChatWidget";

const DESKTOP_BREAKPOINT = 768;
const MAX_DOCKS = 3;

type OverlayContextValue = {
  openPost: (postId: string) => void;
  openChat: (username: string) => void;
};

type DockChat = { username: string; name: string; minimized: boolean };

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay must be used within OverlayProvider");
  return ctx;
}

export default function OverlayProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [docks, setDocks] = useState<DockChat[]>([]);
  const closedRef = useRef<Set<string>>(new Set());

  function openPost(postId: string) {
    setOpenPostId(postId);
  }

  function upsertDock(username: string, name: string, minimized: boolean) {
    setDocks((current) => {
      const existing = current.find((c) => c.username === username);
      if (existing) {
        return current.map((c) => (c.username === username ? { ...c, name, minimized } : { ...c, minimized: minimized ? c.minimized : true }));
      }
      const next = [...current.map((c) => ({ ...c, minimized: true })), { username, name, minimized }];
      return next.slice(-MAX_DOCKS);
    });
  }

  function openChat(username: string) {
    if (typeof window !== "undefined" && window.innerWidth < DESKTOP_BREAKPOINT) {
      window.location.href = `/messages/${username}`;
      return;
    }
    closedRef.current.delete(username);
    upsertDock(username, username, false);
  }

  useEffect(() => {
    if (status !== "authenticated") return;

    function poll() {
      fetch("/api/messages")
        .then((r) => r.json())
        .then((conversations) => {
          if (!Array.isArray(conversations)) return;
          for (const convo of conversations) {
            if (!convo?.unreadCount || !convo.otherUser?.username) continue;
            const username = convo.otherUser.username as string;
            if (closedRef.current.has(username)) continue;
            const name = (convo.otherUser.displayName as string) || username;
            setDocks((current) => {
              if (current.some((c) => c.username === username)) {
                return current.map((c) => (c.username === username ? { ...c, name } : c));
              }
              return [...current, { username, name, minimized: true }].slice(-MAX_DOCKS);
            });
          }
        })
        .catch(() => {});
    }

    poll();
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [status]);

  return (
    <OverlayContext.Provider value={{ openPost, openChat }}>
      {children}
      {openPostId && <PostModal postId={openPostId} onClose={() => setOpenPostId(null)} />}
      {docks.length > 0 && (
        <div className="fixed bottom-0 right-4 z-40 hidden md:flex items-end gap-2">
          {docks.map((chat) => (
            <FloatingChatWidget
              key={chat.username}
              username={chat.username}
              label={chat.name}
              minimized={chat.minimized}
              onToggle={() =>
                setDocks((current) =>
                  current.map((c) =>
                    c.username === chat.username ? { ...c, minimized: !c.minimized } : { ...c, minimized: true }
                  )
                )
              }
              onClose={() => {
                closedRef.current.add(chat.username);
                setDocks((current) => current.filter((c) => c.username !== chat.username));
              }}
            />
          ))}
        </div>
      )}
    </OverlayContext.Provider>
  );
}
