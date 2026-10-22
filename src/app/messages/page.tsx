import { requireUser } from "@/lib/auth/current-user";
import { listConversationPreviews, listConversations, listUnreadMessageCounts } from "@/services/messaging";
import { listConnections } from "@/services/users";
import { AccountShell } from "@/components/layout/account-shell";
import { MessagesInbox } from "@/components/messaging/messages-inbox";

export const metadata = { title: "Messages", robots: { index: false, follow: false } };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const { to } = await searchParams;
  const user = await requireUser("/messages");
  const [conversations, friends, unreadMessages] = await Promise.all([listConversations(user.id), listConnections(user.id), listUnreadMessageCounts().catch(() => [])]);
  const previews = await listConversationPreviews(conversations.map(({ id }) => id)).catch((error) => {
    console.error("Could not load conversation previews:", error);
    return [];
  });
  const conversationByMember = new Map(conversations.flatMap((conversation) => {
    const otherId = conversation.participantIds.find((id) => id !== user.id);
    return otherId ? [[otherId, conversation.id] as const] : [];
  }));
  const chats = friends.map((member) => ({ id: conversationByMember.get(member.id) ?? "", member }));
  return <AccountShell user={user} title="Messages" description="Chat with members who accepted your connection request." messagesOnly>
    <MessagesInbox userId={user.id} chats={chats} initialUsername={to} initialUnreadMessages={unreadMessages} initialPreviews={previews} />
  </AccountShell>;
}
