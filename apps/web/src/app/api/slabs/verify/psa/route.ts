import { NextRequest, NextResponse } from "next/server";
import { verifyPsaCert } from "@/lib/slabs/psaVerificationAdapter";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { cert_number?: unknown } | null;
    const certNumber = typeof body?.cert_number === "string" ? body.cert_number : "";

    if (!certNumber.trim()) {
      return NextResponse.json({ error: "MISSING_CERT" }, { status: 400 });
    }

    const result = await verifyPsaCert(certNumber);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
