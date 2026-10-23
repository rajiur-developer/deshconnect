// @ts-nocheck
import Link from "next/link"; import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user"; import { can } from "@/lib/auth/permissions"; import { getRolePermissionOverrides } from "@/services/role-permissions"; import { Icon } from "@/components/ui/icons";
const NAV = [
{ href: "/admin", label: "Dashboard" },
{ href: "/admin/users", label: "Users" },
{ href: "/admin/roles", label: "Roles" },
{ href: "/admin/permissions", label: "Permissions" },
{ href: "/admin/locations", label: "Locations" },
{ href: "/admin/places", label: "Places" },
{ href: "/admin/categories", label: "Content Categories" },
{ href: "/admin/tourism", label: "Tourism" },
{ href: "/admin/businesses", label: "Businesses" },
{ href: "/admin/government-services", label: "Government Services" },
{ href: "/admin/news?view=requests", label: "News Requests" },
{ href: "/admin/news?view=all", label: "News" },
{ href: "/admin/community", label: "Community" },
{ href: "/admin/blood-donors", label: "Blood Donors" },
{ href: "/admin/blood-requests", label: "Blood Requests" },
{ href: "/admin/blood-alerts", label: "Emergency Alerts" },
{ href: "/admin/connections", label: "Connections" },
{ href: "/admin/reports", label: "Reports" },
{ href: "/admin/reviews", label: "Reviews" },
{ href: "/admin/media", label: "Media" },
{ href: "/admin/notifications", label: "Notifications" },
{ href: "/admin/audit-logs", label: "Audit Logs" },
{ href: "/admin/settings", label: "Settings" }, ];
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
const user = await getCurrentUser();
const overrides = user ? await getRolePermissionOverrides() : {};
const staff = user && can(user.role, "moderation:posts", overrides);
if (!user || !staff) redirect("/");
return (
<div className="bg-slate-100" data-no-translate>
<div className="border-b border-slate-200 bg-slate-900 text-white">
<div className="container-x flex h-12 items-center gap-3">
<Icon name="shield" className="h-5 w-5 text-brand-300" />
<span className="font-semibold">Admin Panel</span>
<span className="text-xs text-slate-400">{user.role}</span>
<Link href="/" className="ml-auto text-xs text-slate-300 hover:text-white">← Back to site</Link>
</div>
</div>
<div className="container-x grid gap-6 py-6 lg:grid-cols-5">
<aside className="lg:col-span-1">
<nav className="rounded-2xl border border-slate-200 bg-white p-2 lg:sticky lg:top-20" aria-label="Admin">
{NAV.filter((item) => user.role === "admin" || !["/admin/permissions", "/admin/categories"].includes(item.href)).map((item) => (
<Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
{item.label}
</Link>
))}
</nav>
</aside>
<div className="lg:col-span-4">{children}</div>
</div>
</div>
); }
