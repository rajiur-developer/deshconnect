// @ts-nocheck
"use client";
import Link from "next/link"; import { useActionState } from "react";
import { googleOAuthAction, registerAction, resendRegistrationCodeAction, verifyRegistrationAction, type FormState } from "@/features/auth/actions"; import { BLOOD_GROUPS, GENDERS } from "@/lib/constants"; import { Button } from "@/components/ui/button"; import { Field, Input } from "@/components/ui/input"; import { LocationFields } from "@/components/forms/location-fields"; import { useFormStateToast } from "@/components/ui/toast"; import type { DistrictOption, LocationOption, UpazilaOption } from "@/components/search/directory-filters";
type Props = {
divisions: LocationOption[];
districts: DistrictOption[];
upazilas: UpazilaOption[]; };
const selectClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-ring";
export function RegisterForm({ divisions, districts, upazilas }: Props) {
const [state, formAction, pending] = useActionState<FormState, FormData>(registerAction, {});
const [verifyState, verifyAction, verifyPending] = useActionState<FormState, FormData>(verifyRegistrationAction, {});
const [resendState, resendAction, resendPending] = useActionState<FormState, FormData>(resendRegistrationCodeAction, {});
useFormStateToast(state);
useFormStateToast(verifyState);
useFormStateToast(resendState);
if (state.verificationRequired) {
const fields = ["fullName", "username", "phone", "divisionId", "districtId", "upazilaId", "bloodGroup", "gender", "dateOfBirth", "termsAccepted"] as const;
return <div><form action={verifyAction} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
<h1 className="text-2xl font-bold text-slate-900">Verify your email</h1>
<p className="mt-2 text-sm text-slate-600">Enter the 6-digit code we sent to <strong>{state.email}</strong>.</p>
<input type="hidden" name="email" value={state.email ?? ""} />
{fields.map((key) => <input key={key} type="hidden" name={key} value={state[key] ?? ""} />)}
<div className="mt-6"><Field label="Verification code" htmlFor="otp" required><Input id="otp" name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="123456" /></Field></div>
{verifyState.error && <p role="alert" className="mt-4 rounded-lg bg-accent-500/10 px-3 py-2 text-sm text-accent-600">{verifyState.error}</p>}
<div className="mt-6"><Button type="submit" className="w-full" disabled={verifyPending}>{verifyPending ? "Verifying…" : "Verify email"}</Button></div>
<p className="mt-4 text-center text-sm text-slate-600"><Link href="/login" className="text-brand-700">Return to login</Link></p>
</form><form action={resendAction} className="mt-3 text-center">
<input type="hidden" name="email" value={state.email ?? ""} />
<button type="submit" disabled={resendPending} className="text-sm font-medium text-brand-700 hover:text-brand-800">{resendPending ? "Sending…" : "Resend verification code"}</button>
{resendState.error && <p role="alert" className="mt-2 text-sm text-accent-600">{resendState.error}</p>}
{resendState.success && <p role="status" className="mt-2 text-sm text-emerald-700">{resendState.success}</p>}
</form></div>;
}
return (<div>
<form action={formAction} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
<h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
<p className="mt-1 text-sm text-slate-600">Join DeshConnect to take part, save places, and get more out of it.</p>
<div className="mt-6 grid gap-4 sm:grid-cols-2">
<Field label="Full name" htmlFor="fullName" required>
<Input id="fullName" name="fullName" required placeholder="Your full name" />
</Field>
<Field label="Username" htmlFor="username" required hint="3–24 lowercase letters, numbers, or underscores">
<Input id="username" name="username" required placeholder="your_name" />
</Field>
<Field label="Email" htmlFor="email" required>
<Input id="email" name="email" type="email" required placeholder="you@example.com" />
</Field>
<Field label="Phone" htmlFor="phone" hint="Optional, e.g. 01712345678">
<Input id="phone" name="phone" type="tel" placeholder="01712345678" />
</Field>
<Field label="Password" htmlFor="password" required hint="At least 8 characters">
<Input id="password" name="password" type="password" autoComplete="new-password" required />
</Field>
<Field label="Confirm password" htmlFor="confirmPassword" required>
<Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
</Field>
</div>
<div className="mt-4">
<p className="mb-1.5 text-sm font-medium text-slate-700">Address</p>
<LocationFields divisions={divisions} districts={districts} upazilas={upazilas} current={{}} />
</div>
<div className="mt-4 grid gap-4 sm:grid-cols-3">
<Field label="Blood group" htmlFor="bloodGroup" hint="Optional">
<select id="bloodGroup" name="bloodGroup" className={selectClass}>
<option value="">Select</option>
{BLOOD_GROUPS.map((group) => (
<option key={group} value={group}>{group}</option>
))}
</select>
</Field>
<Field label="Gender" htmlFor="gender" hint="Optional">
<select id="gender" name="gender" className={selectClass}>
<option value="">Select</option>
{GENDERS.map((gender) => (
<option key={gender.value} value={gender.value}>{gender.label}</option>
))}
</select>
</Field>
<Field label="Date of birth" htmlFor="dateOfBirth" hint="Optional">
<Input id="dateOfBirth" name="dateOfBirth" type="date" />
</Field>
</div>
<div className="mt-4">
<label className="flex items-start gap-2 text-sm text-slate-700">
<input type="checkbox" name="termsAccepted" className="mt-1" required />
<span>
I agree to the <Link href="/terms" className="text-brand-700">Terms of Use</Link> and{" "}
<Link href="/privacy-policy" className="text-brand-700">Privacy Policy</Link>.
</span>
</label>
</div>
{state.error && <p role="alert" className="mt-4 rounded-lg bg-accent-500/10 px-3 py-2 text-sm text-accent-600">{state.error}</p>}
<div className="mt-6">
<Button type="submit" className="w-full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</Button>
</div>
<p className="mt-4 text-center text-sm text-slate-600">
Already have an account? <Link href="/login" className="text-brand-700">Log in</Link>
</p>
</form>
<div className="my-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or sign up with<span className="h-px flex-1 bg-slate-200" /></div>
<form action={googleOAuthAction}><Button type="submit" variant="outline" className="w-full">Continue with Google</Button></form>
</div>); }
