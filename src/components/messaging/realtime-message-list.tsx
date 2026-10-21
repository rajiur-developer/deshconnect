"use client";
import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@insforge/sdk/ssr";
import { useRealtimeConversation } from "@/components/messaging/use-realtime-conversation";
import type { Message } from "@/types/community";
import { relativeTime } from "@/lib/utils";

export function RealtimeMessageList({ conversationId, viewerId, initialMessages }: { conversationId: string; viewerId: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [mediaErrors, setMediaErrors] = useState<Record<string, boolean>>({});
  const [retryMedia, setRetryMedia] = useState(0);
  const addMessage = useCallback((message: Message) => setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]), []);
  useRealtimeConversation(conversationId, addMessage);
  useEffect(() => {
    let active = true;
    const client = createBrowserClient();
    const keys = messages.filter((message) => message.attachmentKey).map((message) => message.attachmentKey!);
    const unresolvedKeys = [...new Set(keys)].filter((key) => !mediaUrls[key]);
    if (!unresolvedKeys.length) return () => { active = false; };
    void Promise.all(unresolvedKeys.map(async (key) => {
      try {
        const { data, error } = await client.storage.from("chat-media").createSignedUrl(key, 3600);
        return data?.signedUrl ? { key, url: data.signedUrl } : { key, failed: Boolean(error) };
      } catch {
        return { key, failed: true };
      }
    })).then((results) => {
      if (!active) return;
      setMediaUrls((current) => ({ ...current, ...Object.fromEntries(results.filter((result): result is { key: string; url: string } => "url" in result).map(({ key, url }) => [key, url])) }));
      setMediaErrors((current) => ({ ...current, ...Object.fromEntries(results.filter((result) => "failed" in result && result.failed).map(({ key }) => [key, true])) }));
    });
    return () => { active = false; };
  }, [messages, mediaUrls, retryMedia]);
  return <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1" aria-live="polite">
    {messages.length === 0 && <p className="text-sm text-slate-600">No messages yet. Say hello!</p>}
    {messages.map((message) => {
      const mine = message.senderId === viewerId;
      const media = message.attachmentKey ? mediaUrls[message.attachmentKey] : null;
      return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800"}`}>
        {message.body && <p className="whitespace-pre-line">{message.body}</p>}
        {media && message.attachmentType === "image" && <img src={media} alt="Image shared in chat" className="mt-2 max-h-72 max-w-full rounded-lg object-contain" />}
        {media && message.attachmentType === "audio" && <audio src={media} controls className="mt-2 max-w-full" aria-label="Voice message" />}
        {message.attachmentKey && !media && (mediaErrors[message.attachmentKey]
          ? <button type="button" onClick={() => { setMediaErrors((current) => { const next = { ...current }; delete next[message.attachmentKey!]; return next; }); setRetryMedia((value) => value + 1); }} className="mt-1 text-xs underline opacity-80">Attachment unavailable. Retry</button>
          : <p className="mt-1 text-xs opacity-70">Loading attachment…</p>)}
        <p className={`mt-1 text-[10px] ${mine ? "text-brand-100" : "text-slate-400"}`}>{relativeTime(message.createdAt)}</p>
      </div></div>;
    })}
  </div>;
}
