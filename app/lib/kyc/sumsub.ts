// Sumsub KYC integration — sandbox-ready skeleton.
//
// Implements the two API calls we need for Q1 launch:
//   1. createApplicant(userId, email, country) — register user in Sumsub
//   2. createAccessToken(applicantId) — generate SDK access token for
//      browser-side verification flow
//
// Production path: founder sets up Sumsub sandbox account (free tier ~100
// verifications/mo), pastes SUMSUB_APP_TOKEN + SUMSUB_SECRET_KEY into .env,
// and the dashboard verification endpoint becomes live. Until then, all
// requests fail-closed with a configured error.
//
// Reference: https://developers.sumsub.com/api-reference/
//
// Tier policy (matches Terms §5 v1 2026-05-27):
//   Tier 1 (<$500 lifetime): no Sumsub call
//   Tier 2 ($500-$1k): light verification (ID photo + tax ID) — also pre-Sumsub
//   Tier 3 ($1k-$10k): Sumsub full flow — this module's primary use
//   Tier 4 (>$10k): Sumsub + enhanced due-diligence questionnaire
//
// Signing: Sumsub requires HMAC-SHA256 signature on every request. We sign
// with the app secret + timestamp + method + path + body.

import crypto from "crypto";

const SUMSUB_BASE_URL =
  process.env.SUMSUB_BASE_URL || "https://api.sumsub.com";
const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN || "";
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY || "";
const SUMSUB_LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME || "basic-kyc-level";

function assertConfigured(): void {
  if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
    throw new Error(
      "Sumsub not configured — SUMSUB_APP_TOKEN / SUMSUB_SECRET_KEY missing. " +
        "See code/calculadora/SUMSUB_SETUP.md.",
    );
  }
}

/**
 * Sign a Sumsub API request per their auth spec:
 *   X-App-Token: <token>
 *   X-App-Access-Sig: HMAC_SHA256(secret, timestamp + method + path + body)
 *   X-App-Access-Ts: <unix-timestamp-seconds>
 */
function signRequest(
  method: "GET" | "POST",
  pathWithQuery: string,
  body: string,
): { sig: string; ts: number } {
  const ts = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", SUMSUB_SECRET_KEY)
    .update(ts + method + pathWithQuery + body)
    .digest("hex");
  return { sig: signature, ts };
}

interface ApplicantInfo {
  /** Internal user id (UUID from Supabase auth.users.id). Required for de-dup. */
  externalUserId: string;
  email?: string;
  /** ISO-2 country code. Optional; Sumsub infers from IP if omitted. */
  countryIso2?: "AR" | "BR";
}

interface ApplicantResponse {
  id: string;
  createdAt: string;
  inspectionId: string;
  externalUserId: string;
  review: { reviewStatus: string };
}

/**
 * Create a Sumsub applicant for the given user. Idempotent on externalUserId
 * — if the user already has an applicant, Sumsub returns the existing one.
 *
 * Returns the applicant record (with `id`, used downstream to generate the
 * SDK access token).
 */
export async function createApplicant(
  info: ApplicantInfo,
): Promise<ApplicantResponse> {
  assertConfigured();

  const pathWithQuery = `/resources/applicants?levelName=${encodeURIComponent(
    SUMSUB_LEVEL_NAME,
  )}`;
  const body = JSON.stringify({
    externalUserId: info.externalUserId,
    email: info.email,
    info: info.countryIso2 ? { country: info.countryIso2 } : undefined,
  });

  const { sig, ts } = signRequest("POST", pathWithQuery, body);

  const res = await fetch(`${SUMSUB_BASE_URL}${pathWithQuery}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Token": SUMSUB_APP_TOKEN,
      "X-App-Access-Sig": sig,
      "X-App-Access-Ts": String(ts),
    },
    body,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Sumsub createApplicant ${res.status}: ${txt.slice(0, 200)}`);
  }
  return (await res.json()) as ApplicantResponse;
}

interface AccessTokenResponse {
  token: string;
  userId: string;
}

/**
 * Generate a short-lived (10 min) SDK access token for the browser-side
 * verification flow. Pass this to the @sumsub/websdk on the frontend.
 *
 * Sumsub docs: https://developers.sumsub.com/api-reference/#generating-an-access-token
 */
export async function createAccessToken(
  externalUserId: string,
  ttlSec = 600,
): Promise<AccessTokenResponse> {
  assertConfigured();

  const pathWithQuery =
    `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}` +
    `&levelName=${encodeURIComponent(SUMSUB_LEVEL_NAME)}` +
    `&ttlInSecs=${ttlSec}`;
  const body = "";

  const { sig, ts } = signRequest("POST", pathWithQuery, body);

  const res = await fetch(`${SUMSUB_BASE_URL}${pathWithQuery}`, {
    method: "POST",
    headers: {
      "X-App-Token": SUMSUB_APP_TOKEN,
      "X-App-Access-Sig": sig,
      "X-App-Access-Ts": String(ts),
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Sumsub createAccessToken ${res.status}: ${txt.slice(0, 200)}`,
    );
  }
  return (await res.json()) as AccessTokenResponse;
}

/**
 * Verify Sumsub webhook signature. Sumsub posts review results to a webhook
 * we configure in dashboard; the body is HMAC-SHA256 signed with the secret.
 *
 * Use in `/api/sumsub-webhook` (separate route, not in scope this batch).
 */
export function verifyWebhookSignature(
  body: string,
  signatureHeader: string,
  digest: "sha1" | "sha256" | "sha512" = "sha256",
): boolean {
  if (!SUMSUB_SECRET_KEY) return false;
  const computed = crypto
    .createHmac(digest, SUMSUB_SECRET_KEY)
    .update(body)
    .digest("hex");
  // Constant-time compare to prevent timing attacks.
  if (computed.length !== signatureHeader.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signatureHeader),
  );
}
