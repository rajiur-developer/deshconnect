// @ts-nocheck
import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user"; import { listSavedPlaces } from "@/services/places"; import { listPosts, listUserComments } from "@/services/community"; import { listNotifications } from "@/services/notifications"; import { listUserBloodRequests } from "@/services/blood"; import { AccountShell } from "@/components/layout/account-shell"; import { Badge, Card } from "@/components/ui/badge"; import { Icon } from "@/components/ui/icons";
export const metadata = { title: "Dashboard", robots: { index: false, follow: false } };
export default async function DashboardPage() {
const user = await requireUser("/dashboard");
const [saved, posts, comments, notifications, requests] = await Promise.all([
listSavedPlaces(user.id),
listPosts({ authorId: user.id }).then((result) => result.items),
listUserComments(user.id),
listNotifications(user.id),
listUserBloodRequests(user.id),
]);
const stats = [
{ label: "Saved places", value: saved.length, href: "/saved", icon: "save" as const },
{ label: "Your posts", value: posts.length, href: "/my-posts", icon: "message" as const },
{ label: "Your comments", value: comments.length, href: "/my-comments", icon: "edit" as const },
{ label: "Unread notifications", value: notifications.filter((item) => !item.read).length, href: "/notifications", icon: "bell" as const },
{ label: "Active blood requests", value: requests.filter((item) => item.status === "active").length, href: "/my-blood-requests", icon: "droplet" as const },
];
const quickLinks = [
{ href: "/places", label: "Visit places" },
{ href: "/blood-donation", label: "Blood donation" },
{ href: "/community", label: "Community" },
{ href: "/news", label: "News" },
];
return (
<AccountShell user={user} title="Dashboard" description="Summary of your activity on DeshConnect.">
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
{stats.map((stat) => (
<Link key={stat.label} href={stat.href} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-300">
<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
<Icon name={stat.icon} className="h-5 w-5" />
</span>
<p className="mt-3 text-2xl font-bold text-slate-900">{stat.value}</p>
<p className="text-sm text-slate-600">{stat.label}</p>
</Link>
))}
</div>
<Card className="mt-6 p-5">
<h2 className="font-semibold text-slate-900">Quick links</h2>
<div className="mt-3 flex flex-wrap gap-2">
{quickLinks.map((link) => (
<Link key={link.href} href={link.href} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700">
{link.label}
</Link>
))}
</div>
</Card>
<Card className="mt-6 p-5">
<div className="flex items-center justify-between">
<h2 className="font-semibold text-slate-900">Recent notifications</h2>
<Badge tone="brand">{notifications.filter((item) => !item.read).length} unread</Badge>
</div>
<ul className="mt-3 space-y-2">
{notifications.slice(0, 5).map((notification) => (
<li key={notification.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
<Icon name="bell" className="mt-0.5 h-4 w-4 text-brand-600" />
<div>
<p className="text-sm font-medium text-slate-900">{notification.title}</p>
<p className="text-sm text-slate-600">{notification.body}</p>
</div>
</li>
))}
{notifications.length === 0 && <li className="text-sm text-slate-600">No notifications yet.</li>}
</ul>
</Card>
</AccountShell>
); }
