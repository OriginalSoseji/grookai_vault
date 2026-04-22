"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import OwnedObjectRemoveAction from "@/components/vault/OwnedObjectRemoveAction";
import {
  getVaultIntentHelper,
  getVaultIntentLabel,
  type VaultIntent,
} from "@/lib/network/intent";
import { saveVaultItemInstanceIntentAction } from "@/lib/network/saveVaultItemInstanceIntentAction";
import { saveVaultItemInstanceConditionAction } from "@/lib/vault/saveVaultItemInstanceConditionAction";
import { saveVaultItemInstanceImageDisplayModeAction } from "@/lib/vault/saveVaultItemInstanceImageDisplayModeAction";
import { type VaultInstanceImageDisplayMode } from "@/lib/vaultInstanceImageDisplay";

const CONDITION_OPTIONS = ["NM", "LP", "MP", "HP", "DMG"] as const;
const INTENT_OPTIONS: VaultIntent[] = ["hold", "trade", "sell", "showcase"];
const IMAGE_DISPLAY_MODE_OPTIONS: VaultInstanceImageDisplayMode[] = ["canonical", "uploaded"];

type VaultInstanceSettingsCardProps = {
  instanceId: string;
  initialIntent: VaultIntent;
  initialConditionLabel: string | null;
  initialImageDisplayMode: VaultInstanceImageDisplayMode;
  isActive: boolean;
  isGraded: boolean;
};

export default function VaultInstanceSettingsCard({
  instanceId,
  initialIntent,
  initialConditionLabel,
  initialImageDisplayMode,
  isActive,
  isGraded,
}: VaultInstanceSettingsCardProps) {
  const router = useRouter();
  const [intent, setIntent] = useState(initialIntent);
  const [conditionLabel, setConditionLabel] = useState(initialConditionLabel ?? "NM");
  const [imageDisplayMode, setImageDisplayMode] = useState(initialImageDisplayMode);
  const [statusMessage, setStatusMessage] = useState<{ tone: "success" | "error"; body: string } | null>(null);
  const [pendingField, setPendingField] = useState<"intent" | "condition" | "imageDisplayMode" | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setIntent(initialIntent);
  }, [initialIntent]);

  useEffect(() => {
    setConditionLabel(initialConditionLabel ?? "NM");
  }, [initialConditionLabel]);

  useEffect(() => {
    setImageDisplayMode(initialImageDisplayMode);
  }, [initialImageDisplayMode]);

  function handleIntentChange(nextIntent: VaultIntent) {
    if (!isActive || pendingField || nextIntent === intent) {
      return;
    }

    const previousIntent = intent;
    setIntent(nextIntent);
    setPendingField("intent");
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const result = await saveVaultItemInstanceIntentAction({
          instanceId,
          intent: nextIntent,
        });

        if (!result.ok) {
          setIntent(previousIntent);
          setStatusMessage({ tone: "error", body: result.message });
          setPendingField(null);
          return;
        }

        setIntent(result.intent);
        setStatusMessage({ tone: "success", body: "Copy intent saved." });
        setPendingField(null);
        router.refresh();
      } catch {
        setIntent(previousIntent);
        setStatusMessage({ tone: "error", body: "Copy intent could not be saved." });
        setPendingField(null);
      }
    });
  }

  function handleConditionChange(nextCondition: string) {
    if (!isActive || isGraded || pendingField || nextCondition === conditionLabel) {
      return;
    }

    const previousCondition = conditionLabel;
    setConditionLabel(nextCondition);
    setPendingField("condition");
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const result = await saveVaultItemInstanceConditionAction({
          instanceId,
          conditionLabel: nextCondition,
        });

        if (!result.ok) {
          setConditionLabel(previousCondition);
          setStatusMessage({ tone: "error", body: result.message });
          setPendingField(null);
          return;
        }

        setConditionLabel(result.conditionLabel);
        setStatusMessage({ tone: "success", body: "Condition saved." });
        setPendingField(null);
        router.refresh();
      } catch {
        setConditionLabel(previousCondition);
        setStatusMessage({ tone: "error", body: "Condition could not be saved." });
        setPendingField(null);
      }
    });
  }

  function handleImageDisplayModeChange(nextImageDisplayMode: VaultInstanceImageDisplayMode) {
    if (!isActive || pendingField || nextImageDisplayMode === imageDisplayMode) {
      return;
    }

    const previousImageDisplayMode = imageDisplayMode;
    setImageDisplayMode(nextImageDisplayMode);
    setPendingField("imageDisplayMode");
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const result = await saveVaultItemInstanceImageDisplayModeAction({
          instanceId,
          imageDisplayMode: nextImageDisplayMode,
        });

        if (!result.ok) {
          setImageDisplayMode(previousImageDisplayMode);
          setStatusMessage({ tone: "error", body: result.message });
          setPendingField(null);
          return;
        }

        setImageDisplayMode(result.imageDisplayMode);
        setStatusMessage({ tone: "success", body: "Image display saved." });
        setPendingField(null);
        router.refresh();
      } catch {
        setImageDisplayMode(previousImageDisplayMode);
        setStatusMessage({ tone: "error", body: "Image display could not be saved." });
        setPendingField(null);
      }
    });
  }

  return (
    <div className="space-y-4 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Exact Copy Controls</p>
        <p className="text-sm text-slate-600">
          Intent and condition only change this exact owned copy.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Intent</span>
          <select
            value={intent}
            disabled={!isActive || pendingField !== null}
            onChange={(event) => handleIntentChange(event.target.value as VaultIntent)}
            className="w-full rounded-[0.95rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {INTENT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {getVaultIntentLabel(option)}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">{getVaultIntentHelper(intent)}</p>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Condition</span>
          {isGraded ? (
            <div className="rounded-[0.95rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
              Graded copies keep condition through slab identity.
            </div>
          ) : (
            <select
              value={conditionLabel}
              disabled={!isActive || pendingField !== null}
              onChange={(event) => handleConditionChange(event.target.value)}
              className="w-full rounded-[0.95rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {CONDITION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Image Display</span>
          <select
            value={imageDisplayMode}
            disabled={!isActive || pendingField !== null}
            onChange={(event) => handleImageDisplayModeChange(event.target.value as VaultInstanceImageDisplayMode)}
            className="w-full rounded-[0.95rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {IMAGE_DISPLAY_MODE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "canonical" ? "Use canonical art" : "Use uploaded photo"}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            {imageDisplayMode === "uploaded"
              ? "This copy prefers your uploaded front photo. Canonical art stays as fallback if the photo is unavailable."
              : "This copy always presents with canonical card art for its primary image."}
          </p>
        </label>
      </div>

      {!isActive ? (
        <p className="text-sm text-slate-500">This copy is archived. Condition and intent are now historical.</p>
      ) : null}

      {statusMessage ? (
        <p className={`text-sm ${statusMessage.tone === "success" ? "text-emerald-700" : "text-rose-700"}`}>
          {statusMessage.body}
        </p>
      ) : null}

      {isActive ? (
        <div className="border-t border-slate-200 pt-4">
          <p className="mb-3 text-sm text-slate-600">
            Remove this exact copy from the active vault. History, notes, media, and outcomes stay preserved.
          </p>
          <OwnedObjectRemoveAction
            instanceId={instanceId}
            label="Remove from vault"
            redirectHref="/vault"
          />
        </div>
      ) : null}
    </div>
  );
}
