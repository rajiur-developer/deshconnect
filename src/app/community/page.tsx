// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { CommunityPostImage } from "@/components/community/community-post-image";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { buildHref, firstParam } from "@/lib/query"; import { parsePage } from "@/lib/utils"; import { countComments, listPosts } from "@/services/community"; import { getDirectoryLocationOptions } from "@/services/locations"; import { listConnections, listUsers } from "@/services/users"; import { listIncomingRequests, listSentRequests } from "@/services/messaging"; import { getCurrentUser } from "@/lib/auth/current-user"; import { relativeTime } from "@/lib/utils"; import { Badge } from "@/components/ui/badge"; import { Icon } from "@/components/ui/icons"; import { EmptyState } from "@/components/ui/empty-state"; import { PageHeader } from "@/components/layout/page-header"; import { Pagination } from "@/components/ui/pagination"; import { PostForm } from "@/components/community/community-forms"; import { ConnectButton, RespondButtons, StartConversationButton } from "@/components/account/account-actions";
export const metadata: Metadata = { title: "Community" };
export default async function CommunityPage({
searchParams, }: {
searchParams: Promise<Record<string, string | string[] | undefined>>; }) {
const params = await searchParams;
const page = parsePage(firstParam(params.page));
const [user, result, options] = await Promise.all([
getCurrentUser(),
listPosts({ page }),
getDirectoryLocationOptions(),
]);
const [friends, sentRequests, incomingRequests] = user ? await Promise.all([listConnections(user.id), listSentRequests(user.id), listIncomingRequests(user.id)]) : [[], [], []];
const friendIds = new Set(friends.map((friend) => friend.id));
const outgoingByUser = new Map(sentRequests.map((request) => [request.addresseeId, request]));
const incomingByUser = new Map(incomingRequests.map((request) => [request.requesterId, request]));
const users = await listUsers({ ids: result.items.map((post) => post.authorId) });
const authorById = new Map(users.map((item) => [item.id, item]));
const commentCounts = await Promise.all(result.items.map((post) => countComments(post.id)));
return (
<>
<PageHeader
title="Community"
description="The community achieves more together. Share, ask questions, and help people nearby."
/>
<div className="container-x grid gap-8 py-8 lg:grid-cols-3">
<div className="flex items-center justify-end lg:col-span-3"><Link href={user ? "/messages" : "/login?next=%2Fmessages"} className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"><Icon name="message" className="h-4 w-4" />Chat now</Link></div>
<div className="space-y-5 lg:col-span-2">
{result.items.length === 0 && (
<EmptyState title="No posts yet" description="Start a discussion and be our first person." icon={<Icon name="message" className="h-10 w-10" />} />
)}
{result.items.map((post, index) => {
const author = authorById.get(post.authorId);
return (
<article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5">
<div className="flex items-center gap-3">
<ProfileAvatar name={author?.fullName ?? "Community member"} src={author?.avatar} storageKey={author?.avatarKey} className="h-10 w-10 text-sm" textClassName="text-sm" />
<div>
<p className="text-sm font-semibold text-slate-900">{author?.fullName ?? "Community member"}</p>
<p className="text-xs text-slate-500">{relativeTime(post.createdAt)}</p>
</div>
{user && author && author.id !== user.id && <div className="ml-auto flex flex-wrap gap-2">{friendIds.has(author.id) ? <StartConversationButton username={author.username} /> : incomingByUser.has(author.id) ? <RespondButtons connectionId={incomingByUser.get(author.id)!.id} /> : <ConnectButton username={author.username} pendingConnectionId={outgoingByUser.get(author.id)?.id} />}</div>}
{post.status === "pending" && <Badge tone="amber">Pending review</Badge>}
</div>
<p className="mt-3 whitespace-pre-line text-slate-800">{post.body}</p>
{post.image && (
<CommunityPostImage src={post.image} storageKey={post.imageKey} />
)}
<div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
<span className="flex items-center gap-1">
<Icon name="heart" className="h-4 w-4" /> {post.reactions}
</span>
<span className="flex items-center gap-1">
<Icon name="message" className="h-4 w-4" /> {commentCounts[index]} comments
</span>
<Link href={`/community/${post.id}`} className="ml-auto font-medium text-brand-700">
View discussion
</Link>
</div>
</article>
);
})}
<Pagination meta={result.meta} hrefFor={(next) => buildHref("/community", params, { page: next })} />
</div>
<aside>
{user ? (
<PostForm divisions={options.divisions} districts={options.districts} upazilas={options.upazilas} userId={user.id} />
) : (
<div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
<p>Log in to join the discussion.</p>
<Link href="/login" className="mt-2 inline-block font-medium text-brand-700">Login →</Link>
</div>
)}
</aside>
</div>
</>
); }
