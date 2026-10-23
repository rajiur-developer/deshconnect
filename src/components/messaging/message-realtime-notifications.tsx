"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getMessageNotificationSnapshotAction,
  markConversationMessagesDeliveredAction,
} from "@/features/account/actions";
import type { Message } from "@/types/community";

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
    let active = true;
    let inFlight = false;
    let sessionUnavailable = false;
    let cursor = pollSince;
    const seen = new Set<string>();
    const lastUnreadCounts = new Map(initialUnreadMessages.map(({ conversationId, count }) => [conversationId, count]));
    const channelMembers = new Map(conversations.map(({ id, memberId }) => [id, memberId]));

    const emitMessage = (message: Message) => {
      if (!message.id || !channelMembers.has(message.conversationId) || seen.has(message.id)) return;
      seen.add(message.id);
      if (message.createdAt > cursor) cursor = message.createdAt;
      window.dispatchEvent(new CustomEvent("chat-message-received", { detail: message }));
      if (message.senderId !== userId) {
        if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
          const notification = new Notification("New message", {
            body: message.body || (message.attachmentType === "image" ? "You received an image." : message.attachmentType === "audio" ? "You received a voice message." : "You received a message."),
            tag: `deshconnect-chat-${message.conversationId}`,
          });
          notification.onclick = () => {
            window.focus();
            window.location.assign("/messages");
          };
        }
        void markConversationMessagesDeliveredAction(message.conversationId).catch((error) => {
          console.warn("Could not mark the message as delivered:", error);
        });
        window.dispatchEvent(new CustomEvent("message-unread-change", {
          detail: { conversationId: message.conversationId, senderId: message.senderId, messageId: message.id, unreadCount: null },
        }));
      }
    };

    const refresh = async () => {
      if (!active || sessionUnavailable || inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const snapshot = await getMessageNotificationSnapshotAction(cursor);
        if (!active) return;
        if (!snapshot.authenticated) {
          sessionUnavailable = true;
          window.clearInterval(timer);
          document.removeEventListener("visibilitychange", refresh);
          return;
        }

        for (const conversation of snapshot.conversations) {
          if (channelMembers.has(conversation.id)) continue;
          channelMembers.set(conversation.id, conversation.memberId);
          window.dispatchEvent(new CustomEvent("chat-conversation-discovered", {
            detail: { conversationId: conversation.id, memberId: conversation.memberId },
          }));
        }

        for (const message of snapshot.messages) emitMessage(message);

        const counts = new Map<string, number>(snapshot.unreadMessages.map(({ conversationId, count }) => [conversationId, count]));
        const conversationIds = new Set([...lastUnreadCounts.keys(), ...counts.keys()]);
        for (const conversationId of conversationIds) {
          window.dispatchEvent(new CustomEvent("message-unread-change", {
            detail: { conversationId, unreadCount: counts.get(conversationId) ?? 0 },
          }));
        }
        lastUnreadCounts.clear();
        counts.forEach((count, conversationId) => lastUnreadCounts.set(conversationId, count));
      } catch (error) {
        if (active) console.warn("Could not refresh message notifications:", error);
      } finally {
        inFlight = false;
      }
    };

    const timer = window.setInterval(() => void refresh(), 2500);
    document.addEventListener("visibilitychange", refresh);
    void refresh();
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [conversations, initialUnreadMessages, pollSince, userId]);

  return null;
}

export function useUnreadMessageTotal(initialCounts: UnreadConversation[]) {
  const initial = useMemo(
    () => Object.fromEntries(initialCounts.map(({ conversationId, count }) => [conversationId, count])),
    [initialCounts],
  );
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
