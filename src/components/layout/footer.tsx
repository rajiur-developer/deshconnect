// @ts-nocheck
import Link from "next/link";
import { FOOTER_LINKS, SITE } from "@/config/site"; import { Icon } from "@/components/ui/icons";
export function Footer() {
return (
<footer className="mt-16 border-t border-slate-200 bg-white">
<div className="container-x grid gap-8 py-12 md:grid-cols-4">
<div>
<Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
<span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white">
<Icon name="map-pin" className="h-5 w-5" />
</span>
{SITE.name}
</Link>
<p className="mt-3 text-sm text-slate-600">{SITE.description}</p>
<p className="mt-4 text-xs text-slate-400">Built for the people of Bangladesh.</p>
</div>
{FOOTER_LINKS.map((group) => (
<div key={group.title}>
<h3 className="text-sm font-semibold text-slate-900">{group.title}</h3>
<ul className="mt-3 space-y-2">
{group.links.map((link) => (
<li key={link.href}>
<Link href={link.href} className="text-sm text-slate-600 hover:text-brand-700">
{link.label}
</Link>
</li>
))}
</ul>
</div>
))}
</div>
<div className="border-t border-slate-200">
<div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row">
<p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
<div className="flex gap-4">
<Link href="/privacy-policy" className="hover:text-brand-700">Privacy Policy</Link>
<Link href="/terms" className="hover:text-brand-700">Terms of Use</Link>
<Link href="/about" className="hover:text-brand-700">About</Link>
</div>
</div>
</div>
</footer>
); }
