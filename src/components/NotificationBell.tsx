"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useOverlay } from "@/components/OverlayProvider";

type Person = { id: string; username: string; displayName: string; avatarUrl: string | null };
type MessagePreview = { sender: Person; count: number; latestBody: string; latestAt: string };
type FriendPost = { id: string; body: string; author: Person; createdAt: string };

export default function NotificationBell() {
  const { openPost, openChat } = useOverlay();
  const [open, setOpen] = useState(false);
  const [messagePreviews, setMessagePreviews] = useState<MessagePreview[]>([]);
  const [friendPosts, setFriendPosts] = useState<FriendPost[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [friendPostCount, setFriendPostCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function load() {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setMessagePreviews(data.messagePreviews ?? []);
        setFriendPosts(data.friendPosts ?? []);
        setUnreadMessageCount(data.unreadMessageCount ?? 0);
        setFriendPostCount(data.friendPostCount ?? 0);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && friendPostCount > 0) {
      fetch("/api/notifications/seen", { method: "POST" }).then(() => setFriendPostCount(0));
    }
  }

  const totalCount = unreadMessageCount + friendPostCount;

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={toggle} className="relative hover:text-brand-600 text-lg leading-none" aria-label="Notifications">
        🔔
        {totalCount > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-brand-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-2 text-sm z-40 max-h-96 overflow-y-auto">
          {messagePreviews.length === 0 && friendPosts.length === 0 ? (
            <p className="px-3 py-4 text-gray-500 text-center text-xs">You're all caught up.</p>
          ) : (
            <>
              {messagePreviews.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Messages</p>
                  {messagePreviews.map((mp) => (
                    <button
                      key={mp.sender.id}
                      onClick={() => {
                        setOpen(false);
                        openChat(mp.sender.username);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left"
                    >
                      {mp.sender.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mp.sender.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {mp.sender.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{mp.sender.displayName}</p>
                        <p className="text-xs text-gray-500 truncate">{mp.latestBody}</p>
                      </div>
                      {mp.count > 1 && (
                        <span className="bg-brand-600 text-white text-[10px] rounded-full px-1.5 flex-shrink-0">
                          {mp.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {friendPosts.length > 0 && (
                <div className={messagePreviews.length > 0 ? "border-t mt-1 pt-1" : ""}>
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Friend posts
                  </p>
                  {friendPosts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => {
                        setOpen(false);
                        openPost(post.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left"
                    >
                      {post.author.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.author.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {post.author.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs">
                          <span className="font-medium">{post.author.displayName}</span> posted
                        </p>
                        <p className="text-xs text-gray-500 truncate">{post.body}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="border-t mt-1 pt-1">
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-brand-600 hover:bg-gray-50 font-medium text-xs"
            >
              View all messages →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
