export const DONOR_COOLDOWN_DAYS = 75;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getDonationEligibility(lastDonationAt: string, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastDonationAt)) return null;
  const [year, month, day] = lastDonationAt.split("-").map(Number);
  const donatedAt = Date.UTC(year, month - 1, day);
  if (new Date(donatedAt).toISOString().slice(0, 10) !== lastDonationAt) return null;
  const eligibleAt = donatedAt + DONOR_COOLDOWN_DAYS * DAY_MS;
  return {
    eligible: now >= eligibleAt,
    eligibleAt,
    remainingMs: Math.max(0, eligibleAt - now),
  };
}

export function isValidBloodDonationDate(value: string, now = Date.now()) {
  const eligibility = getDonationEligibility(value, now);
  return eligibility !== null && Date.parse(`${value}T00:00:00.000Z`) <= now;
}
