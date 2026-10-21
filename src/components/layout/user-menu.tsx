// @ts-nocheck
"use client";
import Link from "next/link"; import { usePathname } from "next/navigation"; import { useEffect, useRef, useState } from "react";
import type { PublicUser } from "@/types/auth"; import { Icon } from "@/components/ui/icons"; import { ProfileAvatar } from "@/components/ui/profile-avatar"; import { signOutAction } from "@/features/auth/actions";
const LINKS = [
{ href: "/dashboard", label: "Dashboard" },
{ href: "/my-records", label: "My Records" },
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
{ href: "/notifications", label: "Notifications" },
{ href: "/my-blood-requests", label: "My Blood Requests" },
{ href: "/my-reports", label: "My Reports" }, ];
export function UserMenu({ user, unread }: { user: PublicUser; unread?: number }) {
const [open, setOpen] = useState(false);
const ref = useRef<HTMLDetailsElement>(null);
const pathname = usePathname();
useEffect(() => {
if (ref.current) ref.current.open = false;
setOpen(false);
}, [pathname]);
useEffect(() => {
function onClick(event: MouseEvent) {
if (ref.current && !ref.current.contains(event.target as Node)) {
ref.current.open = false;
setOpen(false);
}
}
document.addEventListener("pointerdown", onClick);
return () => document.removeEventListener("pointerdown", onClick);
}, []);
const isStaff = user.role === "admin" || user.role === "moderator";
return (
<details
ref={ref}
className="user-menu-details relative"
onToggle={(event) => setOpen(event.currentTarget.open)}
>
<summary
aria-expanded={open}
aria-haspopup="menu"
className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm font-medium text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden"
>
<ProfileAvatar name={user.fullName} src={user.avatar} storageKey={user.avatarKey} className="h-7 w-7 text-xs" textClassName="text-xs" />
<span className="hidden max-w-[10rem] truncate sm:inline">{user.fullName}</span>
<Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
</summary>
<div className="user-menu-panel absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
<div className="border-b border-slate-100 px-4 py-3">
<p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
<p className="truncate text-xs text-slate-500">@{user.username}</p>
</div>
<div className="max-h-[70vh] overflow-y-auto p-1.5" role="menu">
{isStaff && (
<MenuLink href="/admin" label="Admin panel" onSelect={() => setOpen(false)} />
)}
{LINKS.map((link) => (
<MenuLink key={link.href} href={link.href} label={link.label} badge={link.href === "/notifications" ? unread : undefined} onSelect={() => setOpen(false)} />
))}
<form action={signOutAction} className="mt-1 border-t border-slate-100 pt-1">
<button
type="submit"
className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
>
Logout
</button>
</form>
</div>
</div>
</details>
); }
function MenuLink({
href,
label,
badge,
onSelect, }: {
href: string;
label: string;
badge?: number;
onSelect: () => void; }) {
return (
<Link href={href} onClick={onSelect} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
<span>{label}</span>
{badge ? <span className="rounded-full bg-accent-500 px-1.5 text-xs font-semibold text-white">{badge}</span> : null}
</Link>
); }
