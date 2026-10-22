// @ts-nocheck
import "server-only";

import { insforgeGet, insforgeInsert, insforgeUpdate, insforgeDelete, insforgeSelectOne, insforgeSelectMany } from "@/lib/insforge";

export async function insforgeListPublicDonors(query: {
  q?: string;
  divisionId?: string;
  districtId?: string;
  upazilaId?: string;
  bloodGroup?: string;
  sort?: "relevance" | "name" | "newest" | "rating";
}) {
  const params: Record<string, string> = { consent_listed: "eq.true", order: "created_at.desc" };
  if (query.divisionId) params["division_id"] = `eq.${query.divisionId}`;
  if (query.districtId) params["district_id"] = `eq.${query.districtId}`;
  if (query.upazilaId) params["upazila_id"] = `eq.${query.upazilaId}`;
  if (query.bloodGroup) params["blood_group"] = `eq.${query.bloodGroup}`;
  const { data } = await insforgeSelectMany("public_blood_donors", params);
  const rows = data || [];
  const userIds = [...new Set(rows.map((row: any) => row.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length
    ? await insforgeSelectMany("public_profiles", { id: `in.(${userIds.join(",")})` })
    : { data: [] };
  const names = new Map((profiles || []).map((profile: any) => [profile.id, profile.full_name]));
  const donors = rows.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    fullName: names.get(r.user_id) || "Voluntary blood donor",
    bloodGroup: r.blood_group,
    availability: r.availability,
    preferredContact: r.preferred_contact,
    phone: r.phone ?? null,
    whatsapp: r.whatsapp ?? null,
    donationCount: r.donation_count,
    consentListed: r.consent_listed,
    divisionId: r.division_id,
    districtId: r.district_id,
    upazilaId: r.upazila_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  const term = query.q?.trim().toLocaleLowerCase();
  const filtered = term
    ? donors.filter((donor: any) => [donor.fullName, donor.bloodGroup, donor.availability]
        .some((value) => String(value ?? "").toLocaleLowerCase().includes(term)))
    : donors;
  if (query.sort === "name") filtered.sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));
  else filtered.sort((a: any, b: any) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  return filtered;
}

export async function insforgeListBloodRequests(query: {
  q?: string;
  divisionId?: string;
  districtId?: string;
  upazilaId?: string;
  bloodGroup?: string;
  status?: string;
  sort?: "relevance" | "name" | "newest" | "rating";
}) {
  const params: Record<string, string> = { status: `eq.${query.status ?? "active"}`, order: "created_at.desc" };
  if (query.divisionId) params["division_id"] = `eq.${query.divisionId}`;
  if (query.districtId) params["district_id"] = `eq.${query.districtId}`;
  if (query.upazilaId) params["upazila_id"] = `eq.${query.upazilaId}`;
  if (query.bloodGroup) params["blood_group"] = `eq.${query.bloodGroup}`;
  const { data } = await insforgeSelectMany("blood_requests", params);
  const requests = (data || []).map((r: any) => ({
    id: r.id,
    requesterId: r.requester_id,
    bloodGroup: r.blood_group,
    units: r.units,
    patient: r.patient,
    hospital: r.hospital,
    neededBy: r.needed_by,
    phone: r.phone ?? null,
    whatsapp: r.whatsapp ?? null,
    notes: r.notes,
    status: r.status,
    divisionId: r.division_id,
    districtId: r.district_id,
    upazilaId: r.upazila_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  const term = query.q?.trim().toLocaleLowerCase();
  const filtered = term
    ? requests.filter((request: any) => [request.patient, request.hospital, request.notes, request.bloodGroup]
        .some((value) => String(value ?? "").toLocaleLowerCase().includes(term)))
    : requests;
  if (query.sort === "name") filtered.sort((a: any, b: any) => String(a.hospital ?? "").localeCompare(String(b.hospital ?? "")));
  else filtered.sort((a: any, b: any) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  return filtered;
}

export async function listUserBloodRequests(userId: string) {
  const { data } = await insforgeSelectMany("blood_requests", { requester_id: `eq.${userId}`, order: "created_at.desc" });
  return data.map((r: any) => ({ id: r.id, requesterId: r.requester_id, bloodGroup: r.blood_group, units: r.units, patient: r.patient, hospital: r.hospital, neededBy: r.needed_by, phone: r.phone ?? null, whatsapp: r.whatsapp ?? null, notes: r.notes, status: r.status, divisionId: r.division_id, districtId: r.district_id, upazilaId: r.upazila_id, createdAt: r.created_at, updatedAt: r.updated_at }));
}
export async function setBloodRequestStatus(id: string, status: string) {
  const { error } = await insforgeUpdate("blood_requests", id, { status, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function insforgeGetDonorForUser(userId: string) {
  const data = await insforgeSelectOne("blood_donors", { user_id: `eq.${userId}` });
  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    bloodGroup: data.blood_group,
    availability: data.availability,
    preferredContact: data.preferred_contact,
    contactValue: data.contact_value,
    phone: data.phone ?? null,
    whatsapp: data.whatsapp ?? null,
    lastDonationAt: data.last_donation_at,
    donationCount: data.donation_count,
    notes: data.notes,
    consentListed: data.consent_listed,
    consentContact: data.consent_contact,
    consentExpiry: data.consent_expiry,
    divisionId: data.division_id,
    districtId: data.district_id,
    upazilaId: data.upazila_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function insforgeUpsertDonor(input: {
  userId: string;
  bloodGroup: string;
  availability: string;
  preferredContact: string;
  contactValue: string;
  phone?: string;
  whatsapp?: string;
  lastDonationAt?: string;
  notes?: string;
  divisionId?: string;
  districtId?: string;
  upazilaId?: string;
  consentListed: boolean;
  consentContact: boolean;
}) {
  const existing = await insforgeSelectOne("blood_donors", { user_id: `eq.${input.userId}` });
  const record = {
    user_id: input.userId,
    blood_group: input.bloodGroup,
    availability: input.availability,
    preferred_contact: input.preferredContact,
    contact_value: input.contactValue,
    phone: input.phone ?? null,
    whatsapp: input.whatsapp ?? null,
    last_donation_at: input.lastDonationAt ?? null,
    notes: input.notes ?? null,
    division_id: input.divisionId ?? null,
    district_id: input.districtId ?? null,
    upazila_id: input.upazilaId ?? null,
    consent_listed: input.consentListed,
    consent_contact: input.consentContact,
    consent_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  };
  if (existing) {
    await insforgeUpdate("blood_donors", existing.id, record);
    return { ...existing, ...record };
  }
  return insforgeInsert("blood_donors", record);
}

export async function insforgeCreateBloodRequest(input: {
  requesterId: string;
  bloodGroup: string;
  units: number;
  patient?: string | null;
  hospital: string;
  neededBy: string;
  phone: string;
  whatsapp: string;
  notes?: string | null;
  location?: { divisionId?: string | null; districtId?: string | null; upazilaId?: string | null };
}) {
  const { data, error } = await insforgeInsert("blood_requests", {
    requester_id: input.requesterId,
    blood_group: input.bloodGroup,
    units: input.units,
    patient: input.patient,
    hospital: input.hospital,
    needed_by: input.neededBy,
    phone: input.phone,
    whatsapp: input.whatsapp,
    notes: input.notes,
    status: "under_review",
    division_id: input.location?.divisionId ?? null,
    district_id: input.location?.districtId ?? null,
    upazila_id: input.location?.upazilaId ?? null,
  });
  if (error) throw error;
  return data;
}

export async function insforgeCancelOwnBloodRequest(requestId: string, userId: string) {
  const { data, error } = await insforgeUpdate("blood_requests", requestId, {
    status: "cancelled",
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return (data || []).length > 0;
}

export async function insforgeReleaseDonorContact(donorId: string, requesterId: string) {
  const donor = await insforgeSelectOne("blood_donors", {
    id: `eq.${donorId}`,
    consent_listed: "eq.true",
    consent_contact: "eq.true",
  });
  if (!donor) return null;

  const today = new Date().toISOString().slice(0, 10);
  const consentExpiry = new Date(donor.consent_expiry).toISOString().slice(0, 10);
  if (consentExpiry < today) return null;

  const { data: requests } = await insforgeSelectMany("blood_requests", {
    requester_id: `eq.${requesterId}`,
    status: "eq.active",
    blood_group: `eq.${donor.blood_group}`,
    needed_by: `gte.${today}`,
  });
  if (!requests.length) return null;

  return donor.contact_value;
}

export async function insforgeReleaseRequesterContact(requestId: string, viewerId: string) {
  const request = await insforgeSelectOne("blood_requests", {
    id: `eq.${requestId}`,
    status: "eq.active",
  });
  if (!request) return null;

  const requester = request.profiles;
  if (!requester?.phone) return null;

  const today = new Date().toISOString().slice(0, 10);
  const donor = await insforgeSelectOne("blood_donors", {
    user_id: `eq.${viewerId}`,
    consent_listed: "eq.true",
  });
  const viewerRequest = await insforgeSelectOne("blood_requests", {
    requester_id: `eq.${viewerId}`,
    status: "eq.active",
    blood_group: `eq.${request.blood_group}`,
    needed_by: `gte.${today}`,
  });

  if (!donor && !viewerRequest) return null;
  return requester.phone;
}

// Wrapper exports for backward compatibility
export const upsertDonor = insforgeUpsertDonor;
export const createBloodRequest = insforgeCreateBloodRequest;
export const cancelOwnBloodRequest = insforgeCancelOwnBloodRequest;
export const releaseDonorContact = insforgeReleaseDonorContact;
export const releaseRequesterContact = insforgeReleaseRequesterContact;
export const listPublicDonors = insforgeListPublicDonors;
export const listBloodRequests = insforgeListBloodRequests;
export const getDonorForUser = insforgeGetDonorForUser;
