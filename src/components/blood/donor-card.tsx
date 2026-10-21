// @ts-nocheck
import type { PublicDonor } from "@/types/blood";
import { Badge, Card } from "@/components/ui/badge"; import { Icon } from "@/components/ui/icons"; import { BloodGroupBadge } from "./blood-group-badge";
const AVAILABILITY_TONE: Record<PublicDonor["availability"], "success" | "amber" | "neutral"> = {
available: "success",
busy: "amber",
unavailable: "neutral", };
const AVAILABILITY_LABEL: Record<PublicDonor["availability"], string> = {
available: "Ready",
busy: "Busy",
unavailable: "Not available", };
const CONTACT_LABEL: Record<string, string> = {
phone: "Phone",
sms: "SMS",
email: "Email",
"in-app": "In-app", };
export function DonorCard({
donor,
locationLabel,
action, }: {
donor: PublicDonor;
locationLabel?: string;
action?: React.ReactNode; }) {
return (
<Card className="flex h-full flex-col p-4">
<div className="flex items-start gap-3">
<BloodGroupBadge group={donor.bloodGroup} />
<div className="min-w-0">
<p className="text-sm font-semibold text-slate-900">{donor.fullName}</p>
<p className="text-xs text-slate-500">{donor.donationCount} donations</p>
</div>
</div>
<div className="mt-3 flex flex-wrap items-center gap-2">
<Badge tone={AVAILABILITY_TONE[donor.availability]}>
{AVAILABILITY_LABEL[donor.availability]}
</Badge>
<Badge tone="neutral">{CONTACT_LABEL[donor.preferredContact] ?? donor.preferredContact}</Badge>
</div>
{locationLabel && (
<p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
<Icon name="map-pin" className="h-3.5 w-3.5" />
{locationLabel}
</p>
)}
<p className="mt-3 text-xs text-slate-400">
Phone and WhatsApp are public because this donor opted in to sharing them.
</p>
{action && <div className="mt-auto pt-4">{action}</div>}
</Card>
); }
