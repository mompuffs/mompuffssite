"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
};

export default function MessageThread({
  currentUserId,
  otherUsername,
  initialMessages,
  blocked,
}: {
  currentUserId: string;
  otherUsername: string;
  initialMessages: Message[];
  blocked: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Light polling so a reply shows up without a manual refresh -- this app
  // has no websocket/real-time infrastructure.
  useEffect(() => {
    if (blocked) return;
    const interval = setInterval(() => {
      fetch(`/api/messages/${otherUsername}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.messages) setMessages(data.messages);
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [otherUsername, blocked]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/messages/${otherUsername}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not send message.");
      return;
    }
    const message = await res.json();
    setMessages((m) => [...m, message]);
    setBody("");
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto space-y-2 mb-3">
        {messages.length === 0 && <p className="text-gray-500 text-sm text-center mt-8">No messages yet. Say hi!</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === currentUserId ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm ${
                m.senderId === currentUserId ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`text-[10px] mt-0.5 ${m.senderId === currentUserId ? "text-brand-100" : "text-gray-400"}`}>
                {new Date(m.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {blocked ? (
        <p className="text-sm text-gray-500 text-center border-t pt-3">
          You can't message this user.
        </p>
      ) : (
        <form onSubmit={sendMessage} className="flex gap-2 border-t pt-3">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message…"
            className="flex-1 border rounded-full px-4 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="bg-brand-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      )}
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
