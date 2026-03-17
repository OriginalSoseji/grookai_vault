import "server-only";

export type SlabVerificationResult = {
  grader: "PSA";
  cert_number: string;
  verified: boolean;
  grade?: string;
  title?: string;
  image_url?: string;
  parser_status: "verified" | "partial" | "failed";
  error_code?: string;
  raw_payload?: unknown;
};

type PsaApiEnvelope = {
  IsValidRequest?: boolean;
  isValidRequest?: boolean;
  ServerMessage?: string;
  serverMessage?: string;
  [key: string]: unknown;
};

const DEFAULT_PSA_API_BASE_URL = "https://api.psacard.com/publicapi";

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeTitle(value: string | null | undefined) {
  return normalizeOptionalText(value);
}

function normalizeImageUrl(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return undefined;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return undefined;
}

function normalizeGradeValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : undefined;
  }

  return normalizeOptionalText(typeof value === "string" ? value : undefined);
}

function getPsaApiConfig() {
  const baseUrl = (process.env.PSA_API_BASE_URL ?? DEFAULT_PSA_API_BASE_URL).trim().replace(/\/+$/, "");
  const token = (process.env.PSA_API_TOKEN ?? "").trim();

  if (!baseUrl || !token) {
    return null;
  }

  return {
    baseUrl,
    token,
  };
}

function readEnvelopeFlag(payload: PsaApiEnvelope) {
  if (typeof payload.IsValidRequest === "boolean") {
    return payload.IsValidRequest;
  }

  if (typeof payload.isValidRequest === "boolean") {
    return payload.isValidRequest;
  }

  return undefined;
}

function readEnvelopeMessage(payload: PsaApiEnvelope) {
  return normalizeOptionalText(payload.ServerMessage ?? payload.serverMessage);
}

function collectObjects(value: unknown, objects: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjects(item, objects);
    }
    return objects;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    objects.push(record);
    for (const nestedValue of Object.values(record)) {
      collectObjects(nestedValue, objects);
    }
  }

  return objects;
}

function findFirstValue(
  payload: unknown,
  candidateKeys: string[],
): string | number | undefined {
  const wanted = new Set(candidateKeys.map((key) => key.toLowerCase()));
  const objects = collectObjects(payload);

  for (const record of objects) {
    for (const [key, value] of Object.entries(record)) {
      if (!wanted.has(key.toLowerCase())) {
        continue;
      }

      if (typeof value === "string" || typeof value === "number") {
        return value;
      }
    }
  }

  return undefined;
}

function sanitizeRawPayload(payload: PsaApiEnvelope) {
  return {
    IsValidRequest: readEnvelopeFlag(payload) ?? null,
    ServerMessage: readEnvelopeMessage(payload) ?? null,
  };
}

function normalizePsaApiPayload(certNumber: string, payload: PsaApiEnvelope): SlabVerificationResult {
  const isValidRequest = readEnvelopeFlag(payload);
  const serverMessage = readEnvelopeMessage(payload);

  if (typeof isValidRequest !== "boolean" || !serverMessage) {
    return {
      grader: "PSA",
      cert_number: certNumber,
      verified: false,
      parser_status: "failed",
      error_code: "PSA_API_INVALID_RESPONSE",
    };
  }

  const messageLower = serverMessage.toLowerCase();
  if (!isValidRequest && messageLower.includes("invalid cert")) {
    return {
      grader: "PSA",
      cert_number: certNumber,
      verified: false,
      parser_status: "failed",
      error_code: "INVALID_CERT_FORMAT",
      raw_payload: sanitizeRawPayload(payload),
    };
  }

  if (isValidRequest && messageLower.includes("no data found")) {
    return {
      grader: "PSA",
      cert_number: certNumber,
      verified: false,
      parser_status: "failed",
      error_code: "CERT_NOT_FOUND",
      raw_payload: sanitizeRawPayload(payload),
    };
  }

  if (!isValidRequest || !messageLower.includes("request successful")) {
    return {
      grader: "PSA",
      cert_number: certNumber,
      verified: false,
      parser_status: "failed",
      error_code: "PSA_API_INVALID_RESPONSE",
      raw_payload: sanitizeRawPayload(payload),
    };
  }

  const grade = normalizeGradeValue(
    findFirstValue(payload, ["Grade", "grade", "ItemGrade", "itemGrade", "GradeValue", "gradeValue"]),
  );
  const title = normalizeTitle(
    typeof findFirstValue(payload, ["Title", "title", "ItemDescription", "itemDescription", "Description", "description"]) ===
      "string"
      ? String(
          findFirstValue(payload, ["Title", "title", "ItemDescription", "itemDescription", "Description", "description"]),
        )
      : undefined,
  );
  const imageUrl = normalizeImageUrl(
    typeof findFirstValue(payload, ["ImageURL", "ImageUrl", "imageUrl", "ImageUri", "imageUri", "FrontImageUrl"]) ===
      "string"
      ? String(
          findFirstValue(payload, ["ImageURL", "ImageUrl", "imageUrl", "ImageUri", "imageUri", "FrontImageUrl"]),
        )
      : undefined,
  );

  const verified = Boolean(grade);

  return {
    grader: "PSA",
    cert_number: certNumber,
    verified,
    grade,
    title,
    image_url: imageUrl,
    parser_status: verified ? "verified" : title || imageUrl ? "partial" : "failed",
    error_code: verified ? undefined : "PSA_API_INVALID_RESPONSE",
    raw_payload: sanitizeRawPayload(payload),
  };
}

export async function verifyPsaCert(certNumber: string): Promise<SlabVerificationResult> {
  const cleanCert = certNumber.trim();

  if (!cleanCert) {
    return {
      grader: "PSA",
      cert_number: cleanCert,
      verified: false,
      parser_status: "failed",
      error_code: "EMPTY_CERT",
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

    const payload = (await response.json().catch(() => null)) as PsaApiEnvelope | null;
    if (!payload || typeof payload !== "object") {
      return {
        grader: "PSA",
        cert_number: cleanCert,
        verified: false,
        parser_status: "failed",
        error_code: "PSA_API_INVALID_RESPONSE",
      };
    }

    return normalizePsaApiPayload(cleanCert, payload);
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
