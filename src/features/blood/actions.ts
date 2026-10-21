// @ts-nocheck
"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user"; import { insforge } from "@/lib/insforge"; import { mapDbRow } from "@/lib/db/insforge"; import { formatZodError, bloodRequestSchema, donorSchema, messageSchema } from "@/lib/validation/schemas"; import { sanitizeMultiline, sanitizeText } from "@/lib/security/sanitize"; import { rateLimit } from "@/lib/security/rate-limit"; import { RATES } from "@/lib/constants"; import { notify } from "@/services/notifications"; import { createBloodRequest, upsertDonor } from "@/services/blood";
export type BloodFormState = { error?: string; success?: string };
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
export async function registerDonorAction(_prev: BloodFormState, formData: FormData): Promise<BloodFormState> {
const user = await requireUser();
const parsed = donorSchema.safeParse({
bloodGroup: formData.get("bloodGroup"),
availability: formData.get("availability"),
preferredContact: formData.get("preferredContact"),
contactValue: formData.get("contactValue") || undefined,
phone: formData.get("phone") || undefined,
whatsapp: formData.get("whatsapp") || undefined,
lastDonationAt: formData.get("lastDonationAt") || undefined,
notes: formData.get("notes") || undefined,
divisionId: formData.get("divisionId") || undefined,
districtId: formData.get("districtId") || undefined,
upazilaId: formData.get("upazilaId") || undefined,
consentListed: formData.get("consentListed"),
consentContact: formData.get("consentContact"),
});
if (!parsed.success) {
return { error: formatZodError(parsed.error) };
}
if (!parsed.data.consentListed) {
return { error: "You must consent to being listed as a donor." };
}
if (!parsed.data.consentContact) return { error: "Consent to showing your phone and WhatsApp publicly is required to list your contact details." };
if (!parsed.data.phone || !parsed.data.whatsapp) return { error: "Enter both a phone number and WhatsApp number so donors can reach you." };
await upsertDonor({
userId: user.id,
bloodGroup: parsed.data.bloodGroup,
availability: parsed.data.availability,
preferredContact: parsed.data.preferredContact,
contactValue: sanitizeText(parsed.data.contactValue || parsed.data.phone || parsed.data.whatsapp || "", 200),
phone: parsed.data.phone ? sanitizeText(parsed.data.phone, 30) : undefined,
whatsapp: parsed.data.whatsapp ? sanitizeText(parsed.data.whatsapp, 30) : undefined,
lastDonationAt: parsed.data.lastDonationAt,
notes: parsed.data.notes ? sanitizeText(parsed.data.notes, 500) : undefined,
consentListed: parsed.data.consentListed,
consentContact: parsed.data.consentContact,
divisionId: parsed.data.divisionId,
districtId: parsed.data.districtId,
upazilaId: parsed.data.upazilaId,
});
revalidatePath("/blood-donation");
return { success: "Your donor profile has been saved." }; }
export async function createBloodRequestAction(_prev: BloodFormState, formData: FormData): Promise<BloodFormState> {
const user = await requireUser();
const parsed = bloodRequestSchema.safeParse({
bloodGroup: formData.get("bloodGroup"),
units: formData.get("units"),
patient: formData.get("patient") || undefined,
hospital: formData.get("hospital"),
neededBy: formData.get("neededBy"),
phone: formData.get("phone"),
whatsapp: formData.get("whatsapp"),
notes: formData.get("notes") || undefined,
divisionId: formData.get("divisionId") || undefined,
districtId: formData.get("districtId") || undefined,
upazilaId: formData.get("upazilaId") || undefined,
});
if (!parsed.success) {
return { error: formatZodError(parsed.error) };
}
const limit = rateLimit(`bloodrequest:${user.id}`, RATES.bloodRequestPerHour, 60 * 60_000);
if (!limit.ok) {
return { error: `Too many requests. Try again in ${limit.retryAfterSeconds}s.` };
}
await createBloodRequest({
requesterId: user.id,
bloodGroup: parsed.data.bloodGroup,
units: parsed.data.units,
patient: parsed.data.patient,
hospital: sanitizeText(parsed.data.hospital, 200),
neededBy: parsed.data.neededBy,
    phone: sanitizeText(parsed.data.phone, 30),
    whatsapp: sanitizeText(parsed.data.whatsapp, 30),
notes: parsed.data.notes ? sanitizeText(parsed.data.notes, 1000) : undefined,
location: { divisionId: parsed.data.divisionId, districtId: parsed.data.districtId, upazilaId: parsed.data.upazilaId },
});
await notify(user.id, {
title: "Blood request submitted",
body: "Your request is under review and will be published once approved.",
href: "/my-blood-requests",
});
revalidatePath("/blood-donation");
return { success: "Your blood request has been submitted for review." }; }
export async function cancelBloodRequestAction(requestId: string): Promise<{ cancelled: boolean }> {
const user = await requireUser();
const { data, error } = await insforge
.from("blood_requests")
.update({ status: "cancelled", updated_at: new Date().toISOString() })
.eq("id", requestId)
.eq("requester_id", user.id)
.eq("status", "active")
.select();
if (error) throw error;
if (data?.length) revalidatePath("/blood-donation");
return { cancelled: (data?.length ?? 0) > 0 }; }
export async function releaseDonorContactAction(donorId: string) {
const user = await requireUser();
const { data: donor, error } = await insforge
.from("blood_donors")
.select("id,user_id,phone,whatsapp,blood_group,consent_listed,consent_contact,consent_expiry")
.eq("id", donorId)
.eq("consent_listed", true)
.eq("consent_contact", true)
.single();
if (error || !donor) return null;
const today = new Date().toISOString().slice(0, 10);
const consentExpiry = new Date(donor.consent_expiry).toISOString().slice(0, 10);
if (consentExpiry < today) return null;
const { data: requests } = await insforge
.from("blood_requests")
.select("id")
.eq("requester_id", user.id)
.eq("status", "active")
.eq("blood_group", donor.blood_group)
.gte("needed_by", today);
if (!requests?.length) return null;
return {
phone: donor.phone ?? donor.whatsapp ?? null,
whatsapp: donor.whatsapp ?? donor.phone ?? null,
}; }
export async function releaseRequesterContactAction(requestId: string) {
const user = await requireUser();
const { data: request, error } = await insforge
.from("blood_requests")
.select("*, profiles!inner(*)")
.eq("id", requestId)
.eq("status", "active")
.single();
if (error || !request) return null;
const requester = request.profiles;
if (!requester?.phone) return null;
const today = new Date().toISOString().slice(0, 10);
const { data: donor } = await insforge
.from("blood_donors")
.select("id")
.eq("user_id", user.id)
.eq("consent_listed", true)
.maybeSingle();
const { data: viewerRequest } = await insforge
.from("blood_requests")
.select("id")
.eq("requester_id", user.id)
.eq("status", "active")
.eq("blood_group", request.blood_group)
.gte("needed_by", today)
.maybeSingle();
if (!donor && !viewerRequest) return null;
return {
phone: request.phone ?? requester.phone ?? null,
whatsapp: request.whatsapp ?? requester.whatsapp ?? request.phone ?? requester.phone ?? null,
}; }
export async function startBloodChatAction(
targetType: "donor" | "request",
targetId: string ): Promise<{ conversationId?: string; error?: string }> {
const user = await requireUser();
if (targetType !== "donor" && targetType !== "request") {
return { error: "Invalid blood listing." };
}
let targetUserId: string | null = null;
if (targetType === "donor") {
const { data: donor } = await insforge
.from("blood_donors")
.select("user_id")
.eq("id", targetId)
.eq("consent_listed", true)
.single();
targetUserId = donor?.user_id ?? null;
} else {
const { data: request } = await insforge
.from("blood_requests")
.select("requester_id")
.eq("id", targetId)
.eq("status", "active")
.single();
targetUserId = request?.requester_id ?? null;
}
if (!targetUserId || targetUserId === user.id) {
return { error: "This blood listing is no longer available for chat." };
}
// Check if conversation already exists
const { data: existingConv } = await insforge
.from("conversations")
.select("id")
.eq("conversation_type", "blood")
.eq("blood_target_type", targetType)
.eq("blood_target_id", targetId)
.filter("participant_ids", "cs", `{${user.id}}`)
.filter("participant_ids", "cs", `{${targetUserId}}`)
.maybeSingle();
if (existingConv) {
return { conversationId: existingConv.id };
}
const { data: conv, error } = await insforge
.from("conversations")
.insert({ participant_ids: [user.id, targetUserId], conversation_type: "blood", blood_target_type: targetType, blood_target_id: targetId })
.select()
.single();
if (error) throw error;
return { conversationId: conv.id }; }
export async function getBloodChatMessagesAction(conversationId: string) {
const user = await requireUser();
const conversation = await insforge
.from("conversations")
.select("*")
.eq("id", conversationId)
.eq("conversation_type", "blood")
.filter("participant_ids", "cs", `{${user.id}}`)
.single();
if (!conversation) return { error: "You are not a participant in this conversation." };
const { data: messages, error } = await insforge
.from("messages")
.select("*")
.eq("conversation_id", conversationId)
.order("created_at", { ascending: true });
if (error) throw error;
return { messages: (messages ?? []).map((message: any) => ({ id: message.id, conversationId: message.conversation_id, senderId: message.sender_id, body: message.body, createdAt: message.created_at })) }; }
export async function sendBloodChatMessageAction(conversationId: string, body: string) {
const user = await requireUser();
const { data: conversation } = await insforge.from("conversations").select("id").eq("id", conversationId).eq("conversation_type", "blood").filter("participant_ids", "cs", `{${user.id}}`).maybeSingle();
if (!conversation) return { error: "You are not a participant in this blood donation chat." };
const parsed = messageSchema.safeParse({ body });
if (!parsed.success) return { error: formatZodError(parsed.error) };
const limit = rateLimit(`bloodchat:${user.id}`, RATES.bloodChatPerMinute, 60_000);
if (!limit.ok) return { error: `Too many messages. Try again in ${limit.retryAfterSeconds}s.` };
const { data: message, error } = await insforge
.from("messages")
.insert({
conversation_id: conversationId,
sender_id: user.id,
body: sanitizeMultiline(parsed.data.body, 2000),
})
.select()
.single();
if (!message) return { error: "You are not a participant in this conversation." };
return { message: { id: message.id, conversationId: message.conversation_id, senderId: message.sender_id, body: message.body, createdAt: message.created_at } }; }
