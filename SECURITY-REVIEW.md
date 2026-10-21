# Security Review

**Review date:** 2026-10-20  
**Scope:** Static review of the application source and configuration.

## Findings and remediation

### 1. Donor contact details can be disclosed without requester approval

- **Severity:** HIGH
- **Confidence:** 10/10
- **Location:** `src/features/blood/actions.ts:114-117`
- **Authorization:** `src/services/blood.ts:34-51`, `src/services/blood.ts:211-215`
- **Status:** Fixed

The server action now passes the authenticated user's ID to the service. Contact details are released only if that user owns a current, active (admin-approved) blood request for the donor's blood group and the donor's listing/contact consent has not expired.

### 2. Session signing falls back to a known secret

- **Severity:** HIGH
- **Confidence:** 9/10
- **Location:** `src/lib/auth/session.ts:9-14`
- **Documentation:** `README.md:70-77`
- **Status:** Fixed

The known fallback is now restricted to development. All other environments throw an explicit error unless `AUTH_SECRET` is configured with at least 32 non-whitespace characters; the documented placeholder is rejected. The setup documentation now describes this requirement.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd test` (45 tests passed)

## Limitations

This is a static review, not a full penetration test. Findings should be confirmed against the intended donor-contact approval flow and deployment configuration.
