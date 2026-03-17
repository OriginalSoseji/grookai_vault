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

const PSA_BASE_URL = "https://www.psacard.com";

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function normalizeText(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toAbsoluteUrl(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return `${PSA_BASE_URL}${normalized}`;
  }

  return undefined;
}

function matchFirst(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      return normalizeText(match[1]);
    }
  }

  return undefined;
}

function normalizeTitle(title: string | null | undefined) {
  const normalized = normalizeText(title);
  if (!normalized) {
    return undefined;
  }

  return normalized
    .replace(/\s*\|\s*PSA(?:\s+Card)?(?:\s+Cert(?:ification)?\s+Verification)?\s*$/i, "")
    .replace(/\s*-\s*PSA(?:\s+Card)?(?:\s+Cert(?:ification)?\s+Verification)?\s*$/i, "")
    .trim();
}

function parsePsaHtml(certNumber: string, html: string): SlabVerificationResult {
  if (/__cf_chl|Just a moment|Enable JavaScript and cookies to continue/i.test(html)) {
    return {
      grader: "PSA",
      cert_number: certNumber,
      verified: false,
      parser_status: "failed",
      error_code: "PSA_CHALLENGE_BLOCKED",
    };
  }

  const grade = matchFirst(html, [
    /Item Grade<\/span>\s*<span[^>]*>([^<]+)</i,
    /Grade<\/span>\s*<span[^>]*>([^<]+)</i,
    /"itemGrade"\s*:\s*"([^"]+)"/i,
    /"grade"\s*:\s*"([^"]+)"/i,
  ]);

  const title = normalizeTitle(
    matchFirst(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<title>([^<]+)<\/title>/i,
    ]),
  );

  const imageUrl = toAbsoluteUrl(
    matchFirst(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
    ]),
  );

  const verified = Boolean(grade);
  const hasPartialData = Boolean(title || imageUrl);

  return {
    grader: "PSA",
    cert_number: certNumber,
    verified,
    grade,
    title,
    image_url: imageUrl,
    parser_status: verified ? "verified" : hasPartialData ? "partial" : "failed",
    error_code: verified ? undefined : hasPartialData ? "GRADE_NOT_FOUND" : "PARSE_EMPTY",
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

  try {
    const url = `${PSA_BASE_URL}/cert/${encodeURIComponent(cleanCert)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (GrookaiVault)",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        grader: "PSA",
        cert_number: cleanCert,
        verified: false,
        parser_status: "failed",
        error_code: response.status === 404 ? "CERT_NOT_FOUND" : `HTTP_${response.status}`,
      };
    }

    const html = await response.text();
    return parsePsaHtml(cleanCert, html);
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
