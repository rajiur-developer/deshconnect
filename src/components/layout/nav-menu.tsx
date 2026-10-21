// @ts-nocheck
"use client";
import Link from "next/link"; import { useState } from "react";
import { Icon } from "@/components/ui/icons"; import { isNavGroup, type NavEntry } from "@/config/site";
const linkClass =
"block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-brand-50 hover:text-brand-700";
/** Renders one top-level nav entry: a plain link, or a hover-triggered sub-menu. */ export function NavMenu({ entry }: { entry: NavEntry }) {
const [open, setOpen] = useState(false);
if (!isNavGroup(entry)) {
const isBloodDonation = entry.href === "/blood-donation";
return (
<Link
href={entry.href}
className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 hover:scale-[1.04] ${           isBloodDonation             ? "blood-nav-link text-accent-600 hover:bg-accent-5 hover:text-accent-700"             : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"         }`}
>
{isBloodDonation && <Icon name="droplet" aria-hidden="true" className="mr-1 inline h-4 w-4" />}
{entry.label}
</Link>
);
}
return (
<div
className="group relative"
onMouseEnter={() => setOpen(true)}
onMouseLeave={() => setOpen(false)}
>
<button
type="button"
aria-haspopup="menu"
aria-expanded={open}
 onClick={() => setOpen((value) => !value)}
className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:scale-[1.04] hover:bg-brand-50 hover:text-brand-700"
>
{entry.label}
<Icon
name="chevron-down"
aria-hidden="true"
className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
/>
</button>
<div className={`dropdown-in absolute left-0 top-full z-50 w-64 pt-1 transition-[opacity,visibility] duration-150 ${open ? "visible opacity-100" : "invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"}`}>
<div className="rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
{entry.items.map((item) => (
<Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={linkClass}>
{item.label}
{item.description ? (
<span className="block text-xs font-normal text-slate-500">{item.description}</span>
) : null}
</Link>
))}
</div>
</div>
</div>
); }
