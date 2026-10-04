import "server-only";
import { normalizePsaCertNumber, parsePsaCertificateResponse } from "@/lib/slabs/psaCertificateResponse";
import type { SlabVerificationResult } from "@/lib/slabs/psaCertificateResponse";
export type { SlabVerificationResult } from "@/lib/slabs/psaCertificateResponse";

const DEFAULT_PSA_API_BASE_URL = "https://api.psacard.com/publicapi";
function getPsaApiConfig() {
  const baseUrl = (process.env.PSA_API_BASE_URL ?? DEFAULT_PSA_API_BASE_URL).trim().replace(/\/+$/, "");
  const token = (process.env.PSA_API_TOKEN ?? "").trim();
  return baseUrl && token ? { baseUrl, token } : null;
}

export async function verifyPsaCert(certNumber: string): Promise<SlabVerificationResult> {
  const cleanCert = normalizePsaCertNumber(certNumber);

  if (!cleanCert) {
    return {
      grader: "PSA",
      cert_number: cleanCert ?? certNumber.trim(),
      verified: false,
      parser_status: "failed",
      error_code: "INVALID_CERT_FORMAT",
    };
  }

  const config = getPsaApiConfig();
  if (!config) {
    return {
      grader: "PSA",
      cert_number: cleanCert,
      verified: false,
      parser_status: "failed",
      error_code: "MISSING_PSA_CONFIG",
    };
  }

  try {
    const response = await fetch(`${config.baseUrl}/cert/GetByCertNumber/${encodeURIComponent(cleanCert)}`, {
      method: "GET",
      headers: {
        Authorization: `bearer ${config.token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const status = response.status;
      return {
        grader: "PSA",
        cert_number: cleanCert,
        verified: false,
        parser_status: "failed",
        error_code:
          status === 401
            ? "HTTP_401"
            : status === 403
              ? "HTTP_403"
              : status === 404
                ? "HTTP_404"
                : status === 429
                  ? "HTTP_429"
                  : status >= 500
                    ? "HTTP_5XX"
                    : `HTTP_${status}`,
      };
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    if (!payload || typeof payload !== "object") {
      return {
        grader: "PSA",
        cert_number: cleanCert,
        verified: false,
        parser_status: "failed",
        error_code: "PSA_API_INVALID_RESPONSE",
      };
    }

    return parsePsaCertificateResponse(cleanCert, payload);
  } catch {
    return {
      grader: "PSA",
      cert_number: cleanCert,
      verified: false,
      parser_status: "failed",
      error_code: "FETCH_EXCEPTION",
    };
  }
}
