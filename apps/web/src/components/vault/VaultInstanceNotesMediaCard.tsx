"use client";

import { useEffect, useRef, useState, useTransition, type MutableRefObject } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  buildVaultInstanceMediaStoragePath,
  VAULT_INSTANCE_MEDIA_ACCEPT,
  VAULT_INSTANCE_MEDIA_BUCKET,
  VAULT_INSTANCE_MEDIA_MAX_BYTES,
  type VaultInstanceMediaSide,
} from "@/lib/vaultInstanceMedia";
import { supabase } from "@/lib/supabaseClient";
import { saveVaultItemInstanceMediaAction } from "@/lib/vault/saveVaultItemInstanceMediaAction";
import { saveVaultItemInstanceNotesAction } from "@/lib/vault/saveVaultItemInstanceNotesAction";

type VaultInstanceNotesMediaCardProps = {
  userId: string;
  instanceId: string;
  initialNotes: string | null;
  initialFrontImageUrl: string | null;
  initialBackImageUrl: string | null;
  initialFrontImagePath: string | null;
  initialBackImagePath: string | null;
  isActive: boolean;
};

function MediaTile({
  side,
  imageUrl,
  isBusy,
  isActive,
  inputRef,
  onPick,
  onRemove,
}: {
  side: VaultInstanceMediaSide;
  imageUrl: string | null;
  isBusy: boolean;
  isActive: boolean;
  inputRef: MutableRefObject<HTMLInputElement | null>;
  onPick: () => void;
  onRemove: () => void;
}) {
  const label = side === "front" ? "Front photo" : "Back photo";

  return (
    <div className="space-y-3 rounded-[1rem] border border-slate-200 bg-white p-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="text-sm text-slate-600">
          Upload an exact-copy image for this GVVI.
        </p>
      </div>

      <div className="overflow-hidden rounded-[0.9rem] border border-slate-200 bg-slate-50">
        {imageUrl ? (
          <div className="relative aspect-[3/4] w-full">
            <Image src={imageUrl} alt={label} fill className="object-contain" />
          </div>
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center px-4 text-center text-sm text-slate-500">
            No {side} photo uploaded yet.
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={VAULT_INSTANCE_MEDIA_ACCEPT}
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void onPick();
        }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!isActive || isBusy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? "Uploading..." : imageUrl ? "Replace" : "Upload"}
        </button>
        {imageUrl ? (
          <button
            type="button"
            disabled={!isActive || isBusy}
            onClick={onRemove}
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function VaultInstanceNotesMediaCard({
  userId,
  instanceId,
  initialNotes,
  initialFrontImageUrl,
  initialBackImageUrl,
  initialFrontImagePath,
  initialBackImagePath,
  isActive,
}: VaultInstanceNotesMediaCardProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [frontImageUrl, setFrontImageUrl] = useState(initialFrontImageUrl);
  const [backImageUrl, setBackImageUrl] = useState(initialBackImageUrl);
  const [frontImagePath, setFrontImagePath] = useState(initialFrontImagePath);
  const [backImagePath, setBackImagePath] = useState(initialBackImagePath);
  const [statusMessage, setStatusMessage] = useState<{ tone: "success" | "error"; body: string } | null>(null);
  const [pendingField, setPendingField] = useState<"notes" | "front" | "back" | null>(null);
  const [isPending, startTransition] = useTransition();
  const frontInputRef = useRef<HTMLInputElement | null>(null);
  const backInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setNotes(initialNotes ?? "");
  }, [initialNotes]);

  useEffect(() => {
    setFrontImageUrl(initialFrontImageUrl);
    setFrontImagePath(initialFrontImagePath);
  }, [initialFrontImagePath, initialFrontImageUrl]);

  useEffect(() => {
    setBackImageUrl(initialBackImageUrl);
    setBackImagePath(initialBackImagePath);
  }, [initialBackImagePath, initialBackImageUrl]);

  async function handleNotesSave() {
    if (!isActive || pendingField || notes === (initialNotes ?? "")) {
      return;
    }

    setPendingField("notes");
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const result = await saveVaultItemInstanceNotesAction({
          instanceId,
          notes,
        });

        if (!result.ok) {
          setStatusMessage({ tone: "error", body: result.message });
          setPendingField(null);
          return;
        }

        setNotes(result.notes ?? "");
        setStatusMessage({ tone: "success", body: "Notes saved." });
        setPendingField(null);
        router.refresh();
      } catch {
        setStatusMessage({ tone: "error", body: "Notes could not be saved." });
        setPendingField(null);
      }
    });
  }

  async function handleMediaUpload(side: VaultInstanceMediaSide) {
    if (!isActive || pendingField) {
      return;
    }

    const input = side === "front" ? frontInputRef.current : backInputRef.current;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (!file.type.toLowerCase().startsWith("image/")) {
      setStatusMessage({ tone: "error", body: "Upload an image file." });
      if (input) {
        input.value = "";
      }
      return;
    }

    if (file.size > VAULT_INSTANCE_MEDIA_MAX_BYTES) {
      setStatusMessage({ tone: "error", body: "Images must be 10 MB or smaller." });
      if (input) {
        input.value = "";
      }
      return;
    }

    const storagePath = buildVaultInstanceMediaStoragePath(userId, instanceId, side);
    const objectUrl = URL.createObjectURL(file);
    const previousUrl = side === "front" ? frontImageUrl : backImageUrl;
    const previousPath = side === "front" ? frontImagePath : backImagePath;

    if (side === "front") {
      setFrontImageUrl(objectUrl);
    } else {
      setBackImageUrl(objectUrl);
    }

    setPendingField(side);
    setStatusMessage(null);

    try {
      const { error: uploadError } = await supabase.storage
        .from(VAULT_INSTANCE_MEDIA_BUCKET)
        .upload(storagePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        if (side === "front") {
          setFrontImageUrl(previousUrl);
        } else {
          setBackImageUrl(previousUrl);
        }
        setStatusMessage({ tone: "error", body: uploadError.message || "Copy photo upload failed." });
        return;
      }

      const result = await saveVaultItemInstanceMediaAction({
        instanceId,
        side,
        storagePath,
      });

      if (!result.ok) {
        if (side === "front") {
          setFrontImageUrl(previousUrl);
        } else {
          setBackImageUrl(previousUrl);
        }
        setStatusMessage({ tone: "error", body: result.message });
        return;
      }

      if (side === "front") {
        setFrontImagePath(storagePath);
      } else {
        setBackImagePath(storagePath);
      }

      setStatusMessage({
        tone: "success",
        body: side === "front" ? "Front photo saved." : "Back photo saved.",
      });
      router.refresh();
    } finally {
      if (input) {
        input.value = "";
      }
      setPendingField(null);
    }
  }

  async function handleMediaRemove(side: VaultInstanceMediaSide) {
    if (!isActive || pendingField) {
      return;
    }

    const currentPath = side === "front" ? frontImagePath : backImagePath;
    if (!currentPath) {
      return;
    }

    const previousUrl = side === "front" ? frontImageUrl : backImageUrl;
    const previousPath = currentPath;

    if (side === "front") {
      setFrontImageUrl(null);
      setFrontImagePath(null);
    } else {
      setBackImageUrl(null);
      setBackImagePath(null);
    }

    setPendingField(side);
    setStatusMessage(null);

    try {
      const { error: removeError } = await supabase.storage
        .from(VAULT_INSTANCE_MEDIA_BUCKET)
        .remove([currentPath]);

      if (removeError) {
        throw removeError;
      }

      const result = await saveVaultItemInstanceMediaAction({
        instanceId,
        side,
        storagePath: null,
      });

      if (!result.ok) {
        throw new Error(result.message);
      }

      setStatusMessage({
        tone: "success",
        body: side === "front" ? "Front photo removed." : "Back photo removed.",
      });
      router.refresh();
    } catch (error) {
      if (side === "front") {
        setFrontImageUrl(previousUrl);
        setFrontImagePath(previousPath);
      } else {
        setBackImageUrl(previousUrl);
        setBackImagePath(previousPath);
      }
      setStatusMessage({
        tone: "error",
        body: error instanceof Error && error.message ? error.message : "Copy photo could not be removed.",
      });
    } finally {
      setPendingField(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1rem] border border-slate-200 bg-white p-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</p>
          <textarea
            value={notes}
            disabled={!isActive || pendingField !== null || isPending}
            onChange={(event) => setNotes(event.target.value)}
            rows={6}
            placeholder="Add exact-copy notes for condition, provenance, or anything you want to remember."
            className="w-full rounded-[0.95rem] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!isActive || pendingField !== null || isPending || notes === (initialNotes ?? "")}
            onClick={() => {
              void handleNotesSave();
            }}
            className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {pendingField === "notes" ? "Saving..." : "Save notes"}
          </button>
          {!isActive ? <p className="text-sm text-slate-500">Archived copies keep notes as historical context.</p> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MediaTile
          side="front"
          imageUrl={frontImageUrl}
          isBusy={pendingField === "front"}
          isActive={isActive}
          inputRef={frontInputRef}
          onPick={() => handleMediaUpload("front")}
          onRemove={() => {
            void handleMediaRemove("front");
          }}
        />
        <MediaTile
          side="back"
          imageUrl={backImageUrl}
          isBusy={pendingField === "back"}
          isActive={isActive}
          inputRef={backInputRef}
          onPick={() => handleMediaUpload("back")}
          onRemove={() => {
            void handleMediaRemove("back");
          }}
        />
      </div>

      {statusMessage ? (
        <p className={`text-sm ${statusMessage.tone === "success" ? "text-emerald-700" : "text-rose-700"}`}>
          {statusMessage.body}
        </p>
      ) : null}
    </div>
  );
}
