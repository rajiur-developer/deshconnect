import Link from "next/link";
import type { ReactNode } from "react";
import { CATEGORY_SHORTCUTS, SITE } from "@/config/site"; import { listBloodRequests, listPublicDonors } from "@/services/blood"; import { listGovernmentServices } from "@/services/government-services"; import { listInstitutions } from "@/services/institutions"; import { featuredPlaces } from "@/services/places"; import { listDivisions } from "@/services/locations"; import { listNews } from "@/services/news"; import { listPosts } from "@/services/community"; import { getCurrentUser } from "@/lib/auth/current-user"; import { Badge, Section } from "@/components/ui/badge"; import { CategoryCard } from "@/components/cards/category-card"; import { InstitutionCard } from "@/components/cards/institution-card"; import { NewsCard } from "@/components/cards/news-card"; import { PlaceCard } from "@/components/cards/place-card"; import { BloodRequestCard } from "@/components/blood/blood-request-card"; import { DonorCard } from "@/components/blood/donor-card"; import { Icon } from "@/components/ui/icons"; import { HeroSearch } from "@/components/search/hero-search"; import { ListGrid } from "@/components/layout/list-grid"; import { VideoBackground } from "@/components/layout/video-background";
export const metadata = {
title: SITE.name,
description: SITE.description, };
async function loadOr<T>(promise: Promise<T>, fallback: T, timeoutMs = 2500): Promise<T> {
let timer: ReturnType<typeof setTimeout> | undefined;
try {
return await Promise.race([promise, new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), timeoutMs); })]);
} catch {
return fallback;
} finally {
if (timer) clearTimeout(timer);
}
}
function EmptyState({ title, children }: { title: string; children: ReactNode }) {
return <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-8 text-center"><p className="font-semibold text-slate-800">{title}</p><p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">{children}</p></div>;
}
export default async function HomePage() {
const user = await loadOr(getCurrentUser(), null);
const [divisions, featured, institutions, services, donors, requests, posts, news] = await Promise.all([
loadOr(listDivisions(), []),
loadOr(featuredPlaces(6), []),
loadOr(listInstitutions({ page: 1, pageSize: 4 }).then((result) => result.items.slice(0, 4)), []),
loadOr(listGovernmentServices({ page: 1, pageSize: 4 }).then((result) => result.items.slice(0, 4)), []),
loadOr(listPublicDonors({}).then((items) => items.slice(0, 3)), []),
loadOr(listBloodRequests({}).then((items) => items.slice(0, 3)), []),
loadOr(listPosts({ page: 1, pageSize: 3 }).then((result) => result.items.slice(0, 3)), []),
loadOr(listNews({ page: 1, pageSize: 3 }).then((result) => result.items.slice(0, 3)), []),
]);
const divisionCards = divisions;
return (
<>
{/* Hero */}
<section className="relative isolate overflow-hidden bg-brand-950">
<VideoBackground src="/images/banner/homePage.mp4" className="bg-brand-950" />
<div className="absolute inset-0 bg-gradient-to-b from-brand-950/55 via-brand-900/50 to-brand-950/75" />
<div className="container-x relative flex min-h-[60vh] flex-col items-center justify-center py-12 sm:py-16">
<div className="enter-fade mx-auto max-w-3xl text-center">
<Badge tone="accent" className="bg-white/15 text-white ring-white/20">
Bangladesh's information and community platform             </Badge>             <h2 className="mt-4 text-2xl font-bold text-white sm:text-4xl">               Find places, services, blood donors, hospitals, emergency help, and people across Bangladesh <br/> all in one place.
</h2>
<p className="mt-4 text-sm text-brand-50">
Search places, blood donation, blood request, educational institutions, hospitals, businesses and government services by division, district and upazila.
</p>
<div className="mt-8">
<HeroSearch divisions={divisions} user={user} />
</div>
<div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-brand-50">
<Link href="/places" className="rounded-lg bg-white px-4 py-2 font-semibold text-brand-700 hover:bg-brand-50">
Visit places
</Link>
{!user && (
<>
<Link href="/login" className="rounded-lg border border-white/40 px-4 py-2 font-semibold text-white hover:bg-white/10">
Login
</Link>
<Link href="/register" className="rounded-lg border border-white/40 px-4 py-2 font-semibold text-white hover:bg-white/10">
Register
</Link>
</>
)}
</div>
</div>
</div>
</section>
<Section title="Explore Bangladesh" description="First choose a division, then district and upazila.">
<ListGrid>
{divisionCards.map((division) => (
<Link
key={division.id}
href={`/divisions/${division.slug}`}
className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
>
<div>
<h3 className="font-semibold text-slate-900 group-hover:text-brand-700">{division.name}</h3>
<p className="mt-1 text-sm text-slate-500">{division.districtsCount} districts</p>
</div>
<Icon name="arrow-right" className="h-5 w-5 text-slate-300 group-hover:text-brand-600" />
</Link>
))}
{divisionCards.length === 0 && <EmptyState title="Bangladesh location guides are coming soon">Division, district and upazila guides will appear here when available. The site search and category links are ready to use.</EmptyState>}
</ListGrid>
</Section>
{/* Categories */}
<div className="bg-white">
<Section title="What are you looking for?" description="Go directly to your list of needs.">
<ListGrid className="sm:grid-cols-2 lg:grid-cols-4">
{CATEGORY_SHORTCUTS.map((item) => (
<CategoryCard key={item.href} item={item} />
))}
</ListGrid>
</Section>
</div>
{/* Popular places */}
<Section
title="Find your next favorite place"
description="Selected destinations across the country."
action={<Link href="/places" className="text-sm font-medium text-brand-700 hover:text-brand-800">View all places →</Link>}
>
<ListGrid>
{featured.map((place) => (
<PlaceCard key={place.id} place={place} locationLabel={(place.address ?? "").split(",").slice(-2).join(",").trim()} />
))}
{featured.length === 0 && <EmptyState title="Places are being prepared">Tourism and place listings will appear here once content is available.</EmptyState>}
</ListGrid>
</Section>
{/* Institutions & services */}
<div className="bg-white">
<Section
title="Local institutions & services"
description="Schools, hospitals, health centers and government offices near you."
action={<Link href="/institutions" className="text-sm font-medium text-brand-700 hover:text-brand-800">View institutions →</Link>}
>
<ListGrid>
{institutions.map((institution) => (
<InstitutionCard key={institution.id} institution={institution} />
))}
{institutions.length === 0 && <EmptyState title="Institution listings are coming soon">Schools, hospitals and local institutions will appear here as listings are added.</EmptyState>}
</ListGrid>
</Section>
<Section
title="Government services"
description="Government offices and required documents."
action={<Link href="/government-services" className="text-sm font-medium text-brand-700 hover:text-brand-800">All services →</Link>}
>
<ListGrid>
{services.map((service) => (
<Link key={service.id} href={`/government-services/${service.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
<div className="flex items-center gap-3">
<span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
<Icon name="landmark" className="h-5 w-5" />
</span>
<div>
<h3 className="font-semibold text-slate-900 group-hover:text-brand-700">{service.name}</h3>
<p className="text-sm text-slate-500">{service.officeAddress}</p>
</div>
</div>
</Link>
))}
{services.length === 0 && <EmptyState title="Government service guides are coming soon">Service details and required documents will appear here once published.</EmptyState>}
</ListGrid>
</Section>
</div>
{/* Blood donation */}
<div className="blood-theme">
<Section title="Blood donation" description="Find voluntary blood donors or post a request. Contact details are kept private until a request is approved.">
<div className="grid gap-8 lg:grid-cols-2">
<div>
<div className="mb-3 flex items-center justify-between">
<h3 className="font-semibold text-slate-900">Ready donors</h3>
<Link href="/blood-donation" className="text-sm font-semibold text-accent-600 hover:text-accent-700">Find donors →</Link>
</div>
<div className="grid gap-4 sm:grid-cols-2">
{donors.map((donor) => (
<DonorCard key={donor.id} donor={donor} />
))}
{donors.length === 0 && <EmptyState title="No donor profiles yet">The donor directory is ready. Donor profiles will appear here when people register.</EmptyState>}
</div>
</div>
<div>
<div className="mb-3 flex items-center justify-between">
<h3 className="font-semibold text-slate-900">Active requests</h3>
<Link href="/blood-donation" className="text-sm font-medium text-brand-700">Post a blood request →</Link>
</div>
<div className="grid gap-4 sm:grid-cols-2">
{requests.map((request) => (
<BloodRequestCard key={request.id} request={request} />
))}
{requests.length === 0 && <EmptyState title="No active blood requests">The request board is ready. Active requests will appear here when submitted.</EmptyState>}
</div>
</div>
</div>
<div className="mt-6 flex flex-wrap gap-3">
<Link href="/blood-donation" className="btn-grad-accent rounded-lg px-4 py-2 text-sm font-medium text-white">
Register as donor
</Link>
<Link href="/blood-donation" className="rounded-lg border border-accent-100 bg-accent-50 px-4 py-2 text-sm font-medium text-accent-700 hover:bg-accent-100">
Post blood request
</Link>
</div>
</Section>
</div>
{/* Community & news */}
<div className="bg-white">
<Section title="Community activity & latest news" description="When community members come together, good things happen.">
<div className="grid gap-8 lg:grid-cols-2">
<div>
<div className="mb-3 flex items-center justify-between">
<h3 className="font-semibold text-slate-900">Community activity</h3>
<Link href="/community" className="text-sm font-medium text-brand-700">Join discussion →</Link>
</div>
<div className="space-y-3">
{posts.map((post) => (
<Link key={post.id} href={`/community/${post.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-300">
<p className="text-sm text-slate-700 line-clamp-2">{post.body}</p>
<p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
<Icon name="heart" className="h-3.5 w-3.5" /> {post.reactions}
<span>·</span>
<Icon name="message" className="h-3.5 w-3.5" /> comments
</p>
</Link>
))}
{posts.length === 0 && <EmptyState title="Community posts are coming soon">The discussion area is ready. Posts will appear here when community members join.</EmptyState>}
</div>
</div>
<div>
<div className="mb-3 flex items-center justify-between">
<h3 className="font-semibold text-slate-900">Latest news</h3>
<Link href="/news" className="text-sm font-medium text-brand-700">All news →</Link>
</div>
<ListGrid className="sm:grid-cols-1">
{news.map((item) => (
<NewsCard key={item.id} news={item} />
))}
{news.length === 0 && <EmptyState title="News and blog posts are coming soon">Published news and community stories will appear here when available.</EmptyState>}
</ListGrid>
</div>
</div>
</Section>
</div>
{/* Join */}
<section className="gradient-band">
<div className="container-x py-14 text-center text-white">
<h2 className="text-2xl font-bold sm:text-3xl">Join DeshConnect</h2>
<p className="mx-auto mt-3 max-w-xl text-brand-50">
Save places, join the community, submit news, register as a blood donor and connect with people around you.
</p>
<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
<Link href="/register" className="rounded-lg bg-white px-5 py-3 font-semibold text-brand-700 hover:bg-brand-50">
Create account
</Link>
<Link href="/about" className="rounded-lg border border-white/40 px-5 py-3 font-semibold text-white hover:bg-white/10">
Learn more
</Link>
</div>
</div>
</section>
</>
); }
