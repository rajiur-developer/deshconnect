"use client";
import { useEffect } from "react";
import { createBrowserClient } from "@insforge/sdk/ssr";
import type { Message } from "@/types/community";

export function useRealtimeConversation(conversationId: string, onMessage: (message: Message) => void) {
  useEffect(() => {
    const client = createBrowserClient();
    const channel = `chat:${conversationId}`;
    const handler = (event: any) => {
      const row = event?.message ?? event;
      if (event?.meta?.channel !== channel || row?.conversation_id !== conversationId || !row?.id) return;
      onMessage({
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        body: row.body,
        attachmentKey: row.attachment_key ?? null,
        attachmentUrl: row.attachment_url ?? null,
        attachmentMimeType: row.attachment_mime_type ?? null,
        attachmentType: row.attachment_type ?? null,
        createdAt: row.created_at,
        readBy: row.read_by ?? [],
      });
    };
    client.realtime.on("new_message", handler);
    void client.realtime.subscribe(channel);
    return () => {
      client.realtime.off("new_message", handler);
      client.realtime.unsubscribe(channel);
    };
  }, [conversationId, onMessage]);
}
