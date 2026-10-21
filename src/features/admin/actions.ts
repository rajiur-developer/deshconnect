// @ts-nocheck
"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user"; import { can, rolePermissions } from "@/lib/auth/permissions"; import { ALL_ACTIONS, type PermissionAction } from "@/config/permissions"; import { getDatabase, saveDatabase } from "@/lib/db/store"; import { setNewsStatus } from "@/services/news"; import { setPostStatus, setReportStatus, setReviewStatus } from "@/services/community"; import { setUserRole, setUserStatus } from "@/services/users"; import { setBloodRequestStatus } from "@/services/blood"; import { recordAudit } from "@/services/audit"; import { createId, slugify } from "@/lib/utils"; import { formatZodError, emergencyAlertSchema, businessSchema, locationSchema, placeSchema, serviceSchema, staffNewsSchema } from "@/lib/validation/schemas"; import { sanitizeMultiline, sanitizeText } from "@/lib/security/sanitize"; import type { Business, GovernmentService, News, Place } from "@/types/content"; import type { Role } from "@/types/auth";
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import { getRolePermissionOverrides, saveRolePermissionOverrides } from "@/services/role-permissions";
export type AdminFormState = { error?: string; success?: string };
async function guard(action: PermissionAction, redirectTo = "/admin") {
const user = await requireUser(redirectTo);
const overrides = await getRolePermissionOverrides();
if (!can(user.role, action, overrides)) {
throw new Error("You do not have permission to perform this action.");
}
return user; }
async function audit(user: { id: string; fullName: string }, action: string, entity: string, entityId: string, outcome: "success" | "denied" = "success", detail?: string) {
await recordAudit({ actorId: user.id, actorName: user.fullName, action, entity, entityId, outcome, detail }); }
export async function adminSetNewsStatusAction(id: string, status: "pending_review" | "published" | "rejected" | "archived"): Promise<{ ok: boolean; error?: string }> {
const user = await guard("news:publish");
if (!id || !["pending_review", "published", "rejected", "archived"].includes(status)) return { ok: false, error: "Invalid news update." };
const client = createServerClient({ cookies: await cookies() });
const { data, error } = await client.database.from("news").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("id").maybeSingle();
if (error) { console.error("News status update failed", { code: error.code, message: error.message }); return { ok: false, error: "Could not update the news status." }; }
if (!data) return { ok: false, error: "News post not found or permission denied." };
try { await audit(user, `news:${status}`, "news", id); } catch (auditError) { console.error("News status changed but audit logging failed.", auditError); }
revalidatePath("/admin/news"); revalidatePath("/news");
return { ok: true }; }

export async function adminUpdateNewsAction(id: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
const user = await guard("news:publish");
const parsed = staffNewsSchema.safeParse({
title: formData.get("title"), excerpt: formData.get("excerpt"), body: formData.get("body"),
category: formData.get("category"), source: formData.get("source") || undefined,
image: formData.get("image") || undefined,
});
if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };
const client = createServerClient({ cookies: await cookies() });
const { data, error } = await client.database.from("news").update({
title: sanitizeText(parsed.data.title, 200), excerpt: sanitizeText(parsed.data.excerpt, 300),
body: sanitizeMultiline(parsed.data.body), category: parsed.data.category,
source: parsed.data.source ? sanitizeText(parsed.data.source, 200) : null,
image: parsed.data.image || "/images/news/user.svg", updated_at: new Date().toISOString(),
}).eq("id", id).select("id").maybeSingle();
if (error) { console.error("News content update failed", { code: error.code, message: error.message }); return { ok: false, error: "Could not save the news changes." }; }
if (!data) return { ok: false, error: "News post not found or permission denied." };
try { await audit(user, "news:update", "news", id); } catch (auditError) { console.error("News updated but audit logging failed.", auditError); }
revalidatePath("/admin/news"); revalidatePath("/news");
return { ok: true }; }

export async function adminDeleteNewsAction(id: string): Promise<{ ok: boolean; error?: string }> {
const user = await guard("news:publish");
if (!id) return { ok: false, error: "Invalid news post." };
const client = createServerClient({ cookies: await cookies() });
const { data, error } = await client.database.from("news").delete().eq("id", id).select("id").maybeSingle();
if (error) { console.error("News delete failed", { code: error.code, message: error.message }); return { ok: false, error: "Could not delete the news post." }; }
if (!data) return { ok: false, error: "News post not found or permission denied." };
try { await audit(user, "news:delete", "news", id); } catch (auditError) { console.error("News deleted but audit logging failed.", auditError); }
revalidatePath("/admin/news"); revalidatePath("/news");
return { ok: true }; }
export async function adminModeratePostAction(id: string, status: "visible" | "hidden" | "pending") {
const user = await guard("moderation:posts");
await setPostStatus(id, status);
await audit(user, `post:${status}`, "post", id);
revalidatePath("/admin/community");
revalidatePath("/community"); }
export async function adminSetReviewStatusAction(id: string, status: "visible" | "hidden" | "pending") {
const user = await guard("moderation:reviews");
await setReviewStatus(id, status);
await audit(user, `review:${status}`, "review", id);
revalidatePath("/admin/reviews"); }
export async function adminResolveReportAction(id: string, status: "under_review" | "resolved" | "dismissed", resolution?: string) {
const user = await guard("moderation:reports");
await setReportStatus(id, status, resolution);
await audit(user, `report:${status}`, "report", id);
revalidatePath("/admin/reports"); }
export async function adminSetUserStatusAction(userId: string, status: "active" | "suspended" | "pending") {
const user = await requireUser("/admin");
if (user.role !== "admin") throw new Error("Only an admin can manage user accounts.");
await setUserStatus(userId, status);
await audit(user, `user:${status}`, "user", userId);
revalidatePath("/admin/users"); }
export async function adminSetUserRoleAction(userId: string, role: Role) {
const user = await requireUser("/admin");
if (user.role !== "admin") throw new Error("Only an admin can change account roles.");
if (!["user", "moderator", "admin"].includes(role)) throw new Error("Invalid role.");
if (userId === user.id) throw new Error("You cannot change your own role.");
await setUserRole(userId, role);
await audit(user, `user:role:${role}`, "user", userId);
revalidatePath("/admin/users");
revalidatePath("/admin/roles"); }
/**
* Promote/demote a user between "user" and "moderator". Available to admins and
* moderators, but neither may grant or change an admin account.
*/ export async function toggleModeratorAction(userId: string): Promise<{ ok: boolean; role?: Role; error?: string }> {
const actor = await requireUser("/admin");
if (actor.role !== "admin") return { ok: false, error: "Only an admin can change account roles." };
const client = createServerClient({ cookies: await cookies() });
const { data: target, error: readError } = await client.database.from("profiles").select("id,username,role").eq("id", userId).maybeSingle();
if (readError) return { ok: false, error: readError.message };
if (!target) return { ok: false, error: "User not found." };
if (target.id === actor.id) return { ok: false, error: "You cannot change your own role." };
const nextRole: Role = target.role === "moderator" ? "user" : "moderator";
const { error } = await client.database.from("profiles").update({ role: nextRole, updated_at: new Date().toISOString() }).eq("id", userId);
if (error) return { ok: false, error: error.message };
await audit(actor, `user:role:${nextRole}`, "user", userId);
revalidatePath("/admin/users");
revalidatePath(`/profile/${target.username}`);
return { ok: true, role: nextRole }; }
export async function adminSetBloodRequestStatusAction(id: string, status: "active" | "fulfilled" | "cancelled" | "expired" | "under_review") {
const user = await guard("blood:manage");
await setBloodRequestStatus(id, status);
await audit(user, `blood-request:${status}`, "blood_request", id);
revalidatePath("/admin/blood-requests");
revalidatePath("/blood-donation"); }
export async function adminDeletePlaceAction(id: string) {
const user = await guard("places:delete");
await saveDatabase((db) => {
db.places = db.places.filter((place) => place.id !== id);
});
await audit(user, "place:delete", "place", id);
revalidatePath("/admin/places");
revalidatePath("/places"); }
export async function adminSaveSettingsAction(_prev: { error?: string; success?: string }, formData: FormData) {
const user = await guard("settings:manage");
const siteName = String(formData.get("siteName") ?? "").trim();
if (!siteName) return { error: "Site name is required." };
await saveDatabase((db) => {
db.settings.siteName = siteName;
db.settings.allowPublicPosts = formData.get("allowPublicPosts") === "on";
db.settings.requireNewsApproval = formData.get("requireNewsApproval") === "on";
db.settings.donorDirectoryEnabled = formData.get("donorDirectoryEnabled") === "on";
});
await audit(user, "settings:update", "settings", "platform");
revalidatePath("/admin/settings");
return { success: "Settings saved." }; }
export async function adminSavePermissionsAction(_prev: { error?: string; success?: string }, formData: FormData) {
const user = await requireUser("/admin/permissions");
if (user.role !== "admin") return { error: "Only an admin can change role permissions." };
const roles: Role[] = ["user", "moderator", "admin"];
const next: Record<string, string[]> = {};
for (const role of roles) {
if (role === "admin") continue;
next[role] = ALL_ACTIONS.filter((action) => formData.get(`role:${role}:${action}`) === "on");
}
await saveRolePermissionOverrides(next, user.id);
await audit(user, "permissions:update", "settings", "permissions");
revalidatePath("/admin/permissions");
return { success: "Permissions updated." }; }
export async function adminDeleteUserAction(userId: string) {
const user = await requireUser("/admin");
if (user.role !== "admin") throw new Error("Only an admin can manage user accounts.");
if (user.id === userId) return;
await saveDatabase((db) => {
db.users = db.users.filter((item) => item.id !== userId);
});
await audit(user, "user:delete", "user", userId);
revalidatePath("/admin/users"); }
/** Create a published tourist place. Available to admins and moderators. */ export async function createPlaceAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
const user = await guard("places:create");
const parsed = placeSchema.safeParse({
name: formData.get("name"),
category: formData.get("category"),
summary: formData.get("summary"),
description: formData.get("description"),
address: formData.get("address"),
entryFee: formData.get("entryFee") || undefined,
openingHours: formData.get("openingHours") || undefined,
bestTime: formData.get("bestTime") || undefined,
image: formData.get("image") || undefined,
divisionId: formData.get("divisionId") || undefined,
districtId: formData.get("districtId") || undefined,
upazilaId: formData.get("upazilaId") || undefined,
});
if (!parsed.success) return { error: formatZodError(parsed.error) };
const now = new Date().toISOString();
const place: Place = {
id: createId("place"),
slug: slugify(parsed.data.name),
name: sanitizeText(parsed.data.name, 200),
category: parsed.data.category,
summary: sanitizeText(parsed.data.summary, 300),
description: sanitizeMultiline(parsed.data.description),
address: sanitizeText(parsed.data.address, 300),
latitude: null,
longitude: null,
image: parsed.data.image || "/images/places/p1.svg",
gallery: [],
rating: 0,
reviewCount: 0,
openingHours: parsed.data.openingHours,
entryFee: parsed.data.entryFee,
bestTime: parsed.data.bestTime,
status: "published",
verification: "verified",
createdAt: now,
updatedAt: now,
divisionId: parsed.data.divisionId ?? null,
districtId: parsed.data.districtId ?? null,
upazilaId: parsed.data.upazilaId ?? null,
};
await saveDatabase((db) => {
db.places.push(place);
});
await audit(user, "place:create", "place", place.id);
revalidatePath("/admin/places");
revalidatePath("/places");
return { success: "Place created and published." }; }
/** Publish a news article directly. Available to admins and moderators. */ export async function createNewsAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
const user = await guard("news:publish");
const parsed = staffNewsSchema.safeParse({
title: formData.get("title"),
excerpt: formData.get("excerpt"),
body: formData.get("body"),
category: formData.get("category"),
source: formData.get("source") || undefined,
image: formData.get("image") || undefined,
});
if (!parsed.success) return { error: formatZodError(parsed.error) };
const now = new Date().toISOString();
const article: News = {
id: createId("news"),
slug: createId("news").replace("news_", "news-"),
title: sanitizeText(parsed.data.title, 200),
excerpt: sanitizeText(parsed.data.excerpt, 300),
body: sanitizeMultiline(parsed.data.body),
image: parsed.data.image || "/images/news/user.svg",
category: parsed.data.category,
authorId: user.id,
source: parsed.data.source,
status: "published",
publishedAt: now,
createdAt: now,
updatedAt: now,
};
const client = createServerClient({ cookies: await cookies() });
const { data, error } = await client.database.from("news").insert([{
slug: article.slug, title: article.title, excerpt: article.excerpt, body: article.body,
image: article.image, category: article.category, author_id: user.id, source: article.source,
status: article.status, published_at: article.publishedAt, created_at: article.createdAt,
division_id: user.divisionId ?? null, district_id: user.districtId ?? null, upazila_id: user.upazilaId ?? null,
}]).select("id").single();
if (error) { console.error("Admin news publish failed", { code: error.code, message: error.message }); return { error: "News could not be published. Please try again." }; }
await audit(user, "news:create", "news", data.id);
revalidatePath("/admin/news");
revalidatePath("/news");
return { success: "News published." }; }
/** Publish an active blood request and alert every user. */ export async function sendEmergencyBloodAlertAction(
_prev: AdminFormState,
formData: FormData ): Promise<AdminFormState> {
const user = await guard("blood:manage");
const parsed = emergencyAlertSchema.safeParse({
bloodGroup: formData.get("bloodGroup"),
units: formData.get("units"),
hospital: formData.get("hospital"),
neededBy: formData.get("neededBy"),
notes: formData.get("notes") || undefined,
});
if (!parsed.success) return { error: formatZodError(parsed.error) };
const now = new Date().toISOString();
const db = await getDatabase();
const recipientIds = db.users.map((item) => item.id);
const request = {
id: createId("req"),
requesterId: user.id,
bloodGroup: parsed.data.bloodGroup,
units: parsed.data.units,
patient: null,
hospital: sanitizeText(parsed.data.hospital, 200),
neededBy: parsed.data.neededBy,
notes: parsed.data.notes ? sanitizeText(parsed.data.notes, 1000) : null,
status: "active" as const,
createdAt: now,
updatedAt: now,
divisionId: null,
districtId: null,
upazilaId: null,
};
await saveDatabase((current) => {
current.bloodRequests.push(request);
for (const userId of recipientIds) {
current.notifications.push({
id: createId("ntf"),
userId,
title: "Emergency blood alert",
body: `${request.bloodGroup} needed — ${request.hospital}`,
href: "/blood-donation",
read: false,
createdAt: now,
});
}
});
await audit(user, "blood:emergency_alert", "blood_request", request.id, "success", "Alert sent to all users");
revalidatePath("/admin/blood-alerts");
revalidatePath("/blood-donation");
return { success: "Emergency blood alert sent to all users." }; }
/** Create a government-service record. Available to admins and moderators. */ export async function createGovernmentServiceAction(
_prev: AdminFormState,
formData: FormData ): Promise<AdminFormState> {
const user = await guard("services:edit");
const parsed = serviceSchema.safeParse({
name: formData.get("name"),
category: formData.get("category"),
description: formData.get("description"),
officeAddress: formData.get("officeAddress"),
phone: formData.get("phone") || undefined,
emergencyPhone: formData.get("emergencyPhone") || undefined,
website: formData.get("website") || undefined,
hours: formData.get("hours") || undefined,
requiredDocuments: formData.get("requiredDocuments") || undefined,
divisionId: formData.get("divisionId") || undefined,
districtId: formData.get("districtId") || undefined,
upazilaId: formData.get("upazilaId") || undefined,
});
if (!parsed.success) return { error: formatZodError(parsed.error) };
const now = new Date().toISOString();
const service: GovernmentService = {
id: createId("svc"),
slug: slugify(parsed.data.name),
name: sanitizeText(parsed.data.name, 200),
category: parsed.data.category,
description: sanitizeMultiline(parsed.data.description),
officeAddress: sanitizeText(parsed.data.officeAddress, 300),
phone: parsed.data.phone ? sanitizeText(parsed.data.phone, 50) : null,
emergencyPhone: parsed.data.emergencyPhone ? sanitizeText(parsed.data.emergencyPhone, 50) : null,
website: parsed.data.website ? sanitizeText(parsed.data.website, 200) : null,
hours: parsed.data.hours,
requiredDocuments: parsed.data.requiredDocuments
? parsed.data.requiredDocuments.split(",").map((item) => item.trim()).filter(Boolean)
: undefined,
status: "published",
createdAt: now,
updatedAt: now,
divisionId: parsed.data.divisionId ?? null,
districtId: parsed.data.districtId ?? null,
upazilaId: parsed.data.upazilaId ?? null,
};
await saveDatabase((db) => {
db.governmentServices.push(service);
});
await audit(user, "service:create", "government_service", service.id);
revalidatePath("/admin/government-services");
revalidatePath("/government-services");
return { success: "Government service created." }; }
/** Delete a business listing. Available to admins and moderators. */ export async function deleteBusinessAction(id: string) {
const user = await guard("businesses:edit");
await saveDatabase((db) => {
db.businesses = db.businesses.filter((business) => business.id !== id);
});
await audit(user, "business:delete", "business", id);
revalidatePath("/admin/businesses");
revalidatePath("/businesses"); }
/** Create a business listing. Available to admins and moderators. */ export async function createBusinessAction(
_prev: AdminFormState,
formData: FormData ): Promise<AdminFormState> {
const user = await guard("businesses:edit");
const parsed = businessSchema.safeParse({
name: formData.get("name"),
category: formData.get("category"),
description: formData.get("description"),
address: formData.get("address"),
phone: formData.get("phone") || undefined,
website: formData.get("website") || undefined,
image: formData.get("image") || undefined,
divisionId: formData.get("divisionId") || undefined,
districtId: formData.get("districtId") || undefined,
upazilaId: formData.get("upazilaId") || undefined,
});
if (!parsed.success) return { error: formatZodError(parsed.error) };
const now = new Date().toISOString();
const business: Business = {
id: createId("biz"),
slug: slugify(parsed.data.name),
name: sanitizeText(parsed.data.name, 200),
category: parsed.data.category,
description: sanitizeMultiline(parsed.data.description),
address: sanitizeText(parsed.data.address, 300),
phone: parsed.data.phone ? sanitizeText(parsed.data.phone, 50) : null,
website: parsed.data.website ? sanitizeText(parsed.data.website, 200) : null,
image: parsed.data.image || "/images/businesses/b1.svg",
status: "published",
verification: "verified",
createdAt: now,
updatedAt: now,
divisionId: parsed.data.divisionId ?? null,
districtId: parsed.data.districtId ?? null,
upazilaId: parsed.data.upazilaId ?? null,
};
await saveDatabase((db) => {
db.businesses.push(business);
});
await audit(user, "business:create", "business", business.id);
revalidatePath("/admin/businesses");
revalidatePath("/businesses");
return { success: "Business created." }; }
/** Add a division, district or upazila. Admin only. */ export async function addLocationAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
const user = await guard("locations:manage");
const parsed = locationSchema.safeParse({
name: formData.get("name"),
title: formData.get("title") || undefined,
category: formData.get("category"),
image: formData.get("image") || undefined,
parentId: formData.get("parentId") || undefined,
});
if (!parsed.success) return { error: formatZodError(parsed.error) };
const name = sanitizeText(parsed.data.name, 120);
const title = parsed.data.title ? sanitizeText(parsed.data.title, 300) : name;
const image = parsed.data.image || "/images/districts/district.svg";
const parentId = parsed.data.parentId ?? "";
if (parsed.data.category !== "division" && !parentId) {
return { error: "Select a parent division/district for this location." };
}
await saveDatabase((db) => {
if (parsed.data.category === "division") {
db.divisions.push({
id: createId("div"),
slug: slugify(name),
name,
bnName: title,
capital: name,
districtsCount: 0,
summary: title,
image,
});
} else if (parsed.data.category === "district") {
db.districts.push({
id: createId("dis"),
slug: slugify(name),
name,
divisionId: parentId,
summary: title,
image,
});
const division = db.divisions.find((item) => item.id === parentId);
if (division) {
division.districtsCount = db.districts.filter((item) => item.divisionId === parentId).length;
}
} else {
db.upazilas.push({
id: createId("upa"),
slug: slugify(name),
name,
districtId: parentId,
image,
summary: title,
});
}
});
await audit(user, `location:${parsed.data.category}:create`, "location", name);
revalidatePath("/admin/locations");
return { success: `${parsed.data.category[0]!.toUpperCase()}${parsed.data.category.slice(1)} added.` }; }
/** Hide (archive) or restore a tourist place. Admin and moderators. */ export async function adminSetPlaceStatusAction(id: string, status: "published" | "archived") {
const user = await guard("places:edit");
await saveDatabase((db) => {
const place = db.places.find((item) => item.id === id);
if (!place) return;
place.status = status;
place.updatedAt = new Date().toISOString();
});
await audit(user, `place:${status}`, "place", id);
revalidatePath("/admin/places");
revalidatePath("/admin/tourism");
revalidatePath("/places"); }
/** Hide (archive) or restore a business. Admin and moderators. */ export async function adminSetBusinessStatusAction(id: string, status: "published" | "archived") {
const user = await guard("businesses:edit");
await saveDatabase((db) => {
const business = db.businesses.find((item) => item.id === id);
if (!business) return;
business.status = status;
business.updatedAt = new Date().toISOString();
});
await audit(user, `business:${status}`, "business", id);
revalidatePath("/admin/businesses");
revalidatePath("/businesses"); }
/** Hide (archive) or restore a government service. Admin and moderators. */ export async function adminSetServiceStatusAction(id: string, status: "published" | "archived") {
const user = await guard("services:edit");
await saveDatabase((db) => {
const service = db.governmentServices.find((item) => item.id === id);
if (!service) return;
service.status = status;
service.updatedAt = new Date().toISOString();
});
await audit(user, `service:${status}`, "government_service", id);
revalidatePath("/admin/government-services");
revalidatePath("/government-services"); }
/** Delete a government service. Admin and moderators. */ export async function adminDeleteServiceAction(id: string) {
const user = await guard("services:edit");
await saveDatabase((db) => {
db.governmentServices = db.governmentServices.filter((service) => service.id !== id);
});
await audit(user, "service:delete", "government_service", id);
revalidatePath("/admin/government-services");
revalidatePath("/government-services"); }
/** Update an existing tourist place. Admin and moderators. */ export async function adminUpdatePlaceAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
const user = await guard("places:edit");
const id = String(formData.get("id") ?? "");
const parsed = placeSchema.safeParse({
name: formData.get("name"),
category: formData.get("category"),
summary: formData.get("summary"),
description: formData.get("description"),
address: formData.get("address"),
entryFee: formData.get("entryFee") || undefined,
openingHours: formData.get("openingHours") || undefined,
bestTime: formData.get("bestTime") || undefined,
image: formData.get("image") || undefined,
divisionId: formData.get("divisionId") || undefined,
districtId: formData.get("districtId") || undefined,
upazilaId: formData.get("upazilaId") || undefined,
});
if (!parsed.success) return { error: formatZodError(parsed.error) };
let updated = false;
await saveDatabase((db) => {
const place = db.places.find((item) => item.id === id);
if (!place) return;
place.name = sanitizeText(parsed.data.name, 200);
place.category = parsed.data.category;
place.summary = sanitizeText(parsed.data.summary, 300);
place.description = sanitizeMultiline(parsed.data.description);
place.address = sanitizeText(parsed.data.address, 300);
place.openingHours = parsed.data.openingHours;
place.entryFee = parsed.data.entryFee;
place.bestTime = parsed.data.bestTime;
if (parsed.data.image) place.image = parsed.data.image;
place.divisionId = parsed.data.divisionId ?? null;
place.districtId = parsed.data.districtId ?? null;
place.upazilaId = parsed.data.upazilaId ?? null;
place.updatedAt = new Date().toISOString();
updated = true;
});
if (!updated) return { error: "Place not found." };
await audit(user, "place:update", "place", id);
revalidatePath("/admin/places");
revalidatePath("/admin/tourism");
revalidatePath("/places");
return { success: "Place updated." }; }
/** Update an existing business. Admin and moderators. */ export async function adminUpdateBusinessAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
const user = await guard("businesses:edit");
const id = String(formData.get("id") ?? "");
const parsed = businessSchema.safeParse({
name: formData.get("name"),
category: formData.get("category"),
description: formData.get("description"),
address: formData.get("address"),
phone: formData.get("phone") || undefined,
website: formData.get("website") || undefined,
image: formData.get("image") || undefined,
divisionId: formData.get("divisionId") || undefined,
districtId: formData.get("districtId") || undefined,
upazilaId: formData.get("upazilaId") || undefined,
});
if (!parsed.success) return { error: formatZodError(parsed.error) };
let updated = false;
await saveDatabase((db) => {
const business = db.businesses.find((item) => item.id === id);
if (!business) return;
business.name = sanitizeText(parsed.data.name, 200);
business.category = parsed.data.category;
business.description = sanitizeMultiline(parsed.data.description);
business.address = sanitizeText(parsed.data.address, 300);
business.phone = parsed.data.phone ? sanitizeText(parsed.data.phone, 50) : null;
business.website = parsed.data.website ? sanitizeText(parsed.data.website, 200) : null;
if (parsed.data.image) business.image = parsed.data.image;
business.divisionId = parsed.data.divisionId ?? null;
business.districtId = parsed.data.districtId ?? null;
business.upazilaId = parsed.data.upazilaId ?? null;
business.updatedAt = new Date().toISOString();
updated = true;
});
if (!updated) return { error: "Business not found." };
await audit(user, "business:update", "business", id);
revalidatePath("/admin/businesses");
revalidatePath("/businesses");
return { success: "Business updated." }; }
/** Update an existing government service. Admin and moderators. */ export async function adminUpdateServiceAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
const user = await guard("services:edit");
const id = String(formData.get("id") ?? "");
const parsed = serviceSchema.safeParse({
name: formData.get("name"),
category: formData.get("category"),
description: formData.get("description"),
officeAddress: formData.get("officeAddress"),
phone: formData.get("phone") || undefined,
emergencyPhone: formData.get("emergencyPhone") || undefined,
website: formData.get("website") || undefined,
hours: formData.get("hours") || undefined,
requiredDocuments: formData.get("requiredDocuments") || undefined,
divisionId: formData.get("divisionId") || undefined,
districtId: formData.get("districtId") || undefined,
upazilaId: formData.get("upazilaId") || undefined,
});
if (!parsed.success) return { error: formatZodError(parsed.error) };
let updated = false;
await saveDatabase((db) => {
const service = db.governmentServices.find((item) => item.id === id);
if (!service) return;
service.name = sanitizeText(parsed.data.name, 200);
service.category = parsed.data.category;
service.description = sanitizeMultiline(parsed.data.description);
service.officeAddress = sanitizeText(parsed.data.officeAddress, 300);
service.phone = parsed.data.phone ? sanitizeText(parsed.data.phone, 50) : null;
service.emergencyPhone = parsed.data.emergencyPhone ? sanitizeText(parsed.data.emergencyPhone, 50) : null;
service.website = parsed.data.website ? sanitizeText(parsed.data.website, 200) : null;
service.hours = parsed.data.hours;
service.requiredDocuments = parsed.data.requiredDocuments
? parsed.data.requiredDocuments.split(",").map((item) => item.trim()).filter(Boolean)
: undefined;
service.divisionId = parsed.data.divisionId ?? null;
service.districtId = parsed.data.districtId ?? null;
service.upazilaId = parsed.data.upazilaId ?? null;
service.updatedAt = new Date().toISOString();
updated = true;
});
if (!updated) return { error: "Service not found." };
await audit(user, "service:update", "government_service", id);
revalidatePath("/admin/government-services");
revalidatePath("/government-services");
return { success: "Service updated." }; }
/** Update a member profile. Role/status changes are restricted to admins. */ export async function adminUpdateUserAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
const actor = await requireUser("/admin");
if (actor.role !== "admin") return { error: "Only an admin can update user accounts." };
const id = String(formData.get("id") ?? "");
const fullName = sanitizeText(String(formData.get("fullName") ?? ""), 120);
const phone = sanitizeText(String(formData.get("phone") ?? ""), 30);
const role = String(formData.get("role") ?? "user") as Role;
const status = String(formData.get("status") ?? "active") as "active" | "suspended" | "pending";
if (!id || !fullName) return { error: "Name is required." };
if (!["user", "moderator", "admin"].includes(role) || !["active", "suspended", "pending"].includes(status)) return { error: "Invalid role or status." };
if (actor.id === id && role !== actor.role) return { error: "You cannot change your own role." };
const client = createServerClient({ cookies: await cookies() });
const { data: target, error: readError } = await client.database.from("profiles").select("id,role").eq("id", id).maybeSingle();
if (readError || !target) return { error: "User not found." };
if (actor.role !== "admin" && (target.role !== role || target.role === "admin" || role === "admin")) return { error: "Only an admin can change account roles." };
const update: Record<string, unknown> = { full_name: fullName, phone: phone || null, updated_at: new Date().toISOString() };
if (actor.role === "admin") { update.role = role; update.status = status; }
const { error } = await client.database.from("profiles").update(update).eq("id", id);
if (error) return { error: `Could not update user: ${error.message}` };
await audit(actor, "user:update", "user", id);
revalidatePath("/admin/users");
return { success: "User updated." };
}
