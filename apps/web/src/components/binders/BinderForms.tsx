"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  binderFormAction,
  blockBinderMemberAction,
  blockBinderOwnerAction,
  blockBinderPublicMemberAction,
  createBinderAction,
  reportBinderPublicActionAction,
  reportBinderSurfaceAction,
} from "@/lib/binders/actions";
import type {
  BinderActionState,
  BinderChecklistSlot,
  BinderConsent,
  BinderContributionPolicy,
  BinderDiscoverability,
  BinderJoinPolicy,
  BinderNotificationPreference,
  BinderProgressUnit,
  BinderPublicContributionAction,
  BinderReadAccess,
} from "@/lib/binders/types";
import { BinderIdempotencyField } from "./BinderIdempotencyScope";
import { useBinderOnline } from "./BinderOfflineBanner";
import { CustomBinderSlotEditor } from "./CustomBinderSlotEditor";
import type { BinderSpeciesOption } from "@/lib/binders/speciesOptions";
import type { BinderSetOption } from "@/lib/binders/speciesOptions";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-emerald-300";
const labelClass = "block text-sm font-medium text-slate-700";

function SubmitButton({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();
  const online = useBinderOnline();
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
      : tone === "secondary"
        ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
        : "border-slate-950 bg-slate-950 text-white hover:bg-slate-800";
  return (
    <button
      type="submit"
      disabled={pending || !online}
      aria-disabled={pending || !online}
      className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${toneClass}`}
    >
      {pending ? "Working…" : !online ? "Offline" : children}
    </button>
  );
}

export function BinderServerActionButton({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "secondary" | "danger";
}) {
  return <SubmitButton tone={tone}>{children}</SubmitButton>;
}

export function BinderActionMessage({ state }: { state: BinderActionState | null }) {
  if (!state) {
    return null;
  }
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={`rounded-2xl border px-4 py-3 text-sm ${
        state.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      <p>{state.message}</p>
      {state.secretUrl ? (
        <div className="mt-3 space-y-2">
          <p className="font-semibold">Copy this link now. It will not be shown again.</p>
          <input
            readOnly
            aria-label="New secret Binder link"
            value={state.secretUrl}
            className={inputClass}
            onFocus={(event) => event.currentTarget.select()}
          />
          <CopySecretLinkButton value={state.secretUrl} />
        </div>
      ) : null}
    </div>
  );
}

function CopySecretLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="min-h-11 rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

export function CreateBinderForm({
  speciesOptions,
  setOptions,
  setBindersEnabled,
  customBindersEnabled,
}: {
  speciesOptions: BinderSpeciesOption[];
  setOptions: BinderSetOption[];
  setBindersEnabled: boolean;
  customBindersEnabled: boolean;
}) {
  const [state, action] = useFormState(createBinderAction, null);
  const [targetKind, setTargetKind] = useState<"species" | "set" | "custom">(
    "species",
  );
  return (
    <form action={action} className="space-y-5">
      <BinderIdempotencyField state={state} />
      <BinderActionMessage state={state} />
      <label className={labelClass}>
        Binder name
        <input
          className={inputClass}
          name="title"
          maxLength={80}
          required
          placeholder="My Pikachu Binder"
          autoComplete="off"
        />
      </label>
      <label className={labelClass}>
        Description <span className="font-normal text-slate-500">(optional)</span>
        <textarea
          className={`${inputClass} min-h-28 resize-y`}
          name="description"
          maxLength={1000}
          placeholder="What are you collecting together?"
        />
      </label>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-900">Binder type</legend>
        <label className="flex min-h-11 items-start gap-3 rounded-2xl border border-slate-200 p-3">
          <input
            type="radio"
            name="targetKind"
            value="species"
            checked={targetKind === "species"}
            onChange={() => setTargetKind("species")}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">Pokémon</span>
            <span className="block text-sm text-slate-600">Collect every card print for one Pokémon.</span>
          </span>
        </label>
        {setBindersEnabled ? (
          <label className="flex min-h-11 items-start gap-3 rounded-2xl border border-slate-200 p-3">
            <input
              type="radio"
              name="targetKind"
              value="set"
              checked={targetKind === "set"}
              onChange={() => setTargetKind("set")}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                Set
              </span>
              <span className="block text-sm text-slate-600">
                Complete the canonical master checklist for one set.
              </span>
            </span>
          </label>
        ) : null}
        {customBindersEnabled ? (
          <label className="flex min-h-11 items-start gap-3 rounded-2xl border border-slate-200 p-3">
            <input
              type="radio"
              name="targetKind"
              value="custom"
              checked={targetKind === "custom"}
              onChange={() => setTargetKind("custom")}
              className="mt-1"
            />
          <span>
            <span className="block text-sm font-semibold text-slate-900">
              Custom
            </span>
            <span className="block text-sm text-slate-600">
                Build your own ordered card checklist.
            </span>
            </span>
          </label>
        ) : null}
      </fieldset>
      <input
        type="hidden"
        name="checklistMode"
        value={
          targetKind === "set"
            ? "master_set"
            : targetKind === "custom"
              ? "custom"
              : "card_prints"
        }
      />
      {targetKind === "species" ? (
        <label className={labelClass}>
          Pokémon
          <select
            className={inputClass}
            name="speciesId"
            required
            defaultValue={speciesOptions.length === 1 ? speciesOptions[0].speciesId : ""}
          >
            <option value="" disabled>Select a Pokémon</option>
            {speciesOptions.map((species) => (
              <option key={species.speciesId} value={species.speciesId}>
                #{species.nationalDexNumber.toString().padStart(4, "0")} {species.displayName} · {species.totalPrintCount} card prints
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {targetKind === "set" ? (
        <label className={labelClass}>
          Set
          <select className={inputClass} name="setId" required defaultValue="">
            <option value="" disabled>Select a set</option>
            {setOptions.map((set) => (
              <option key={set.setId} value={set.setId}>
                {set.name}{set.code ? ` · ${set.code}` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {targetKind === "custom" ? (
        <CustomBinderSlotEditor
          inputName="customSlotsJson"
          mode="create"
        />
      ) : null}
      {targetKind === "species" && speciesOptions.length === 0 ? (
        <p role="status" className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
          No Pokémon matched that search. Try another name.
        </p>
      ) : null}
      <SubmitButton>Create Binder</SubmitButton>
    </form>
  );
}

export function AddCopyForm({
  publicId,
  copyReference,
  label,
}: {
  publicId: string;
  copyReference: string;
  label: string;
}) {
  const [state, action] = useFormState(binderFormAction, null);
  return (
    <form action={action} className="space-y-2">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="binderAction" value="contribution_add" />
      <input type="hidden" name="publicId" value={publicId} />
      <input type="hidden" name="copyReference" value={copyReference} />
      <SubmitButton>{label}</SubmitButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

export function SimpleBinderAction({
  publicId,
  actionName,
  label,
  tone = "secondary",
  fields,
}: {
  publicId: string;
  actionName: string;
  label: string;
  tone?: "primary" | "secondary" | "danger";
  fields?: Record<string, string>;
}) {
  const [state, action] = useFormState(binderFormAction, null);
  return (
    <form action={action} className="space-y-2">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="binderAction" value={actionName} />
      <input type="hidden" name="publicId" value={publicId} />
      {Object.entries(fields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton tone={tone}>{label}</SubmitButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

export function InvitePeopleForm({ publicId }: { publicId: string }) {
  const [state, action] = useFormState(binderFormAction, null);
  return (
    <form action={action} className="space-y-4">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="binderAction" value="invite" />
      <input type="hidden" name="publicId" value={publicId} />
      <label className={labelClass}>
        Maximum role
        <select className={inputClass} name="role" defaultValue="contributor">
          <option value="contributor">Contributor</option>
          <option value="viewer">Viewer</option>
        </select>
      </label>
      <p className="text-sm text-slate-600">
        The invitation can add a member. It is separate from a view-only link.
      </p>
      <SubmitButton>Create one-use invitation</SubmitButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

export function ViewLinkForm({ publicId }: { publicId: string }) {
  const [state, action] = useFormState(binderFormAction, null);
  return (
    <form action={action} className="space-y-4">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="binderAction" value="view_link_create" />
      <input type="hidden" name="publicId" value={publicId} />
      <label className={labelClass}>
        Link label <span className="font-normal text-slate-500">(optional)</span>
        <input className={inputClass} name="label" maxLength={80} placeholder="Family view link" />
      </label>
      <p className="text-sm text-slate-600">
        Anyone with this secret link can see the sanitized Binder, but cannot join or add cards.
      </p>
      <SubmitButton>Share view-only link</SubmitButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

export function BinderMetadataForm({
  publicId,
  title,
  description,
  coverCardPrintId,
  coverOptions,
}: {
  publicId: string;
  title: string;
  description: string | null;
  coverCardPrintId: string | null;
  coverOptions: Array<{ cardPrintId: string; label: string }>;
}) {
  const [state, action] = useFormState(binderFormAction, null);
  return (
    <form action={action} className="space-y-4">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="binderAction" value="update_metadata" />
      <input type="hidden" name="publicId" value={publicId} />
      <label className={labelClass}>
        Binder name
        <input className={inputClass} name="title" maxLength={80} required defaultValue={title} />
      </label>
      <label className={labelClass}>
        Description
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          name="description"
          maxLength={1000}
          defaultValue={description ?? ""}
        />
      </label>
      <label className={labelClass}>
        Binder cover
        <select
          className={inputClass}
          name="coverCardPrintId"
          defaultValue={coverCardPrintId ?? ""}
        >
          <option value="">No cover</option>
          {coverCardPrintId &&
          !coverOptions.some((option) => option.cardPrintId === coverCardPrintId) ? (
            <option value={coverCardPrintId}>Current cover</option>
          ) : null}
          {coverOptions.map((option) => (
            <option key={option.cardPrintId} value={option.cardPrintId}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton>Save details</SubmitButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

export function BinderPolicyForm({
  publicId,
  readAccess,
  discoverability,
  joinPolicy,
  contributionPolicy,
  sharedEnabled,
  viewLinksEnabled,
  publicEnabled,
  communityEnabled,
}: {
  publicId: string;
  readAccess: BinderReadAccess;
  discoverability: BinderDiscoverability;
  joinPolicy: BinderJoinPolicy;
  contributionPolicy: BinderContributionPolicy;
  sharedEnabled: boolean;
  viewLinksEnabled: boolean;
  publicEnabled: boolean;
  communityEnabled: boolean;
}) {
  const [state, action] = useFormState(binderFormAction, null);
  const [policy, setPolicy] = useState({
    readAccess,
    discoverability,
    joinPolicy,
    contributionPolicy,
  });
  const preset =
    policy.readAccess === "public" &&
    policy.discoverability === "listed" &&
    policy.joinPolicy === "request_to_join" &&
    policy.contributionPolicy === "approval_required"
      ? "community"
      : policy.readAccess === "private" &&
          policy.joinPolicy === "invite_only" &&
          policy.contributionPolicy === "members_direct"
        ? "family"
        : policy.readAccess === "link"
          ? "view_link"
          : policy.readAccess === "public" &&
              policy.discoverability === "unlisted" &&
              policy.joinPolicy !== "request_to_join"
            ? "public"
            : policy.readAccess === "private" &&
                policy.discoverability === "unlisted" &&
                policy.joinPolicy === "closed" &&
                policy.contributionPolicy === "owner_only"
              ? "personal"
              : "current";
  return (
    <form action={action} className="space-y-4">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="binderAction" value="update_policy" />
      <input type="hidden" name="publicId" value={publicId} />
      <label className={labelClass}>
        Sharing preset
        <select
          className={inputClass}
          value={preset}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "family") {
              setPolicy({
                readAccess: "private",
                discoverability: "unlisted",
                joinPolicy: "invite_only",
                contributionPolicy: "members_direct",
              });
            } else if (next === "view_link") {
              setPolicy({
                readAccess: "link",
                discoverability: "unlisted",
                joinPolicy:
                  policy.joinPolicy === "request_to_join"
                    ? "invite_only"
                    : policy.joinPolicy,
                contributionPolicy: policy.contributionPolicy,
              });
            } else if (next === "public") {
              setPolicy({
                readAccess: "public",
                discoverability: "unlisted",
                joinPolicy:
                  policy.joinPolicy === "request_to_join"
                    ? "closed"
                    : policy.joinPolicy,
                contributionPolicy: policy.contributionPolicy,
              });
            } else if (next === "community") {
              setPolicy({
                readAccess: "public",
                discoverability: "listed",
                joinPolicy: "request_to_join",
                contributionPolicy: "approval_required",
              });
            } else {
              setPolicy({
                readAccess: "private",
                discoverability: "unlisted",
                joinPolicy: "closed",
                contributionPolicy: "owner_only",
              });
            }
          }}
        >
          {preset === "current" ? (
            <option value="current" disabled>
              Current custom settings
            </option>
          ) : null}
          <option value="personal">Personal · members only</option>
          {sharedEnabled ? (
            <option value="family">Family/shared · invite and build together</option>
          ) : null}
          {viewLinksEnabled ? (
            <option value="view_link">View-only sharing · secret links</option>
          ) : null}
          {publicEnabled ? (
            <option value="public">Public · unlisted</option>
          ) : null}
          {communityEnabled ? (
            <option value="community">Community · listed and moderated</option>
          ) : null}
        </select>
      </label>
      <input type="hidden" name="readAccess" value={policy.readAccess} />
      <input type="hidden" name="discoverability" value={policy.discoverability} />
      <input type="hidden" name="joinPolicy" value={policy.joinPolicy} />
      <input
        type="hidden"
        name="contributionPolicy"
        value={policy.contributionPolicy}
      />
      <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
        <p>View: {policy.readAccess}</p>
        <p>Discovery: {policy.discoverability}</p>
        <p>Joining: {policy.joinPolicy.replaceAll("_", " ")}</p>
        <p>Contributions: {policy.contributionPolicy.replaceAll("_", " ")}</p>
      </div>
      <p className="text-xs text-slate-500">
        Viewing, discovery, joining, and contribution permissions are independent. Public does not mean collaborative.
      </p>
      <SubmitButton>Save sharing settings</SubmitButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

export function BinderPreferencesForm({
  publicId,
  viewLinksEnabled,
  publicEnabled,
  notificationsEnabled,
  alias,
  contentScope: initialContentScope,
  identityScope,
  notificationPreference,
}: {
  publicId: string;
  viewLinksEnabled: boolean;
  publicEnabled: boolean;
  notificationsEnabled: boolean;
  alias: string | null;
  contentScope: BinderConsent;
  identityScope: BinderConsent;
  notificationPreference: BinderNotificationPreference;
}) {
  const [state, action] = useFormState(binderFormAction, null);
  const [contentScope, setContentScope] = useState<BinderConsent>(initialContentScope);
  const [identityScopeValue, setIdentityScopeValue] =
    useState<BinderConsent>(identityScope);
  const consentRank: Record<BinderConsent, number> = {
    none: 0,
    link: 1,
    public: 2,
  };
  return (
    <form action={action} className="space-y-4">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="binderAction" value="preferences" />
      <input type="hidden" name="publicId" value={publicId} />
      <label className={labelClass}>
        Binder alias <span className="font-normal text-slate-500">(optional)</span>
        <input
          className={inputClass}
          name="alias"
          maxLength={40}
          placeholder="Dad"
          defaultValue={alias ?? ""}
        />
      </label>
      <label className={labelClass}>
        Show contributions outside this Binder&apos;s member-only view
        <select
          className={inputClass}
          name="contentScope"
          value={contentScope}
          onChange={(event) => {
            const next = event.target.value as BinderConsent;
            setContentScope(next);
            if (consentRank[identityScopeValue] > consentRank[next]) {
              setIdentityScopeValue(next);
            }
          }}
        >
          <option value="none">Nowhere</option>
          {viewLinksEnabled ? <option value="link">View links only</option> : null}
          {publicEnabled ? <option value="public">View links and public pages</option> : null}
        </select>
      </label>
      <label className={labelClass}>
        Show my identity with those contributions
        <select
          className={inputClass}
          name="identityScope"
          value={identityScopeValue}
          onChange={(event) =>
            setIdentityScopeValue(event.target.value as BinderConsent)
          }
        >
          <option value="none">Do not show my identity</option>
          {viewLinksEnabled && (contentScope === "link" || contentScope === "public") ? (
            <option value="link">View links only</option>
          ) : null}
          {publicEnabled && contentScope === "public" ? (
            <option value="public">View links and public pages</option>
          ) : null}
        </select>
      </label>
      {notificationsEnabled ? (
        <label className={labelClass}>
          Binder notifications
          <select
            className={inputClass}
            name="notificationPreference"
            defaultValue={notificationPreference}
          >
            <option value="muted">None</option>
            <option value="digest">Digest of important changes</option>
            <option value="immediate">All Binder activity</option>
          </select>
        </label>
      ) : (
        <input
          type="hidden"
          name="notificationPreference"
          value={notificationPreference}
        />
      )}
      <p className="text-xs text-slate-500">
        Contribution content and identity attribution are separate choices. Both start off.
      </p>
      <SubmitButton>Save my preferences</SubmitButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

export function BinderConsentWithdrawalForm({
  publicId,
  alias,
  contentScope,
  identityScope,
  notificationPreference,
}: {
  publicId: string;
  alias: string | null;
  contentScope: BinderConsent;
  identityScope: BinderConsent;
  notificationPreference: BinderNotificationPreference;
}) {
  const [state, action] = useFormState(binderFormAction, null);
  if (contentScope === "none" && identityScope === "none") {
    return (
      <p className="text-sm text-slate-600">
        Your contributions and identity are not shared outside this
        Binder&apos;s member-only view.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="binderAction" value="preferences" />
      <input type="hidden" name="publicId" value={publicId} />
      <input type="hidden" name="alias" value={alias ?? ""} />
      <input type="hidden" name="contentScope" value="none" />
      <input type="hidden" name="identityScope" value="none" />
      <input
        type="hidden"
        name="notificationPreference"
        value={notificationPreference}
      />
      <p className="text-sm text-slate-600">
        This Binder is read-only, but you can still withdraw external sharing
        consent. This removes your contributed content and identity from
        view-only links and public Binder pages without changing your Vault.
      </p>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="confirmation"
          value="withdraw"
          required
          className="mt-1"
        />
        <span>Remove my contribution and identity sharing outside members.</span>
      </label>
      <SubmitButton tone="danger">Withdraw external sharing consent</SubmitButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

export function MemberManagementForm({
  publicId,
  memberId,
  currentRole,
  suspended,
  canAssignManager,
}: {
  publicId: string;
  memberId: string;
  currentRole: string;
  suspended: boolean;
  canAssignManager: boolean;
}) {
  const [state, action] = useFormState(binderFormAction, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="publicId" value={publicId} />
      <input type="hidden" name="memberId" value={memberId} />
      <label className="text-xs font-medium text-slate-600">
        Role
        <select className={`${inputClass} min-w-36`} name="role" defaultValue={currentRole}>
          {canAssignManager || currentRole === "manager" ? (
            <option value="manager">Manager</option>
          ) : null}
          <option value="contributor">Contributor</option>
          <option value="viewer">Viewer</option>
        </select>
      </label>
      <MemberActionButton
        actionName="member_role"
        className="min-h-11 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
      >
        Change role
      </MemberActionButton>
      <MemberActionButton
        actionName={suspended ? "member_reinstate" : "member_suspend"}
        className="min-h-11 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"
      >
        {suspended ? "Reinstate" : "Suspend"}
      </MemberActionButton>
      <MemberActionButton
        actionName="member_remove"
        className="min-h-11 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
      >
        Remove
      </MemberActionButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

function MemberActionButton({
  actionName,
  className,
  children,
}: {
  actionName: string;
  className: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  const online = useBinderOnline();
  return (
    <button
      type="submit"
      name="binderAction"
      value={actionName}
      disabled={pending || !online}
      aria-disabled={pending || !online}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
    >
      {pending ? "Working…" : !online ? "Offline" : children}
    </button>
  );
}

export function OwnershipTransferForm({
  publicId,
  members,
}: {
  publicId: string;
  members: Array<{ id: string; label: string; role: string }>;
}) {
  const [state, action] = useFormState(binderFormAction, null);
  return (
    <form action={action} className="space-y-4">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="binderAction" value="owner_transfer_offer" />
      <input type="hidden" name="publicId" value={publicId} />
      <label className={labelClass}>
        Offer ownership to
        <select className={inputClass} name="memberId" required defaultValue="">
          <option value="" disabled>Select an active member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.label} · {member.role}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Your role after acceptance
        <select className={inputClass} name="formerOwnerRole" defaultValue="manager">
          <option value="manager">Manager</option>
          <option value="contributor">Contributor</option>
          <option value="viewer">Viewer</option>
          <option value="leave">Leave Binder</option>
        </select>
      </label>
      <p className="text-xs text-slate-500">
        You remain Owner until the selected member explicitly accepts. Choosing
        Viewer or Leave closes contributions that your resulting role cannot
        keep active. No Vault card is changed, and the Binder never has an
        Owner gap.
      </p>
      <SubmitButton>Offer ownership transfer</SubmitButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

export function DeleteBinderForm({
  publicId,
  title,
}: {
  publicId: string;
  title: string;
}) {
  const [state, action] = useFormState(binderFormAction, null);
  return (
    <form action={action} className="space-y-4">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="binderAction" value="delete" />
      <input type="hidden" name="publicId" value={publicId} />
      <label className={labelClass}>
        Type DELETE followed by the Binder name
        <input className={inputClass} name="confirmation" required autoComplete="off" />
      </label>
      <p className="text-xs text-slate-500">
        Expected: <span className="font-semibold">DELETE {title}</span>. Deleting the Binder never deletes members&apos; Vault cards.
      </p>
      <SubmitButton tone="danger">Delete Binder</SubmitButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

export function BinderTrustSafetyControls({
  publicId,
  allowReport = true,
  allowBlock,
}: {
  publicId: string;
  allowReport?: boolean;
  allowBlock: boolean;
}) {
  const [open, setOpen] = useState(false);
  const reportPanelId = useId();
  const [reportState, reportAction] = useFormState(reportBinderSurfaceAction, null);
  const [blockState, blockAction] = useFormState(blockBinderOwnerAction, null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {allowReport ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={reportPanelId}
            className="min-h-11 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Report Binder
          </button>
        ) : null}
        {allowBlock ? (
          <form action={blockAction} className="space-y-2 rounded-2xl border border-red-200 bg-red-50 p-3">
            <BinderIdempotencyField state={blockState} />
            <input type="hidden" name="publicId" value={publicId} />
            <label className="flex items-start gap-2 text-xs text-red-900">
              <input type="checkbox" name="confirmation" value="block" required className="mt-0.5" />
              <span>
                I understand blocking can end my Binder access and remove active contributions, but never changes my Vault cards.
              </span>
            </label>
            <SubmitButton tone="danger">Block owner</SubmitButton>
          </form>
        ) : null}
      </div>
      <BinderActionMessage state={blockState} />
      {allowReport && open ? (
        <form
          id={reportPanelId}
          action={reportAction}
          className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <BinderIdempotencyField state={reportState} />
          <input type="hidden" name="surface" value="binder" />
          <input type="hidden" name="surfaceId" value={publicId} />
          <label className={labelClass}>
            Reason
            <select className={inputClass} name="reason" defaultValue="spam">
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="inappropriate">Inappropriate or unsafe content</option>
              <option value="scam">Scam or impersonation</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className={labelClass}>
            Details <span className="font-normal text-slate-500">(optional)</span>
            <textarea className={`${inputClass} min-h-24`} name="details" maxLength={1000} />
          </label>
          <SubmitButton>Submit report</SubmitButton>
          <BinderActionMessage state={reportState} />
        </form>
      ) : null}
    </div>
  );
}

export function BinderMemberSafetyControls({
  publicId,
  memberId,
  memberLabel,
}: {
  publicId: string;
  memberId: string;
  memberLabel: string;
}) {
  const [openReport, setOpenReport] = useState(false);
  const reportPanelId = useId();
  const [reportState, reportAction] = useFormState(reportBinderSurfaceAction, null);
  const [blockState, blockAction] = useFormState(blockBinderMemberAction, null);
  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpenReport((value) => !value)}
          aria-expanded={openReport}
          aria-controls={reportPanelId}
          className="min-h-11 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Report member
        </button>
      </div>
      {openReport ? (
        <form
          id={reportPanelId}
          action={reportAction}
          className="space-y-3 rounded-2xl bg-slate-50 p-3"
        >
          <BinderIdempotencyField state={reportState} />
          <input type="hidden" name="surface" value="binder_member" />
          <input type="hidden" name="surfaceId" value={memberId} />
          <label className={labelClass}>
            Reason
            <select className={inputClass} name="reason" defaultValue="harassment">
              <option value="harassment">Harassment</option>
              <option value="spam">Spam</option>
              <option value="inappropriate">Inappropriate or unsafe content</option>
              <option value="scam">Scam or impersonation</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className={labelClass}>
            Details <span className="font-normal text-slate-500">(optional)</span>
            <textarea className={`${inputClass} min-h-20`} name="details" maxLength={1000} />
          </label>
          <SubmitButton>Submit report</SubmitButton>
          <BinderActionMessage state={reportState} />
        </form>
      ) : null}
      <form action={blockAction} className="space-y-2 rounded-2xl border border-red-200 bg-red-50 p-3">
        <BinderIdempotencyField state={blockState} />
        <input type="hidden" name="publicId" value={publicId} />
        <input type="hidden" name="memberId" value={memberId} />
        <label className="flex items-start gap-2 text-xs text-red-900">
          <input type="checkbox" name="confirmation" value="block" required className="mt-0.5" />
          <span>
            Confirm block for {memberLabel}. Binder access or contribution visibility may change, but no Vault card will be edited.
          </span>
        </label>
        <SubmitButton tone="danger">Block member</SubmitButton>
        <BinderActionMessage state={blockState} />
      </form>
    </div>
  );
}

export function BinderContributionReportForm({
  contributionPublicId,
}: {
  contributionPublicId: string;
}) {
  const [open, setOpen] = useState(false);
  const reportPanelId = useId();
  const [state, action] = useFormState(reportBinderSurfaceAction, null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={reportPanelId}
        className="min-h-11 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
      >
        Report contribution
      </button>
      {open ? (
        <form
          id={reportPanelId}
          action={action}
          className="space-y-3 rounded-2xl bg-slate-50 p-3"
        >
          <BinderIdempotencyField state={state} />
          <input type="hidden" name="surface" value="binder_contribution" />
          <input
            type="hidden"
            name="surfaceId"
            value={contributionPublicId}
          />
          <label className={labelClass}>
            Reason
            <select className={inputClass} name="reason" defaultValue="spam">
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="scam">Scam or impersonation</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className={labelClass}>
            Details <span className="font-normal">(optional)</span>
            <textarea
              className={`${inputClass} min-h-20`}
              name="details"
              maxLength={1000}
            />
          </label>
          <SubmitButton>Submit report</SubmitButton>
          <BinderActionMessage state={state} />
        </form>
      ) : null}
    </div>
  );
}

function BinderPublicActionReportForm({
  publicId,
  surface,
  actionRef,
}: {
  publicId: string;
  surface: "contribution" | "member";
  actionRef: string;
}) {
  const [open, setOpen] = useState(false);
  const reportPanelId = useId();
  const [state, action] = useFormState(reportBinderPublicActionAction, null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={reportPanelId}
        className="min-h-11 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
      >
        Report {surface}
      </button>
      {open ? (
        <form
          id={reportPanelId}
          action={action}
          className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
        >
          <BinderIdempotencyField state={state} />
          <input type="hidden" name="publicId" value={publicId} />
          <input type="hidden" name="surface" value={surface} />
          <input type="hidden" name="actionRef" value={actionRef} />
          <label className={labelClass}>
            Reason
            <select className={inputClass} name="reason" defaultValue="spam">
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="scam">Scam or impersonation</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className={labelClass}>
            Details{" "}
            <span className="font-normal text-slate-500">(optional)</span>
            <textarea
              className={`${inputClass} min-h-20`}
              name="details"
              maxLength={1000}
            />
          </label>
          <SubmitButton>Submit report</SubmitButton>
          <BinderActionMessage state={state} />
        </form>
      ) : null}
    </div>
  );
}

export function BinderPublicContributionSafetyControls({
  publicId,
  safetyAction,
}: {
  publicId: string;
  safetyAction: BinderPublicContributionAction;
}) {
  const router = useRouter();
  const [blockState, blockAction] = useFormState(
    blockBinderPublicMemberAction,
    null,
  );
  useEffect(() => {
    if (blockState?.ok) {
      router.refresh();
    }
  }, [blockState?.ok, router]);

  const memberLabel =
    safetyAction.identityVisible && safetyAction.alias
      ? safetyAction.alias
      : "A Binder member";
  const canReportContribution =
    safetyAction.canReport && Boolean(safetyAction.contributionActionRef);
  const canReportMember =
    safetyAction.canReport && Boolean(safetyAction.memberActionRef);
  const canBlock =
    safetyAction.canBlock && Boolean(safetyAction.memberActionRef);
  if (!canReportContribution && !canReportMember && !canBlock) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
      <p className="text-xs font-medium text-slate-600">
        Contribution from {memberLabel}
      </p>
      <div className="flex flex-wrap items-start gap-2">
        {canReportContribution && safetyAction.contributionActionRef ? (
          <BinderPublicActionReportForm
            publicId={publicId}
            surface="contribution"
            actionRef={safetyAction.contributionActionRef}
          />
        ) : null}
        {canReportMember && safetyAction.memberActionRef ? (
          <BinderPublicActionReportForm
            publicId={publicId}
            surface="member"
            actionRef={safetyAction.memberActionRef}
          />
        ) : null}
        {canBlock && safetyAction.memberActionRef ? (
          <form
            action={blockAction}
            className="space-y-2 rounded-2xl border border-red-200 bg-red-50 p-3"
          >
            <BinderIdempotencyField state={blockState} />
            <input type="hidden" name="publicId" value={publicId} />
            <input
              type="hidden"
              name="memberActionRef"
              value={safetyAction.memberActionRef}
            />
            <label className="flex items-start gap-2 text-xs text-red-900">
              <input
                type="checkbox"
                name="confirmation"
                value="block"
                required
                className="mt-0.5"
              />
              <span>
                Block {memberLabel}. Grookai will refresh this Binder; no Vault
                card will be changed.
              </span>
            </label>
            <SubmitButton tone="danger">Block member</SubmitButton>
            <BinderActionMessage state={blockState} />
          </form>
        ) : null}
      </div>
    </div>
  );
}

export function BinderInvitationReportForm({
  invitationPublicId,
}: {
  invitationPublicId: string;
}) {
  const [open, setOpen] = useState(false);
  const reportPanelId = useId();
  const [state, action] = useFormState(reportBinderSurfaceAction, null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={reportPanelId}
        className="min-h-11 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
      >
        Report invitation
      </button>
      {open ? (
        <form
          id={reportPanelId}
          action={action}
          className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
        >
          <BinderIdempotencyField state={state} />
          <input type="hidden" name="surface" value="binder_invitation" />
          <input
            type="hidden"
            name="surfaceId"
            value={invitationPublicId}
          />
          <label className={labelClass}>
            Reason
            <select className={inputClass} name="reason" defaultValue="spam">
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="scam">Scam or impersonation</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className={labelClass}>
            Details{" "}
            <span className="font-normal text-slate-500">(optional)</span>
            <textarea
              className={`${inputClass} min-h-20`}
              name="details"
              maxLength={1000}
            />
          </label>
          <SubmitButton>Submit report</SubmitButton>
          <BinderActionMessage state={state} />
        </form>
      ) : null}
    </div>
  );
}

export function BulkAddCopiesForm({
  publicId,
  copyReferences,
}: {
  publicId: string;
  copyReferences: string[];
}) {
  const [state, action] = useFormState(binderFormAction, null);
  if (copyReferences.length === 0) {
    return null;
  }
  return (
    <form action={action} className="space-y-3">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="binderAction" value="bulk_add" />
      <input type="hidden" name="publicId" value={publicId} />
      <input
        type="hidden"
        name="copyReferences"
        value={copyReferences.slice(0, 100).join(",")}
      />
      <p className="text-sm text-slate-700">
        Add {copyReferences.length} eligible{" "}
        {copyReferences.length === 1 ? "copy" : "copies"} from this preview.
        Each card remains in your Vault.
      </p>
      <SubmitButton>Add previewed copies</SubmitButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

export function CustomRevisionForm({
  publicId,
  initialSlots,
}: {
  publicId: string;
  initialSlots: BinderChecklistSlot[];
}) {
  const [state, action] = useFormState(binderFormAction, null);
  return (
    <form action={action} className="space-y-4">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="binderAction" value="custom_revision_publish" />
      <input type="hidden" name="publicId" value={publicId} />
      <CustomBinderSlotEditor
        inputName="slotsJson"
        mode="revision"
        initialSlots={initialSlots}
      />
      <SubmitButton>Publish checklist revision</SubmitButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

export function TemplateSubmitForm({
  publicId,
  defaultName,
  defaultDescription,
}: {
  publicId: string;
  defaultName: string;
  defaultDescription: string | null;
}) {
  const [state, action] = useFormState(binderFormAction, null);
  return (
    <form action={action} className="space-y-4">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="binderAction" value="template_submit" />
      <input type="hidden" name="publicId" value={publicId} />
      <label className={labelClass}>
        Template name
        <input
          className={inputClass}
          name="name"
          maxLength={80}
          required
          defaultValue={defaultName}
        />
      </label>
      <label className={labelClass}>
        Template description
        <textarea
          className={`${inputClass} min-h-24`}
          name="description"
          maxLength={1000}
          defaultValue={defaultDescription ?? ""}
        />
      </label>
      <p className="text-xs text-slate-500">
        Submission creates a moderated Template candidate. It does not publish
        this Binder or expose member identities.
      </p>
      <SubmitButton>Submit Template for review</SubmitButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

export function PulseMilestoneShareForm({
  publicId,
  title,
  completed,
  total,
  unit,
}: {
  publicId: string;
  title: string;
  completed: number;
  total: number;
  unit: BinderProgressUnit;
}) {
  const [state, action] = useFormState(binderFormAction, null);
  const percent = total > 0 ? Math.floor((completed / total) * 100) : 0;
  const thresholds = [25, 50, 75, 90, 100].filter(
    (threshold) => threshold <= percent,
  );
  const unitLabel = unit.replaceAll("_", " ");
  if (thresholds.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        The public Binder has not crossed its first 25% milestone yet.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <BinderIdempotencyField state={state} />
      <input type="hidden" name="binderAction" value="pulse_share" />
      <input type="hidden" name="publicId" value={publicId} />
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
        <p className="font-semibold">Public Pulse preview</p>
        <p>{title}</p>
        <p>
          {completed} of {total} {unitLabel} complete ({percent}%)
        </p>
        <p className="mt-2 text-xs">
          No exact-copy references, member identities, or private Binder data
          are included.
        </p>
      </div>
      <label className={labelClass}>
        Milestone
        <select
          className={inputClass}
          name="threshold"
          defaultValue={String(thresholds[thresholds.length - 1])}
        >
          {thresholds.map((threshold) => (
            <option key={threshold} value={threshold}>
              {threshold}% complete
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="confirmation"
          value="share"
          required
          className="mt-1"
        />
        Share this preview to public Pulse. Nothing is posted automatically.
      </label>
      <SubmitButton>Share milestone to Pulse</SubmitButton>
      <BinderActionMessage state={state} />
    </form>
  );
}

export function ChecklistFilter({
  publicId,
  currentFilter,
}: {
  publicId: string;
  currentFilter: string;
}) {
  const filters = useMemo(
    () => [
      ["all", "All"],
      ["in_binder", "In Binder"],
      ["missing", "Missing"],
      ["in_your_vault", "In your Vault"],
      ["contributed_by_you", "Contributed by you"],
      ["needs_review", "Needs finish review"],
    ],
    [],
  );
  return (
    <div
      role="toolbar"
      aria-label="Filter Binder checklist"
      className="flex flex-wrap gap-2"
    >
      {filters.map(([value, label]) => (
          <Link
            key={value}
            href={`/binders/${encodeURIComponent(publicId)}?tab=checklist&filter=${encodeURIComponent(value)}`}
            aria-current={currentFilter === value ? "page" : undefined}
            className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${
              currentFilter === value
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {label}
          </Link>
      ))}
    </div>
  );
}
