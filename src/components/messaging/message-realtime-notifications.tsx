"use client";

import { useEffect, useMemo, useState } from "react";
import { getInsForgeBrowserClient } from "@/lib/insforge-browser";

export type UnreadConversation = { conversationId: string; count: number };

type ConversationChannel = { id: string; memberId: string };

export function MessageRealtimeNotifications({
  userId,
  conversations,
  pollSince,
  initialUnreadMessages = [],
}: {
  userId: string;
  conversations: ConversationChannel[];
  pollSince: string;
  initialUnreadMessages?: UnreadConversation[];
}) {
  useEffect(() => {
    const client = getInsForgeBrowserClient();
    let active = true;
    let pollTimer: number | null = null;
    let authRetryTimer: number | null = null;
    let notificationsStarted = false;
    let verifyingSession = false;
    let cursor = pollSince;
    const seen = new Set<string>();
    const lastUnreadCounts = new Map(initialUnreadMessages.map(({ conversationId, count }) => [conversationId, count]));
    const channelMembers = new Map(conversations.map(({ id, memberId }) => [`chat:${id}`, memberId]));
    const channels = new Set(channelMembers.keys());
    const subscribed = new Set<string>();
    const subscribeToChannel = async (channel: string) => {
      if (!active || subscribed.has(channel)) return;
      subscribed.add(channel);
      try {
        const response = await client.realtime.subscribe(channel);
        if (response.ok === false) throw new Error(response.error?.message || "Subscription rejected.");
      } catch (error) {
        subscribed.delete(channel);
        throw error;
      }
    };
    const emitMessage = (row: any) => {
      const conversationId = row?.conversation_id ?? row?.conversationId;
      const senderId = row?.sender_id ?? row?.senderId;
      const id = row?.id;
      if (!id || !conversationId || !channels.has(`chat:${conversationId}`) || seen.has(id)) return;
      seen.add(id);
      const createdAt = row.created_at ?? row.createdAt;
      if (createdAt && createdAt > cursor) cursor = createdAt;
      const message = {
        id,
        conversationId,
        senderId,
        body: row.body ?? "",
        attachmentKey: row.attachment_key ?? row.attachmentKey ?? null,
        attachmentUrl: row.attachment_url ?? row.attachmentUrl ?? null,
        attachmentMimeType: row.attachment_mime_type ?? row.attachmentMimeType ?? null,
        attachmentType: row.attachment_type ?? row.attachmentType ?? null,
        replyToMessageId: row.reply_to_message_id ?? row.replyToMessageId ?? null,
        reactions: row.reactions ?? [],
        createdAt,
        readBy: row.read_by ?? row.readBy ?? [],
        deliveredTo: row.delivered_to ?? row.deliveredTo ?? [],
        editedAt: row.edited_at ?? row.editedAt ?? null,
      };
      window.dispatchEvent(new CustomEvent("chat-message-received", { detail: message }));
      if (senderId && senderId !== userId) {
        if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
          const notification = new Notification("New message", {
            body: message.body || (message.attachmentType === "image" ? "You received an image." : message.attachmentType === "audio" ? "You received a voice message." : "You received a message."),
            tag: `deshconnect-chat-${conversationId}`,
          });
          notification.onclick = () => {
            window.focus();
            window.location.assign("/messages");
          };
        }
        void import("@/features/account/actions").then(({ markConversationMessagesDeliveredAction }) => markConversationMessagesDeliveredAction(conversationId));
        window.dispatchEvent(new CustomEvent("message-unread-change", {
          detail: { conversationId, senderId, messageId: id, unreadCount: null },
        }));
      }
    };
    const handler = (event: any) => {
      const pending: any[] = [];
      const visited = new Set<object>();
      const collect = (value: any, depth = 0) => {
        if (!value || typeof value !== "object" || visited.has(value) || depth > 5) return;
        visited.add(value);
        pending.push(value);
        for (const key of ["payload", "data", "message", "record", "new", "row"]) collect(value[key], depth + 1);
      };
      collect(event);
      const row = pending.find((item) => item?.id && (item.sender_id ?? item.senderId) && (item.conversation_id ?? item.conversationId));
      if (!row) {
        const changedRecord = pending.find((item) => item?.record?.id);
        if (changedRecord) {
          const raw = changedRecord.record;
          const conversationId = raw.conversation_id;
          if (!channels.has(`chat:${conversationId}`)) return;
          const message = { id: raw.id, conversationId, senderId: raw.sender_id, body: raw.body ?? "", attachmentKey: raw.attachment_key ?? null, attachmentUrl: raw.attachment_url ?? null, attachmentMimeType: raw.attachment_mime_type ?? null, attachmentType: raw.attachment_type ?? null, replyToMessageId: raw.reply_to_message_id ?? null, reactions: raw.reactions ?? [], createdAt: raw.created_at, readBy: raw.read_by ?? [], deliveredTo: raw.delivered_to ?? [], editedAt: raw.edited_at ?? null };
          const operation = pending.find((item) => item?.operation)?.operation;
          window.dispatchEvent(new CustomEvent(operation === "DELETE" ? "chat-message-deleted" : "chat-message-updated", { detail: message }));
        }
        return;
      }
      const conversationId = row.conversation_id ?? row.conversationId;
      const eventChannel = pending.map((item) => item?.meta?.channel ?? item?.channel).find(Boolean);
      if (!conversationId || !channels.has(`chat:${conversationId}`)) return;
      if (eventChannel && eventChannel !== `chat:${conversationId}`) return;
      emitMessage(row);
    };
    const pollForMessages = async () => {
      if (!active || document.visibilityState !== "visible" || channels.size === 0) return;
      try {
        const { data, error } = await client.database
          .from("messages")
          .select("id,conversation_id,sender_id,body,attachment_key,attachment_url,attachment_mime_type,attachment_type,created_at,read_by,delivered_to,edited_at")
          .in("conversation_id", [...channels].map((channel) => channel.slice("chat:".length)))
          .gt("created_at", cursor)
          .order("created_at", { ascending: true })
          .limit(100);
        if (error) throw error;
        for (const row of data ?? []) emitMessage(row);
      } catch (error) {
        if (active) console.warn("Could not check for missed chat messages:", error);
      }
    };
    const pollUnreadCounts = async () => {
      if (!active || document.visibilityState !== "visible") return;
      try {
        const { data, error } = await client.database.rpc("get_unread_message_counts");
        if (error) throw error;
        const counts = new Map<string, number>(
          (data ?? []).map((row: any) => [row.conversation_id, Number(row.unread_count ?? 0)]),
        );
        const conversationIds = new Set([...lastUnreadCounts.keys(), ...counts.keys()]);
        for (const conversationId of conversationIds) {
          const count = counts.get(conversationId) ?? 0;
          window.dispatchEvent(new CustomEvent("message-unread-change", {
            detail: { conversationId, unreadCount: count },
          }));
        }
        lastUnreadCounts.clear();
        counts.forEach((count, conversationId) => lastUnreadCounts.set(conversationId, count));
      } catch (error) {
        if (active) console.warn("Could not refresh unread message counts:", error);
      }
    };
    const discoverConversations = async () => {
      if (!active || document.visibilityState !== "visible") return;
      try {
        const { data, error } = await client.database
          .from("conversations")
          .select("id,participant_ids")
          .eq("conversation_type", "connection")
          .filter("participant_ids", "cs", `{${userId}}`)
          .limit(200);
        if (error) throw error;
        let discovered = false;
        for (const row of data ?? []) {
          const channel = `chat:${row.id}`;
          if (channels.has(channel)) continue;
          const memberId = (row.participant_ids ?? []).find((id: string) => id !== userId);
          if (!memberId) continue;
          channels.add(channel);
          channelMembers.set(channel, memberId);
          discovered = true;
          window.dispatchEvent(new CustomEvent("chat-conversation-discovered", {
            detail: { conversationId: row.id, memberId },
          }));
          void subscribeToChannel(channel).catch((error) => {
            if (active) console.error(`Realtime subscription failed for ${channel}:`, error);
          });
        }
        if (discovered) void pollForMessages();
      } catch (error) {
        if (active) console.warn("Could not discover new conversations:", error);
      }
    };
    const handleDisconnect = () => subscribed.clear();
    const handleConnect = () => {
      void Promise.all([...channels].map((channel) => subscribeToChannel(channel))).catch((error) => {
        if (active) console.warn("Could not restore realtime message subscriptions:", error);
      });
    };
    const refresh = () => {
      if (!notificationsStarted) {
        void startNotifications();
        return;
      }
      void discoverConversations();
      void pollForMessages();
      void pollUnreadCounts();
      void Promise.all([...channels].filter((channel) => !subscribed.has(channel)).map((channel) => subscribeToChannel(channel))).catch((error) => {
        if (active) console.warn("Could not retry realtime subscriptions:", error);
      });
    };
    const startNotifications = async () => {
      if (!active || notificationsStarted || verifyingSession) return;
      verifyingSession = true;
      // The header is rendered on the server. Confirm the matching browser
      // session before starting direct database reads; otherwise an expired or
      // different profile cookie would repeatedly query messages as anon.
      try {
        const { data, error } = await client.auth.getCurrentUser();
        if (!active) return;
        if (error) {
          console.warn("Could not verify the message session; will retry:", error);
          return;
        }
        if (!data?.user) {
          console.warn("Message session is not ready yet; will retry.");
          return;
        }
        if (data.user.id !== userId) {
          console.error("Message session does not match the signed-in profile.");
          return;
        }
      } catch (error) {
        if (active) console.warn("Could not verify the message session; will retry:", error);
        return;
      } finally {
        verifyingSession = false;
      }
      if (!active || notificationsStarted) return;
      notificationsStarted = true;
      if (authRetryTimer !== null) {
        window.clearInterval(authRetryTimer);
        authRetryTimer = null;
      }

      client.realtime.on("new_message", handler);
      client.realtime.on("disconnect", handleDisconnect);
      client.realtime.on("connect", handleConnect);
      void Promise.all([...channels].map((channel) => subscribeToChannel(channel))).catch((error) => {
        if (active) console.error("Realtime message notifications failed:", error);
      });
      pollTimer = window.setInterval(refresh, 2500);
      document.addEventListener("visibilitychange", refresh);
      void refresh();
    };
    authRetryTimer = window.setInterval(() => void startNotifications(), 2000);
    void startNotifications().catch((error) => {
      if (active) console.error("Could not initialize realtime message notifications:", error);
    });
    return () => {
      active = false;
      if (pollTimer !== null) window.clearInterval(pollTimer);
      if (authRetryTimer !== null) window.clearInterval(authRetryTimer);
      document.removeEventListener("visibilitychange", refresh);
      client.realtime.off("new_message", handler);
      client.realtime.off("disconnect", handleDisconnect);
      client.realtime.off("connect", handleConnect);
      subscribed.forEach((channel) => client.realtime.unsubscribe(channel));
    };
  }, [conversations, initialUnreadMessages, userId]);

  return null;
}

export function useUnreadMessageTotal(initialCounts: UnreadConversation[]) {
  const initial = useMemo(
    () => Object.fromEntries(initialCounts.map(({ conversationId, count }) => [conversationId, count])),
    [initialCounts],
  );
  // The unread snapshot can change between server rendering and the browser's
  // first render. Start identically on both sides, then apply the snapshot once
  // hydration is complete so a badge cannot break the surrounding React tree.
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    setCounts((current) => {
      const next = { ...initial, ...current };
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      if (currentKeys.length === nextKeys.length && nextKeys.every((key) => current[key] === next[key])) return current;
      return next;
    });
  }, [initial]);
  useEffect(() => {
    const handleUnreadChange = (event: Event) => {
      const detail = (event as CustomEvent<{ conversationId: string; unreadCount: number | null }>).detail;
      if (!detail?.conversationId) return;
      setCounts((current) => ({
        ...current,
        [detail.conversationId]: detail.unreadCount === null
          ? (current[detail.conversationId] ?? 0) + 1
          : Math.max(0, detail.unreadCount),
      }));
    };
    window.addEventListener("message-unread-change", handleUnreadChange);
    return () => window.removeEventListener("message-unread-change", handleUnreadChange);
  }, []);
  return Object.values(counts).reduce((total, count) => total + count, 0);
}

export function UnreadMessageBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold leading-5 text-white shadow-sm ring-1 ring-red-700/20" aria-label={`${count} unread message${count === 1 ? "" : "s"}`}>{count > 99 ? "99+" : count}</span>;
}
