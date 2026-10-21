// @ts-nocheck
"use client";
import Link from "next/link"; import { usePathname } from "next/navigation"; import { useEffect, useState } from "react";
import type { PublicUser } from "@/types/auth"; import { isNavGroup, PRIMARY_NAV } from "@/config/site"; import { Icon } from "@/components/ui/icons";
export function MobileNav({ user }: { user: PublicUser | null }) {
const [open, setOpen] = useState(false);
const pathname = usePathname();
useEffect(() => setOpen(false), [pathname]);
return (
<div className="flex items-center gap-2 lg:hidden">
<button
type="button"
onClick={() => setOpen((value) => !value)}
aria-expanded={open}
aria-label="Show or hide navigation"
className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700"
>
<Icon name={open ? "close" : "menu"} className="h-5 w-5" />
</button>
{open && (
<div className="absolute inset-x-0 top-16 z-40 border-b border-slate-200 bg-white shadow-lg">
<nav className="container-x flex flex-col gap-1 py-4">
{PRIMARY_NAV.map((entry) =>
isNavGroup(entry) ? (
<div key={entry.label} className="px-3 py-1">
<p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{entry.label}</p>
<div className="mt-1 flex flex-col gap-1">
{entry.items.map((item) => (
<Link
key={item.href}
href={item.href}
className="rounded-lg py-2 pl-4 pr-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
>
{item.label}
</Link>
))}
</div>
</div>
) : (
<Link
key={entry.href}
href={entry.href}
className={`rounded-lg px-3 py-2 text-sm font-semibold ${                     entry.href === "/blood-donation"                       ? "blood-nav-link text-accent-600 hover:bg-accent-50"                       : "text-slate-700 hover:bg-slate-100"                   }`}
>
{entry.href === "/blood-donation" && <Icon name="droplet" aria-hidden="true" className="mr-1 inline h-4 w-4" />}
{entry.label}
</Link>
)
)}
<form action="/search" className="mt-2 px-3">
<input
name="q"
placeholder="Search DeshConnect"
className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
/>
</form>
<div className="mt-2 flex gap-2 px-3">
{user ? (
<Link href="/dashboard" className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-medium text-white">
Dashboard
</Link>
) : (
<>
<Link href="/login" className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-medium text-white">
Login
</Link>
<Link href="/register" className="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-center text-sm font-medium text-brand-700">
Create account
</Link>
</>
)}
</div>
</nav>
</div>
)}
</div>
); }
