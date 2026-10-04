"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";
import { executeOwnerWriteV1 } from "@/lib/contracts/execute_owner_write_v1";
import { getJungleEditionResolution } from "@/lib/cards/jungleEditionResolution";
import { verifyPsaCert } from "@/lib/slabs/psaVerificationAdapter";
import { normalizePsaCertNumber, parsePsaCertificateResponse } from "@/lib/slabs/psaCertificateResponse";
import { reviewJungleSlabCertificate } from "@/lib/slabs/reviewJungleSlabCertificate";
import { openJungleSlabTicket, sealJungleSlabTicket } from "@/lib/slabs/jungleSlabTicket";

type Failure = { ok: false; message: string };
type Prepared = { ok: true; token: string; certNumber: string; grade: string; label: string };
type Saved = { ok: true; instanceId: string; gvviId: string };
const fail = (message: string): Failure => ({ ok: false, message });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class IntakeMessage extends Error {}
function secret() {
  const value = process.env.JUNGLE_SLAB_INTAKE_SECRET ?? "";
  if (process.env.JUNGLE_SLAB_INTAKE_ENABLED !== "true" || value.length < 32) throw new Error("Intake unavailable");
  return value;
}
async function session() {
  const client = await createServerComponentClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("Authentication required");
  return { client, user };
}
async function catalog(client: Awaited<ReturnType<typeof createServerComponentClient>>, parent: string, child: string) {
  const resolution = await getJungleEditionResolution(client, parent);
  if (resolution.status !== "ready" || !resolution.options.some(o => o.card_print_id === parent && o.card_printing_id === child)) throw new Error("Selection unavailable");
  const { data, error } = await client.from("card_prints")
    .select("id,gv_id,name,number,set_code,identity_domain,printed_identity_modifier").eq("id", parent).single();
  if (error || !data || data.identity_domain !== "pokemon_eng_standard") throw new Error("Canonical identity unavailable");
  return { resolution, canonical: { ...data, game_code: "pokemon", language: "en" } };
}

export async function prepareJungleSlab(input: {
  cardPrintId: string; printingId: string; certNumber: string; certNumberConfirm: string; grade: string;
}): Promise<Prepared | Failure> {
  try {
    const encryptionSecret = secret(), { client, user } = await session();
    if (!input || typeof input.cardPrintId !== "string" || typeof input.printingId !== "string"
      || !uuid.test(input.cardPrintId) || !uuid.test(input.printingId)) return fail("Choose an exact edition and printing.");
    const certNumber = normalizePsaCertNumber(input.certNumber);
    if (!certNumber || certNumber !== normalizePsaCertNumber(input.certNumberConfirm)) return fail("Enter matching certification numbers.");
    if (typeof input.grade !== "string" || !/^(?:[1-9](?:\.5)?|10)$/.test(input.grade)) return fail("Choose a supported PSA grade.");
    const { resolution, canonical } = await catalog(client, input.cardPrintId, input.printingId);
    const verification = await verifyPsaCert(certNumber);
    const review = reviewJungleSlabCertificate({ requestedCertNumber: certNumber, verification, resolution, canonical, selectedPrintingId: input.printingId });
    if (review.status !== "matched") return fail("PSA could not confirm this exact edition and finish. Check the label and selection.");
    const parsed = parsePsaCertificateResponse(certNumber, verification.raw_payload);
    const numericGrade = parsed.grade?.trim().match(/(\d+(?:\.\d+)?)\s*$/)?.[1];
    if (!numericGrade || Number(numericGrade) !== Number(input.grade)) return fail("The selected grade does not match PSA.");
    const grade = String(Number(numericGrade)), now = Date.now();
    const token = sealJungleSlabTicket({ version: 1, ownerId: user.id, requestId: randomUUID(),
      cardPrintId: canonical.id, printingId: input.printingId, gvId: canonical.gv_id,
      certNumber, grade, issuedAt: now, expiresAt: now + 30 * 60_000, payload: verification.raw_payload }, encryptionSecret, now);
    return { ok: true, token, certNumber, grade, label: `${canonical.name} — ${review.option.edition === "first_edition" ? "First Edition" : "Unlimited"} · ${review.option.finish_key === "holo" ? "Holo" : "Normal"}` };
  } catch { return fail("Slab verification is unavailable. Sign in and try again."); }
}

export async function saveJungleSlab(token: string, ownershipConfirmed: boolean): Promise<Saved | Failure> {
  try {
    const encryptionSecret = secret(), { client, user } = await session();
    if (ownershipConfirmed !== true) return fail("Confirm that you own this exact slab.");
    const ticket = openJungleSlabTicket(token, encryptionSecret, user.id);
    const { resolution, canonical } = await catalog(client, ticket.cardPrintId, ticket.printingId);
    if (canonical.gv_id !== ticket.gvId) return fail("This card's identity changed. Verify again.");
    const review = reviewJungleSlabCertificate({ requestedCertNumber: ticket.certNumber,
      verification: parsePsaCertificateResponse(ticket.certNumber, ticket.payload), resolution, canonical, selectedPrintingId: ticket.printingId });
    if (review.status !== "matched") return fail("This printing can no longer be confirmed. Verify again.");
    const result = await executeOwnerWriteV1<Saved>({
      execution_name: "jungle_slab_intake", actor_id: user.id,
      write: async ({ adminClient }) => {
        const { data, error } = await adminClient.rpc("admin_jungle_slab_intake_v1", {
          p_user_id: user.id, p_request_id: ticket.requestId, p_card_print_id: ticket.cardPrintId,
          p_card_printing_id: ticket.printingId, p_cert_number: ticket.certNumber,
          p_grade: Number(ticket.grade), p_provider_payload: ticket.payload,
        });
        if (error?.message?.includes("JUNGLE_SLAB_ALREADY_OWNED")) throw new IntakeMessage("This certificate is already in your Vault. Open your Vault to view it.");
        if (error?.message?.includes("JUNGLE_SLAB_RETRY_STATE_CHANGED")) throw new IntakeMessage("The saved copy has changed. Check your Vault before starting another save.");
        if (error?.message?.includes("JUNGLE_SLAB_EXISTING_CERTIFICATE_MISMATCH")) throw new IntakeMessage("This certificate has a different saved identity or grade and needs review.");
        if (error || !data || typeof data.instance_id !== "string" || !uuid.test(data.instance_id)
          || typeof data.gv_vi_id !== "string" || !data.gv_vi_id) throw new Error("Save not confirmed");
        return { ok: true, instanceId: data.instance_id, gvviId: data.gv_vi_id };
      },
      proofs: [async ({ adminClient, result: saved }) => {
        const { data: copy, error } = await adminClient.from("vault_item_instances")
          .select("id,user_id,gv_vi_id,card_print_id,card_printing_id,slab_cert_id,legacy_vault_item_id,archived_at,is_graded,grade_company,grade_value")
          .eq("id", saved.instanceId).single();
        if (error || !copy || copy.user_id !== user.id || copy.archived_at !== null || copy.card_print_id !== null
          || copy.card_printing_id !== ticket.printingId || copy.gv_vi_id !== saved.gvviId || copy.is_graded !== true
          || copy.grade_company !== "PSA" || Number(copy.grade_value) !== Number(ticket.grade)) throw new Error("Exact copy proof failed");
        const [{ data: cert, error: certError }, { data: anchor, error: anchorError }] = await Promise.all([
          adminClient.from("slab_certs").select("card_print_id,normalized_grader,normalized_cert_number,grade").eq("id", copy.slab_cert_id).single(),
          adminClient.from("vault_items").select("user_id,card_id,qty,archived_at").eq("id", copy.legacy_vault_item_id).single(),
        ]);
        if (certError || anchorError || !cert || !anchor || cert.card_print_id !== ticket.cardPrintId
          || cert.normalized_grader !== "PSA" || cert.normalized_cert_number !== ticket.certNumber || Number(cert.grade) !== Number(ticket.grade)
          || anchor.user_id !== user.id || anchor.card_id !== ticket.cardPrintId || anchor.qty !== 1 || anchor.archived_at !== null) throw new Error("Certificate and anchor proof failed");
      }],
    });
    revalidatePath("/vault"); revalidatePath("/wall"); revalidatePath(`/card/${ticket.gvId}`);
    return result;
  } catch (error) {
    return fail(error instanceof IntakeMessage ? error.message : "The save could not be confirmed. Retry with this verification. If it has expired, verify again.");
  }
}
