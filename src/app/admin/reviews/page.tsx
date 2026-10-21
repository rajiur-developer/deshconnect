// @ts-nocheck
import Link from "next/link";
import { getDatabase } from "@/lib/db/store"; import { Badge, Card } from "@/components/ui/badge"; import { PageHeader } from "@/components/layout/page-header"; import { ReviewStatusButton } from "@/components/admin/admin-client"; import { relativeTime } from "@/lib/utils";
export const metadata = { title: "Reviews" };
export default async function AdminReviewsPage() {
const db = await getDatabase();
const reviews = [...db.reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const placeById = new Map(db.places.map((place) => [place.id, place]));
return (
<>
<PageHeader title="Reviews" description="Moderate reviews submitted by the community." />
<div className="space-y-3">
{reviews.map((review) => {
const place = placeById.get(review.placeId);
return (
<Card key={review.id} className="p-5">
<div className="flex items-start justify-between gap-3">
<div>
<div className="flex items-center gap-2">
<Badge tone={review.status === "visible" ? "success" : "neutral"}>{review.status}</Badge>
<span className="text-xs text-amber-500">★ {review.rating}</span>
<span className="text-xs text-slate-500">{relativeTime(review.createdAt)}</span>
</div>
<p className="mt-2 font-medium text-slate-900">{review.title}</p>
<p className="text-sm text-slate-600">{review.body}</p>
{place && (
<Link href={`/places/${place.slug}`} className="mt-1 inline-block text-xs font-medium text-brand-700">
{place.name}
</Link>
)}
</div>
<ReviewStatusButton id={review.id} status={review.status} />
</div>
</Card>
);
})}
</div>
</>
); }
