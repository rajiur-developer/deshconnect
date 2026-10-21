// @ts-nocheck
import Link from "next/link";
import { getDatabase } from "@/lib/db/store"; import { getDirectoryLocationOptions } from "@/services/locations"; import { Badge, Card } from "@/components/ui/badge"; import { PageHeader } from "@/components/layout/page-header"; import { PlaceForm } from "@/components/admin/place-form"; import { RecordActions } from "@/components/admin/record-actions"; import { placeCategoryLabel } from "@/components/cards/place-card";
export const metadata = { title: "Tourism" };
export default async function AdminTourismPage() {
const [db, options] = await Promise.all([getDatabase(), getDirectoryLocationOptions()]);
const places = [...db.places].sort((a, b) => b.rating - a.rating);
return (
<>
<PageHeader title="Tourism" description="Manage the tourism directory and destination content." />
<Card className="overflow-x-auto p-0">
<table className="min-w-full divide-y divide-slate-100 text-sm">
<thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
<tr>
<th className="px-4 py-3">Destination</th>
<th className="px-4 py-3">Category</th>
<th className="px-4 py-3">Rating</th>
<th className="px-4 py-3">Reviews</th>
<th className="px-4 py-3">Actions</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-100">
{places.map((place) => (
<tr key={place.id}>
<td className="px-4 py-3">
<Link href={`/places/${place.slug}`} className="font-medium text-slate-900 hover:text-brand-700">{place.name}</Link>
</td>
<td className="px-4 py-3 text-slate-600">{placeCategoryLabel(place.category)}</td>
<td className="px-4 py-3"><Badge tone="amber">{place.rating.toFixed(1)}</Badge></td>
<td className="px-4 py-3 text-slate-600">{place.reviewCount}</td>
<td className="px-4 py-3">
<RecordActions entity="place" id={place.id} status={place.status}>
<PlaceForm
divisions={options.divisions}
districts={options.districts}
upazilas={options.upazilas}
record={place}
/>
</RecordActions>
</td>
</tr>
))}
</tbody>
</table>
</Card>
</>
); }
