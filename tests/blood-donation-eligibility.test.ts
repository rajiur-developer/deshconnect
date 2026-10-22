import { describe, expect, it } from "vitest";
import { donorSchema } from "../src/lib/validation/schemas";
import { DONOR_COOLDOWN_DAYS, getDonationEligibility, isValidBloodDonationDate } from "../src/lib/blood-donation";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("donor availability cooldown", () => {
  it("only enables Ready after the full 75-day cooldown", () => {
    const donatedAt = Date.UTC(2026, 0, 1);
    const donationDate = "2026-01-01";

    expect(getDonationEligibility(donationDate, donatedAt + (DONOR_COOLDOWN_DAYS - 1) * DAY_MS)?.eligible).toBe(false);
    expect(getDonationEligibility(donationDate, donatedAt + DONOR_COOLDOWN_DAYS * DAY_MS)?.eligible).toBe(true);
  });

  it("rejects malformed, impossible, and future donation dates", () => {
    expect(getDonationEligibility("not-a-date")).toBeNull();
    expect(getDonationEligibility("2026-02-30")).toBeNull();
    expect(isValidBloodDonationDate("2999-01-01")).toBe(false);
  });

  it("rejects Ready when the donor has not completed the cooldown", () => {
    const recentDate = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
    const result = donorSchema.safeParse({
      bloodGroup: "B+",
      availability: "available",
      preferredContact: "phone",
      contactValue: "donor@example.com",
      phone: "01712345678",
      whatsapp: "01712345678",
      lastDonationAt: recentDate,
      divisionId: "division",
      districtId: "district",
      upazilaId: "upazila",
      consentListed: true,
      consentContact: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === "availability")).toBe(true);
  });
});
