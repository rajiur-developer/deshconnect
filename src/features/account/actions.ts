// @ts-nocheck
"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import { PROFILE_IMAGE_BUCKET, PROFILE_IMAGE_MAX_BYTES, PROFILE_IMAGE_TYPES } from "@/features/account/constants";
import { messageSchema } from "@/lib/validation/schemas";
import { sanitizeMultiline } from "@/lib/security/sanitize";
import { rateLimit } from "@/lib/security/rate-limit";
import { RATES } from "@/lib/constants";
import { requireUser } from "@/lib/auth/current-user"; import { insforge } from "@/lib/insforge"; import { mapDbRow } from "@/lib/db/insforge"; import {
cancelConnection,
getOrCreateConversation,
requestConnection,
respondToConnection,
sendMessage, } from "@/services/messaging"; import { markAllNotificationsRead, markNotificationRead } from "@/services/notifications"; import { deletePost } from "@/services/community"; import { formatZodError, profileSchema } from "@/lib/validation/schemas"; import { sanitizeText } from "@/lib/security/sanitize"; import { recordAudit } from "@/services/audit"; import type { PublicUser } from "@/types/auth";
export type AccountFormState = { error?: string; success?: string };
export async function updateProfileAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
const user = await requireUser();
const avatarUrl = String(formData.get("avatar") ?? "").trim();
const avatarKey = String(formData.get("avatar_key") ?? "").trim();
const avatarMimeType = String(formData.get("avatar_mime_type") ?? "").trim();
const avatarSize = Number(formData.get("avatar_size") ?? 0);
const hasNewAvatar = Boolean(avatarUrl || avatarKey || avatarMimeType || avatarSize);
if (hasNewAvatar) {
let trustedUrl = false;
try { trustedUrl = new URL(avatarUrl).origin === new URL(process.env.NEXT_PUBLIC_INSFORGE_URL!).origin; } catch { trustedUrl = false; }
const parts = avatarKey.split("/");
const safeKey = avatarKey.startsWith(`${user.id}/`) && parts.length === 2 && /^[a-zA-Z0-9._-]{1,180}$/.test(parts[1] ?? "");
if (!trustedUrl || !safeKey || !PROFILE_IMAGE_TYPES.includes(avatarMimeType as (typeof PROFILE_IMAGE_TYPES)[number]) || !Number.isInteger(avatarSize) || avatarSize < 1 || avatarSize > PROFILE_IMAGE_MAX_BYTES) {
return { error: "The selected profile image is invalid. Choose a JPG, JPEG, or PNG image up to 5 MB." };
}
}
const parsed = profileSchema.safeParse({
fullName: formData.get("fullName"),
bio: formData.get("bio") || undefined,
phone: formData.get("phone") || undefined,
avatar: formData.get("avatar") || undefined,
divisionId: formData.get("divisionId") || undefined,
districtId: formData.get("districtId") || undefined,
upazilaId: formData.get("upazilaId") || undefined,
});
if (!parsed.success) return { error: formatZodError(parsed.error) };
const client = createServerClient({ cookies: await cookies() });
const { data: previousProfile, error: profileReadError } = await client.database.from("profiles").select("avatar_key").eq("id", user.id).maybeSingle();
if (profileReadError) return { error: "Could not load your profile. Please try again." };
const update: Record<string, unknown> = {
full_name: sanitizeText(parsed.data.fullName, 120),
bio: parsed.data.bio ? sanitizeText(parsed.data.bio, 500) : undefined,
phone: parsed.data.phone ? sanitizeText(parsed.data.phone, 30) : undefined,
division_id: parsed.data.divisionId,
district_id: parsed.data.districtId,
upazila_id: parsed.data.upazilaId,
updated_at: new Date().toISOString(),
};
if (hasNewAvatar) { update.avatar = avatarUrl; update.avatar_key = avatarKey; }
const { error } = await client.database.from("profiles").update(update).eq("id", user.id);
if (error) {
if (hasNewAvatar) await client.storage.from(PROFILE_IMAGE_BUCKET).remove(avatarKey);
return { error: "Could not save profile changes. Please try again." };
}
if (hasNewAvatar && previousProfile?.avatar_key && previousProfile.avatar_key !== avatarKey) {
await client.storage.from(PROFILE_IMAGE_BUCKET).remove(previousProfile.avatar_key);
}
await recordAudit({
actorId: user.id,
actorName: parsed.data.fullName,
action: "update_profile",
entity: "user",
entityId: user.id,
outcome: "success",
});
revalidatePath("/profile");
revalidatePath("/profile/edit");
revalidatePath("/", "layout");
revalidatePath(`/profile/${user.username}`);
return { success: "Profile updated." }; }
export async function requestConnectionAction(username: string): Promise<{ ok: boolean; error?: string }> {
const user = await requireUser();
const client = createServerClient({ cookies: await cookies() });
const { data: target, error: targetError } = await client.database.from("public_profiles")
.select("id").eq("username", username).maybeSingle();
if (targetError) throw targetError;
if (!target) return { ok: false, error: "User not found." };
if (target.id === user.id) return { ok: false, error: "You cannot connect with yourself." };
const { data: existingEdges, error: lookupError } = await client.database.from("connections")
.select("id,status,requester_id,addressee_id")
.or(`and(requester_id.eq.${user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user.id})`)
.limit(1);
if (lookupError) throw lookupError;
const existing = existingEdges?.[0];
if (existing) return { ok: false, error: existing.status === "accepted" ? "You are already connected." : existing.status === "pending" ? "A connection request already exists." : "A previous connection request already exists." };
const { data: inserted, error: insertError } = await client.database.from("connections")
.insert([{ requester_id: user.id, addressee_id: target.id, status: "pending" }])
.select("id,status,requester_id,addressee_id").maybeSingle();
if (insertError) {
if (insertError.code === "23505") return { ok: false, error: "A connection request already exists." };
throw insertError;
}
if (!inserted || inserted.status !== "pending" || inserted.requester_id !== user.id || inserted.addressee_id !== target.id) return { ok: false, error: "Could not confirm the connection request. Please try again." };
revalidatePath(`/profile/${username}`);
revalidatePath("/friend-requests");
return { ok: true }; }
export async function respondConnectionAction(connectionId: string, action: "accepted" | "rejected"): Promise<{ ok: boolean }> {
if (action !== "accepted" && action !== "rejected") return { ok: false };
const user = await requireUser();
const client = createServerClient({ cookies: await cookies() });
const { data: updated, error } = await client.database.from("connections")
.update({ status: action, updated_at: new Date().toISOString() })
.eq("id", connectionId).eq("addressee_id", user.id).eq("status", "pending")
.select("id,status,addressee_id").maybeSingle();
if (error) throw error;
if (!updated || updated.addressee_id !== user.id || updated.status !== action) return { ok: false };
revalidatePath("/connections");
revalidatePath("/friend-requests");
revalidatePath("/community");
return { ok: true }; }
export async function cancelConnectionAction(connectionId: string): Promise<{ ok: boolean }> {
const user = await requireUser();
const client = createServerClient({ cookies: await cookies() });
const { data: deleted, error } = await client.database.from("connections").delete()
.eq("id", connectionId).eq("requester_id", user.id).eq("status", "pending")
.select("id").maybeSingle();
if (error) throw error;
if (!deleted) return { ok: false };
revalidatePath("/friend-requests");
revalidatePath("/community");
return { ok: true }; }
export async function sendMessageAction(
conversationId: string,
body: string,
attachment?: { key: string; url: string; mimeType: string; type: "image" | "audio" } ): Promise<{ ok: boolean; error?: string }> {
const user = await requireUser();
const { data: conv } = await insforge
.from("conversations")
.select("participant_ids")
.eq("id", conversationId)
.eq("conversation_type", "connection")
.filter("participant_ids", "cs", `{${user.id}}`)
.single();
if (!conv) return { ok: false, error: "You are not a participant in this conversation." };
const otherId = (conv.participant_ids ?? []).find((id: string) => id !== user.id);
if (!otherId || (conv.participant_ids ?? []).length !== 2) return { ok: false, error: "This conversation is unavailable." };
const { data: connection } = await insforge.from("connections").select("id").eq("status", "accepted").or(`and(requester_id.eq.${user.id},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${user.id})`).maybeSingle();
if (!connection) return { ok: false, error: "Accept each other's connection request before messaging." };
const cleanBody = String(body ?? "").trim();
if (cleanBody.length > 2000) return { ok: false, error: "Messages can be up to 2,000 characters." };
if (!cleanBody && !attachment) return { ok: false, error: "Write a message or attach an image or voice message." };
if (cleanBody) {
const safeMessage = messageSchema.safeParse({ body: cleanBody });
if (!safeMessage.success) return { ok: false, error: formatZodError(safeMessage.error) };
}
const attachmentTypes = new Set(["image/jpeg", "image/png", "image/webp", "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/aac", "audio/x-wav"]);
if (attachment) {
const keyParts = attachment.key.split("/");
let validUrl = false;
try {
const url = new URL(attachment.url);
validUrl = url.origin === new URL(process.env.NEXT_PUBLIC_INSFORGE_URL!).origin && decodeURIComponent(url.pathname).includes("chat-media") && decodeURIComponent(url.pathname).includes(attachment.key);
} catch { validUrl = false; }
if (keyParts.length !== 3 || keyParts[0] !== user.id || keyParts[1] !== conversationId || !/^[a-zA-Z0-9-]{12,80}\.[a-z0-9]{2,6}$/i.test(keyParts[2]) || !validUrl || !attachmentTypes.has(attachment.mimeType) || !["image", "audio"].includes(attachment.type) || (attachment.type === "image") !== attachment.mimeType.startsWith("image/")) {
return { ok: false, error: "The selected image or voice message is invalid. Please select it again." };
}
}
const limit = rateLimit(`message:${user.id}`, RATES.bloodChatPerMinute, 60_000);
if (!limit.ok) return { ok: false, error: `Too many messages. Try again in ${limit.retryAfterSeconds}s.` };
const { data: message, error } = await insforge
.from("messages")
.insert({
conversation_id: conversationId,
sender_id: user.id,
body: sanitizeMultiline(cleanBody, 2000),
attachment_key: attachment?.key ?? null,
attachment_url: attachment?.url ?? null,
attachment_mime_type: attachment?.mimeType ?? null,
attachment_type: attachment?.type ?? null,
})
.select()
.single();
if (error || !message) return { ok: false, error: "Could not send this message. Check the connection and try again." };
revalidatePath(`/messages/${conversationId}`);
return { ok: true }; }
export async function startConversationAction(username: string): Promise<{ ok: boolean; conversationId?: string; error?: string }> {
const user = await requireUser();
const { data: target } = await insforge.from("public_profiles").select("id").eq("username", username).single();
if (!target) return { ok: false, error: "User not found." };
const { data: connection } = await insforge.from("connections").select("id").eq("status", "accepted").or(`and(requester_id.eq.${user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user.id})`).maybeSingle();
if (!connection) return { ok: false, error: "You can message this member after they accept your connection request." };
const { data: conv } = await insforge
.from("conversations")
.select("id")
.eq("conversation_type", "connection")
.filter("participant_ids", "cs", `{${user.id}}`)
.filter("participant_ids", "cs", `{${target.id}}`)
.maybeSingle();
if (conv) return { ok: true, conversationId: conv.id };
const { data: conversation, error } = await insforge
.from("conversations")
.insert({ participant_ids: [user.id, target.id], conversation_type: "connection" })
.select()
.single();
if (error) throw error;
return { ok: true, conversationId: conversation.id }; }
export async function markNotificationReadAction(id: string): Promise<void> {
const user = await requireUser();
await insforge.from("notifications").update({ read: true }).eq("id", id).eq("user_id", user.id);
revalidatePath("/notifications"); }
export async function markAllNotificationsReadAction(): Promise<void> {
const user = await requireUser();
await insforge.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
revalidatePath("/notifications"); }
export async function deleteOwnPostAction(postId: string): Promise<{ deleted: boolean }> {
const user = await requireUser();
const { data: post } = await insforge.from("posts").select("author_id").eq("id", postId).single();
if (!post || post.author_id !== user.id) return { deleted: false };
const { error } = await insforge.from("posts").delete().eq("id", postId);
if (error) throw error;
revalidatePath("/my-posts");
revalidatePath("/community");
return { deleted: true }; }
export type { PublicUser };
