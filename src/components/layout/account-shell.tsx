// @ts-nocheck
import Link from "next/link";
import type { PublicUser } from "@/types/auth"; import { PageHeader } from "@/components/layout/page-header";
const NAV = [
{ href: "/dashboard", label: "Dashboard" },
{ href: "/profile", label: "My Profile" },
{ href: "/profile/edit", label: "Edit Profile" },
{ href: "/settings", label: "Settings" },
{ href: "/my-posts", label: "My Posts" },
{ href: "/my-comments", label: "My Comments" },
{ href: "/my-reviews", label: "My Reviews" },
{ href: "/my-news", label: "My News" },
{ href: "/saved", label: "Saved" },
{ href: "/messages", label: "Messages" },
{ href: "/connections", label: "Connections" },
{ href: "/friend-requests", label: "Friend Requests" },
{ href: "/notifications", label: "Notifications" },
{ href: "/my-blood-requests", label: "My Blood Requests" },
{ href: "/my-reports", label: "My Reports" }, ];
export function AccountShell({
user,
title,
description,
messagesOnly = false,
children, }: {
user: PublicUser;
title: string;
description?: string;
messagesOnly?: boolean;
children: React.ReactNode; }) {
const navItems = messagesOnly ? NAV.filter((item) => item.href === "/friend-requests") : NAV;
return (
<>
<PageHeader title={title} description={description} variant={messagesOnly ? "messages" : "default"} />
<div className={`container-x grid gap-8 py-8 ${messagesOnly ? "lg:grid-cols-[12rem_minmax(0,1fr)]" : "lg:grid-cols-4"}`}>
<aside>
{!messagesOnly && <>
<div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
<p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
<p className="truncate text-xs text-slate-500">@{user.username}</p>
</div>
</>}
<nav className="rounded-2xl border border-slate-200 bg-white p-2" aria-label="Account">
{navItems.map((item) => (
<Link
key={item.href}
href={item.href}
aria-current={messagesOnly && item.href === "/friend-requests" ? "page" : undefined}
className={`block rounded-lg px-3 py-2 text-sm ${messagesOnly ? "border border-brand-100 bg-brand-50 font-semibold text-brand-800 shadow-sm" : "text-slate-700 hover:bg-slate-100"}`}
>
{item.label}
</Link>
))}
</nav>
</aside>
<div className={messagesOnly ? "min-w-0" : "lg:col-span-3"}>{children}</div>
</div>
</>
); }
