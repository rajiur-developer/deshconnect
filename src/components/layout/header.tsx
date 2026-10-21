// @ts-nocheck
import Link from "next/link";
import type { PublicUser } from "@/types/auth"; import { isNavGroup, PRIMARY_NAV, SITE } from "@/config/site"; import { unreadNotificationCount } from "@/services/notifications"; import { Icon } from "@/components/ui/icons"; import { MobileNav } from "./mobile-nav"; import { NavMenu } from "./nav-menu"; import { UserMenu } from "./user-menu"; import MainLogo from "../../../public/logo/Main-Logo.webp";
export async function Header({ user }: { user: PublicUser | null }) {
const unread = user ? await Promise.race([unreadNotificationCount(user.id).catch(() => 0), new Promise<number>((resolve) => setTimeout(() => resolve(0), 1200))]) : 0;
return (
<header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 shadow-[0_4px_20px_-14px_rgba(11,61,46,0.45)] backdrop-blur">
<div className="container-x flex h-16 items-center gap-4">
<Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-brand-700 logoSize">
<span className="grid h-14 w-14 place-items-center rounded-lg text-white">
<img src={MainLogo.src} alt={SITE.name} className="h-full w-full object-contain" />
</span>
</Link>
<nav className="ml-2 hidden items-center gap-1 lg:flex" aria-label="Primary">
{PRIMARY_NAV.map((entry) => (
<NavMenu key={isNavGroup(entry) ? entry.label : entry.href} entry={entry} />
))}
</nav>
<div className="ml-auto flex items-center gap-2">
<form action="/search" className="hidden md:block">
<div className="relative">
<Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
<input
name="q"
placeholder="Search places and services…"
aria-label="Search DeshConnect"
className="w-52 rounded-full border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus-ring lg:w-64"
/>
</div>
</form>
{user ? (
<UserMenu user={user} unread={unread} />
) : (
<div className="hidden items-center gap-2 sm:flex">
<Link
href="/login"
className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
>
Login
</Link>
<Link
href="/register"
className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
>
Create account
</Link>
</div>
)}
<MobileNav user={user} />
</div>
</div>
</header>
); }
