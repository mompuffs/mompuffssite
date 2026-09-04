"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Person = { id: string; username: string; displayName: string; avatarUrl: string | null };
type Message = { id: string; senderId: string; recipientId: string; body: string; createdAt: string };

export default function FloatingChatWidget({
  username,
  label,
  minimized,
  onToggle,
  onClose,
}: {
  username: string;
  label?: string;
  minimized: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;

  const [otherUser, setOtherUser] = useState<Person | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function load() {
    fetch(`/api/messages/${username}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.otherUser) setOtherUser(data.otherUser);
        if (data.messages) setMessages(data.messages);
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (minimized) return;
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, minimized]);

  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, minimized]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/messages/${username}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not send message.");
      if (res.status === 403) setBlocked(true);
      return;
    }
    const message = await res.json();
    setMessages((m) => [...m, message]);
    setBody("");
  }

  const title = otherUser?.displayName ?? label ?? username;

  return (
    <div className="w-72 bg-white rounded-t-xl shadow-2xl border border-gray-200 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b cursor-pointer bg-gray-50 rounded-t-xl" onClick={onToggle}>
        <div className="flex items-center gap-2 min-w-0">
          {otherUser?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={otherUser.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
              {title.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(); }} className="text-gray-400 hover:text-gray-700 text-sm px-1" aria-label={minimized ? "Open chat" : "Minimize chat"}>
            {minimized ? "▲" : "–"}
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-gray-400 hover:text-gray-700 text-lg leading-none px-1" aria-label="Close chat">
            ×
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="h-72 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && <p className="text-gray-400 text-xs text-center mt-6">Say hi!</p>}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.senderId === currentUserId ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs ${
                  m.senderId === currentUserId ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-900"
                }`}>
                  {m.body}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          {blocked ? (
            <p className="text-xs text-gray-500 text-center border-t p-2">You can't message this user.</p>
          ) : (
            <form onSubmit={sendMessage} className="flex gap-1.5 border-t p-2">
              <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message…" className="flex-1 border rounded-full px-3 py-1 text-xs min-w-0" />
              <button type="submit" disabled={sending || !body.trim()} className="bg-brand-600 text-white px-3 py-1 rounded-full text-xs font-medium hover:bg-brand-700 disabled:opacity-50 flex-shrink-0">
                Send
              </button>
            </form>
          )}
          {error && <p className="text-red-600 text-[10px] px-2 pb-1">{error}</p>}
          <p className="text-[10px] text-gray-400 px-3 pb-2">
            <Link href={`/messages/${username}`} className="hover:underline">Open full messages</Link>
          </p>
        </>
      )}
    </div>
  );
}
