// @ts-nocheck
import { getDatabase } from "@/lib/db/store"; import { Badge, Card } from "@/components/ui/badge"; import { PageHeader } from "@/components/layout/page-header"; import { maskPhone } from "@/lib/utils";
export const metadata = { title: "Blood Donors" };
export default async function AdminBloodDonorsPage() {
const db = await getDatabase();
const userById = new Map(db.users.map((user) => [user.id, user]));
const donors = [...db.donors].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
return (
<>
<PageHeader
title="Blood Donors"
description="Manage donor records within authorised limits. Contact values are masked in this view."
/>
<Card className="overflow-x-auto p-0">
<table className="min-w-full divide-y divide-slate-100 text-sm">
<thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
<tr>
<th className="px-4 py-3">Donor</th>
<th className="px-4 py-3">Group</th>
<th className="px-4 py-3">Availability</th>
<th className="px-4 py-3">Consent</th>
<th className="px-4 py-3">Contact (masked)</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-100">
{donors.map((donor) => {
const user = userById.get(donor.userId);
return (
<tr key={donor.id}>
<td className="px-4 py-3">
<p className="font-medium text-slate-900">{user?.fullName ?? donor.userId}</p>
<p className="text-xs text-slate-500">@{user?.username}</p>
</td>
<td className="px-4 py-3"><Badge tone="brand">{donor.bloodGroup}</Badge></td>
<td className="px-4 py-3 capitalize text-slate-600">{donor.availability}</td>
<td className="px-4 py-3">
<div className="flex gap-1">
<Badge tone={donor.consentListed ? "success" : "neutral"}>listed</Badge>
<Badge tone={donor.consentContact ? "success" : "neutral"}>contact</Badge>
</div>
</td>
<td className="px-4 py-3 text-slate-600">{maskPhone(donor.contactValue)}</td>
</tr>
);
})}
</tbody>
</table>
</Card>
</>
); }
