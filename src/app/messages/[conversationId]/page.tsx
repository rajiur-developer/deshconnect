// @ts-nocheck
import Link from "next/link"; import { notFound } from "next/navigation"; import { EmptyRecordPage } from "@/components/layout/empty-record-page";
import { requireUser } from "@/lib/auth/current-user"; import { getConversationForUser, listMessages } from "@/services/messaging"; import { listUsers } from "@/services/users"; import { AccountShell } from "@/components/layout/account-shell"; import { Card } from "@/components/ui/badge"; import { MessageForm } from "@/components/account/account-forms"; import { RealtimeMessageList } from "@/components/messaging/realtime-message-list";
export const metadata = { title: "Conversation", robots: { index: false, follow: false } };
export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
const { conversationId } = await params;
const user = await requireUser("/messages");
const conversation = await getConversationForUser(conversationId, user.id);
if (!conversation) return <EmptyRecordPage title="Messages" description="Your conversations with the DeshConnect community." media="/images/banner/Collage.webp" backHref="/messages" backLabel="Back to messages" />;
const [messages, users] = await Promise.all([listMessages(conversationId, user.id), listUsers()]);
const userById = new Map(users.map((item) => [item.id, item]));
const otherId = conversation.participantIds.find((id) => id !== user.id) ?? conversation.participantIds[0];
const other = userById.get(otherId);
return (
<AccountShell user={user} title={other?.fullName ?? "Conversation"} description="Personal messages between members.">
<Card className="p-4">
<RealtimeMessageList conversationId={conversationId} viewerId={user.id} initialMessages={messages} />
<div className="mt-4 border-t border-slate-100 pt-4">
<MessageForm conversationId={conversationId} viewerId={user.id} />
</div>
</Card>
<p className="mt-3 text-xs text-slate-400">
<Link href="/messages" className="text-brand-700">← বার্তায় ফিরুন</Link> · রিয়েল-টাইম মেসেজ চালু আছে।
</p>
</AccountShell>
); }
