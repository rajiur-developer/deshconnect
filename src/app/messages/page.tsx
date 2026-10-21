// @ts-nocheck
import Link from "next/link";
import { StartConversationButton } from "@/components/account/account-actions";
import { requireUser } from "@/lib/auth/current-user"; import { listConversations } from "@/services/messaging"; import { listConnections, listUsers } from "@/services/users"; import { relativeTime } from "@/lib/utils"; import { AccountShell } from "@/components/layout/account-shell"; import { Card } from "@/components/ui/badge"; import { EmptyState } from "@/components/ui/empty-state"; import { Icon } from "@/components/ui/icons";
export const metadata = { title: "Messages", robots: { index: false, follow: false } };
export default async function MessagesPage() {
const user = await requireUser("/messages");
const [allConversations, friends, users] = await Promise.all([listConversations(user.id), listConnections(user.id), listUsers()]);
const friendIds = new Set(friends.map((friend) => friend.id));
const conversations = allConversations.filter((conversation) => conversation.participantIds.some((id) => id !== user.id && friendIds.has(id)));
const userById = new Map(users.map((item) => [item.id, item]));
return (
<AccountShell user={user} title="Messages" description="Chat with members who accepted your connection request.">
{conversations.length === 0 ? (
<EmptyState
title="No conversations yet"
description="Start a conversation from an open profile."
icon={<Icon name="message" className="h-10 w-10" />}
/>
) : (
<div className="space-y-3">
{conversations.map((conversation) => {
const otherId = conversation.participantIds.find((id) => id !== user.id) ?? conversation.participantIds[0];
const other = userById.get(otherId);
return (
<Link key={conversation.id} href={`/messages/${conversation.id}`}>
<Card className="flex items-center gap-3 p-4 hover:border-brand-300">
<span className="grid h-11 w-11 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
{other?.fullName.slice(0, 2).toUpperCase() ?? "?"}
</span>
<div className="min-w-0">
<p className="font-medium text-slate-900">{other?.fullName ?? "Unknown user"}</p>
<p className="truncate text-sm text-slate-500">@{other?.username}</p>
</div>
<span className="ml-auto text-xs text-slate-400">{relativeTime(conversation.updatedAt)}</span>
</Card>
</Link>
);
})}
</div>
)}
<section className="mt-8">
<h2 className="mb-3 text-lg font-semibold text-slate-900">Connected members</h2>
{friends.length === 0 ? <p className="text-sm text-slate-500">Accepted connections will appear here.</p> : <div className="grid gap-3 sm:grid-cols-2">{friends.map((friend) => <Card key={friend.id} className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">{friend.fullName.slice(0, 2).toUpperCase()}</span><div className="min-w-0 flex-1"><Link href={`/profile/${friend.username}`} className="font-medium text-slate-900 hover:text-brand-700">{friend.fullName}</Link><p className="truncate text-xs text-slate-500">@{friend.username}</p></div><StartConversationButton username={friend.username} /></Card>)}</div>}
</section>
</AccountShell>
); }
