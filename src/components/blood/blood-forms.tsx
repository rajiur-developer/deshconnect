// @ts-nocheck
"use client";
import { useActionState } from "react";
import {
createBloodRequestAction,
registerDonorAction,
type BloodFormState, } from "@/features/blood/actions"; import { BLOOD_GROUPS } from "@/lib/constants"; import { Button } from "@/components/ui/button"; import { Field, Input, Textarea } from "@/components/ui/input"; import { LocationFields } from "@/components/forms/location-fields"; import { useFormStateToast } from "@/components/ui/toast"; import type { DistrictOption, LocationOption, UpazilaOption } from "@/components/search/directory-filters";
type LocationProps = {
divisions: LocationOption[];
districts: DistrictOption[];
upazilas: UpazilaOption[]; };
const selectClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-ring";
export function DonorForm({ divisions, districts, upazilas }: LocationProps) {
const [state, formAction, pending] = useActionState<BloodFormState, FormData>(registerDonorAction, {});
useFormStateToast(state);
return (
<form action={formAction} className="space-y-4">
<div className="grid gap-3 sm:grid-cols-2">
<Field label="Blood group" htmlFor="bloodGroup" required>
<select id="bloodGroup" name="bloodGroup" required className={selectClass}>
<option value="">Select group</option>
{BLOOD_GROUPS.map((group) => (
<option key={group} value={group}>{group}</option>
))}
</select>
</Field>
<Field label="Availability" htmlFor="availability" required>
<select id="availability" name="availability" defaultValue="available" className={selectClass}>
<option value="available">Ready</option>
<option value="busy">Busy</option>
<option value="unavailable">Not available</option>
</select>
</Field>
<Field label="Preferred contact method" htmlFor="preferredContact" required>
<select id="preferredContact" name="preferredContact" defaultValue="phone" className={selectClass}>
<option value="phone">Phone</option>
<option value="sms">SMS</option>
<option value="email">Email</option>
<option value="in-app">In-app</option>
</select>
</Field>
<Field label="Phone number" htmlFor="phone" hint="Shown publicly on your donor card when you consent below.">
<Input id="phone" name="phone" type="tel" placeholder="01712345678" required />
</Field>
<Field label="WhatsApp number" htmlFor="whatsapp" hint="Shown publicly on your donor card when you consent below.">
<Input id="whatsapp" name="whatsapp" type="tel" placeholder="01712345678" required />
</Field>
<Field label="Other contact info" htmlFor="contactValue" hint="Optional; useful for email or other contact methods.">
<Input id="contactValue" name="contactValue" placeholder="name@example.com" />
</Field>
</div>
<LocationFields divisions={divisions} districts={districts} upazilas={upazilas} current={{}} />
<div className="grid gap-3 sm:grid-cols-2">
<Field label="Last donation date" htmlFor="lastDonationAt" hint="Optional">
<Input id="lastDonationAt" name="lastDonationAt" type="date" />
</Field>
<Field label="Notes" htmlFor="notes" hint="Optional">
<Input id="notes" name="notes" placeholder="What donors should know" />
</Field>
</div>
<div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
<label className="flex items-start gap-2 text-sm text-slate-700">
<input type="checkbox" name="consentListed" required className="mt-1" />
<span>I consent to my name being listed publicly as a blood donor.</span>
</label>
<label className="flex items-start gap-2 text-sm text-slate-700">
<input type="checkbox" name="consentContact" required className="mt-1" />
<span>I consent to showing my phone and WhatsApp numbers publicly on my donor card.</span>
</label>
</div>
{state.error && <p role="alert" className="text-sm text-accent-600">{state.error}</p>}
{state.success && <p role="status" className="text-sm text-emerald-600">{state.success}</p>}
<Button type="submit" disabled={pending}>{pending ? "Saving…" : "Register as donor"}</Button>
</form>
); }
export function BloodRequestForm({ divisions, districts, upazilas }: LocationProps) {
const [state, formAction, pending] = useActionState<BloodFormState, FormData>(createBloodRequestAction, {});
useFormStateToast(state);
return (
<form action={formAction} className="space-y-4">
<div className="grid gap-3 sm:grid-cols-2">
<Field label="Blood group" htmlFor="req-bloodGroup" required>
<select id="req-bloodGroup" name="bloodGroup" required className={selectClass}>
<option value="">Select group</option>
{BLOOD_GROUPS.map((group) => (
<option key={group} value={group}>{group}</option>
))}
</select>
</Field>
<Field label="Number of blood bags" htmlFor="units" required>
<Input id="units" name="units" type="number" min={1} max={20} defaultValue={1} required />
</Field>
</div>
<Field label="Hospital" htmlFor="hospital" required>
<Input id="hospital" name="hospital" placeholder="Hospital or clinic name" required />
</Field>
<div className="grid gap-3 sm:grid-cols-2">
<Field label="Phone number" htmlFor="req-phone" required hint="Shown on your request so donors can call you.">
<Input id="req-phone" name="phone" type="tel" placeholder="01712345678" required />
</Field>
<Field label="WhatsApp number" htmlFor="req-whatsapp" required hint="Shown on your request so donors can message you.">
<Input id="req-whatsapp" name="whatsapp" type="tel" placeholder="01712345678" required />
</Field>
</div>
<div className="grid gap-3 sm:grid-cols-2">
<Field label="Date needed" htmlFor="neededBy" required>
<Input id="neededBy" name="neededBy" type="date" required />
</Field>
<Field label="Patient name" htmlFor="patient" hint="Optional">
<Input id="patient" name="patient" placeholder="Patient" />
</Field>
</div>
<LocationFields divisions={divisions} districts={districts} upazilas={upazilas} current={{}} />
<Field label="Additional info" htmlFor="req-notes" hint="Optional">
<Textarea id="req-notes" name="notes" placeholder="Ward, doctor or other details" />
</Field>
{state.error && <p role="alert" className="text-sm text-accent-600">{state.error}</p>}
{state.success && <p role="status" className="text-sm text-emerald-600">{state.success}</p>}
<Button type="submit" variant="accent" disabled={pending}>{pending ? "Submitting…" : "Post blood request"}</Button>
</form>
); }
