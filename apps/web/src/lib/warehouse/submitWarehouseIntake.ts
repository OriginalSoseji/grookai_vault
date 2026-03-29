import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type {
  WarehouseEvidenceImageType,
  WarehouseSubmissionIntent,
} from "@/lib/warehouse/warehouseSubmission";

type WarehouseIntakePayload = {
  notes: string;
  tcgplayer_id?: string | null;
  submission_intent: WarehouseSubmissionIntent;
  intake_channel: "UPLOAD";
  evidence: {
    images: Array<{
      type: WarehouseEvidenceImageType;
      storage_path: string;
    }>;
  };
};

type WarehouseIntakeSuccessResponse = {
  success?: boolean;
  candidate_id?: string | null;
  error?: string | null;
  message?: string | null;
};

export class WarehouseIntakeSubmissionError extends Error {
  code: string | null;

  constructor(message: string, code?: string | null) {
    super(message);
    this.name = "WarehouseIntakeSubmissionError";
    this.code = code ?? null;
  }
}

function extractWarehouseIntakeMessage(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  if (typeof payload.message === "string" && payload.message.trim().length > 0) {
    return payload.message.trim();
  }

  if (typeof payload.error === "string" && payload.error.trim().length > 0) {
    return payload.error.trim();
  }

  return null;
}

function extractWarehouseIntakeCode(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  if (typeof payload.error === "string" && payload.error.trim().length > 0) {
    return payload.error.trim();
  }

  if (typeof payload.code === "string" && payload.code.trim().length > 0) {
    return payload.code.trim();
  }

  return null;
}

async function parseFunctionsHttpError(error: FunctionsHttpError) {
  try {
    const payload = await error.context.json();
    return {
      message: extractWarehouseIntakeMessage(payload) ?? error.message,
      code: extractWarehouseIntakeCode(payload),
    };
  } catch {
    return {
      message: error.message || "Warehouse intake failed.",
      code: null,
    };
  }
}

export async function submitWarehouseIntake(payload: WarehouseIntakePayload) {
  try {
    const { data, error } = await supabase.functions.invoke<WarehouseIntakeSuccessResponse>(
      "warehouse-intake-v1",
      {
        body: payload,
      },
    );

    if (error) {
      throw error;
    }

    if (data?.success !== true || typeof data.candidate_id !== "string" || data.candidate_id.trim().length === 0) {
      throw new WarehouseIntakeSubmissionError(
        extractWarehouseIntakeMessage(data) ?? "Warehouse intake did not return a candidate id.",
        extractWarehouseIntakeCode(data),
      );
    }

    return {
      candidateId: data.candidate_id,
      response: data,
    };
  } catch (error) {
    if (error instanceof WarehouseIntakeSubmissionError) {
      throw error;
    }

    if (error instanceof FunctionsHttpError) {
      const parsed = await parseFunctionsHttpError(error);
      throw new WarehouseIntakeSubmissionError(parsed.message, parsed.code);
    }

    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      throw new WarehouseIntakeSubmissionError(error.message || "Warehouse intake could not be reached.");
    }

    if (error instanceof Error) {
      throw new WarehouseIntakeSubmissionError(error.message || "Warehouse intake failed.");
    }

    throw new WarehouseIntakeSubmissionError("Warehouse intake failed.");
  }
}
