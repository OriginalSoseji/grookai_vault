import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { createServerAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createServerAdminClient>;

// LOCK: Ownership/trust mutations must enter through executeOwnerWriteV1.
// LOCK: Nested owner writes may reuse the active boundary, but they must not change actor authority.

export type OwnerWriteContextV1 = {
  executionName: string;
  actorId: string;
  adminClient: AdminClient;
  metadata: Map<string, unknown>;
  setMetadata: (key: string, value: unknown) => void;
  getMetadata: <T>(key: string) => T | undefined;
};

export type OwnerWriteProofContextV1<TResult> = OwnerWriteContextV1 & {
  result: TResult;
};

export type OwnerWriteProofV1<TResult> = (
  context: OwnerWriteProofContextV1<TResult>,
) => Promise<void>;

export type OwnerWriteErrorContextV1<TResult> = OwnerWriteContextV1 & {
  stage: "write" | "proof";
  error: unknown;
  result?: TResult;
};

type ExecuteOwnerWriteParamsV1<TResult> = {
  execution_name: string;
  actor_id: string;
  write: (context: OwnerWriteContextV1) => Promise<TResult>;
  proofs?: OwnerWriteProofV1<TResult>[];
  on_error?: (context: OwnerWriteErrorContextV1<TResult>) => Promise<void>;
};

const ownerWriteStorageV1 = new AsyncLocalStorage<OwnerWriteContextV1>();

function normalizeRequiredText(value: string, message: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(message);
  }
  return normalized;
}

function createOwnerWriteContextV1(input: {
  executionName: string;
  actorId: string;
  adminClient: AdminClient;
  metadata?: Map<string, unknown>;
}): OwnerWriteContextV1 {
  const metadata = input.metadata ?? new Map<string, unknown>();

  return {
    executionName: input.executionName,
    actorId: input.actorId,
    adminClient: input.adminClient,
    metadata,
    setMetadata(key, value) {
      metadata.set(key, value);
    },
    getMetadata(key) {
      return metadata.get(key) as never;
    },
  };
}

async function maybeHandleOwnerWriteErrorV1<TResult>(
  handler: ExecuteOwnerWriteParamsV1<TResult>["on_error"],
  context: OwnerWriteErrorContextV1<TResult>,
) {
  if (!handler) {
    return;
  }
  await handler(context);
}

async function runOwnerWriteWithinContextV1<TResult>(
  params: ExecuteOwnerWriteParamsV1<TResult>,
  context: OwnerWriteContextV1,
) {
  let result: TResult | undefined;

  try {
    result = await params.write(context);
  } catch (error) {
    await maybeHandleOwnerWriteErrorV1(params.on_error, {
      ...context,
      stage: "write",
      error,
      result,
    });
    throw error;
  }

  try {
    for (const proof of params.proofs ?? []) {
      await proof({
        ...context,
        result,
      });
    }
  } catch (error) {
    await maybeHandleOwnerWriteErrorV1(params.on_error, {
      ...context,
      stage: "proof",
      error,
      result,
    });
    throw error;
  }

  return result;
}

export function getActiveOwnerWriteContextV1() {
  return ownerWriteStorageV1.getStore() ?? null;
}

export async function executeOwnerWriteV1<TResult>(
  params: ExecuteOwnerWriteParamsV1<TResult>,
) {
  const executionName = normalizeRequiredText(
    params.execution_name,
    "OWNER_WRITE: execution_name required",
  );
  const actorId = normalizeRequiredText(params.actor_id, "OWNER_WRITE: actor_id required");
  const activeContext = getActiveOwnerWriteContextV1();

  if (activeContext) {
    if (activeContext.actorId !== actorId) {
      throw new Error("OWNER_WRITE: nested actor mismatch");
    }

    const nestedContext = createOwnerWriteContextV1({
      executionName,
      actorId,
      adminClient: activeContext.adminClient,
      metadata: activeContext.metadata,
    });

    return runOwnerWriteWithinContextV1(params, nestedContext);
  }

  const rootContext = createOwnerWriteContextV1({
    executionName,
    actorId,
    adminClient: createServerAdminClient(),
  });

  return ownerWriteStorageV1.run(rootContext, () =>
    runOwnerWriteWithinContextV1(params, rootContext),
  );
}
