"use client";

import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { VaultCardData } from "./VaultCardTile";
import { parseCollectorMoney } from "@/lib/vault/collectorMoney";
import {
  recordCollectorOutcome,
  saveCollectorBulkIntent,
} from "@/lib/vault/collectorWorkspaceActions";

type Incoming = {
  key: string;
  cardPrintId: string;
  gvId: string;
  name: string;
  context: string;
  printingId: string;
  finish: string;
  agreed: string;
};
type Option = {
  cardPrintId: string;
  gvId: string;
  name: string;
  context: string;
  finishes: { id: string; label: string }[];
};
const input =
  "mt-1 min-h-11 w-full rounded-lg border border-[var(--gv-border-soft)] bg-transparent px-3";
const money = (cents: number | null) =>
  cents === null
    ? "Unknown"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
      .format(cents / 100);
function sumAmounts(values: string[]) {
  let total = 0;
  try {
    for (const value of values) {
      const amount = parseCollectorMoney(value);
      if (amount === null) return null;
      total += amount;
    }
    return total;
  } catch {
    return null;
  }
}

export default function CollectorWorkspace(
  { items, ownerId, initialInstanceId, initialCardPrintId }: {
    items: VaultCardData[];
    ownerId: string;
    initialInstanceId?: string;
    initialCardPrintId?: string;
  },
) {
  const router = useRouter();
  const [mode, setMode] = useState<"select" | "trade">("select");
  const rows = items.flatMap((card) =>
    card.copy_items.map((copy) => ({ ...copy, card }))
  );
  const [selected, setSelected] = useState<string[]>(() =>
    rows.some((row) => row.instance_id === initialInstanceId)
      ? [initialInstanceId!]
      : []
  );
  const [agreed, setAgreed] = useState<Record<string, string>>({});
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [query, setQuery] = useState(() =>
    items.find((card) => card.card_id === initialCardPrintId)?.name ?? ""
  );
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [searchStatus, setSearchStatus] = useState("");
  const [cashDirection, setCashDirection] = useState("none");
  const [cash, setCash] = useState("");
  const [intent, setIntent] = useState("hold");
  const [outcomeType, setOutcomeType] = useState<"sale" | "trade">("sale");
  const [amount, setAmount] = useState("");
  const [buyer, setBuyer] = useState("");
  const [received, setReceived] = useState("");
  const [outcomeCashDirection, setOutcomeCashDirection] = useState("none");
  const [outcomeCash, setOutcomeCash] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const bulkDialog = useRef<HTMLDialogElement>(null);
  const outcomeDialog = useRef<HTMLDialogElement>(null);
  const key = `collector_trade_v1:${ownerId}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const draft = JSON.parse(raw);
        if (!initialInstanceId) {
          setSelected(
            (draft.selected ?? []).filter((id: string) =>
              items.some((card) =>
                card.copy_items.some((copy) => copy.instance_id === id)
              )
            ),
          );
        }
        setAgreed(draft.agreed ?? {});
        setIncoming(
          Array.isArray(draft.incoming) ? draft.incoming.slice(0, 250) : [],
        );
        setCashDirection(
          ["none", "paid", "received"].includes(draft.cashDirection)
            ? draft.cashDirection
            : "none",
        );
        setCash(draft.cash ?? "");
        setMessage(
          "Private draft restored.",
        );
      }
    } catch {
      setMessage("The local draft could not be restored.");
    }
    // Restore once per signed-in owner; refreshed rows must not overwrite edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    const controller = new AbortController();
    if (search.trim().length < 2) {
      setOptions([]);
      setSearchStatus("");
      return;
    }
    setSearchStatus("Searching cards…");
    const timer = setTimeout(() => {
      void fetch(`/vault/card-options?q=${encodeURIComponent(search)}`, {
        signal: controller.signal,
      }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error();
        setOptions(data.items ?? []);
        setSearchStatus(
          data.items?.length
            ? ""
            : "No matching cards. Try a name, set or collector number.",
        );
      }).catch(() => {
        if (!controller.signal.aborted) {
          setSearchStatus("Search unavailable. Try again.");
        }
      });
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search]);
  const chosen = rows.filter((row) => selected.includes(row.instance_id));
  const priced = chosen.filter((row) =>
    !row.is_graded && row.card_printing_id &&
    typeof row.market_price === "number"
  );
  const market = priced.reduce((sum, row) => sum + row.market_price!, 0);
  const outgoing = sumAmounts(
    chosen.map((row) => agreed[row.instance_id] ?? ""),
  );
  const receiving = sumAmounts(incoming.map((row) => row.agreed));
  let cashCents: number | null = 0;
  try {
    cashCents = cashDirection === "none" ? 0 : parseCollectorMoney(cash);
  } catch {
    cashCents = null;
  }
  const net = outgoing === null || receiving === null || cashCents === null
    ? null
    : receiving - outgoing +
      (cashDirection === "received"
        ? cashCents
        : cashDirection === "paid"
        ? -cashCents
        : 0);
  const filtered = rows.filter((row) =>
    `${row.card.name} ${row.card.set_name} ${row.gv_vi_id} ${row.finish_label}`
      .toLowerCase().includes(query.toLowerCase())
  );
  const dialogClass =
    "m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-[var(--gv-border-soft)] bg-[var(--gv-surface-base)] p-5 text-[var(--gv-text-primary)] backdrop:bg-black/60";
  async function applyIntent() {
    setBusy(true);
    try {
      const result = await saveCollectorBulkIntent(selected, intent);
      setMessage(result.message);
      if (result.ok) {
        bulkDialog.current?.close();
        router.refresh();
      }
    } catch {
      setMessage("The change could not be confirmed. Reload before retrying.");
    } finally {
      setBusy(false);
    }
  }
  async function recordOutcome() {
    if (chosen.length !== 1) return;
    setBusy(true);
    try {
      const result = await recordCollectorOutcome({
        instanceId: chosen[0].instance_id,
        type: outcomeType,
        amount,
        counterparty: buyer,
        received,
        cashDirection: outcomeCashDirection,
        cashAmount: outcomeCash,
      });
      setMessage(result.message);
      if (result.ok) {
        outcomeDialog.current?.close();
        setSelected([]);
        router.refresh();
      }
    } catch {
      setMessage(
        "Outcome could not be confirmed. Reload the exact copy before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="gv-collector-workspace space-y-5">
      <div
        className="gv-workspace-mode"
        role="group"
        aria-label="Workspace view"
      >
        <button
          type="button"
          aria-pressed={mode === "select"}
          onClick={() => setMode("select")}
        >
          Select copies
        </button>
        <button
          type="button"
          aria-pressed={mode === "trade"}
          onClick={() => setMode("trade")}
        >
          Trade workspace
        </button>
      </div>
      <div
        className="gv-selection-toolbar space-y-2"
        aria-live="polite"
      >
        <p className="sr-only">
          {chosen.length} selected · {priced.length} priced ·{" "}
          {chosen.length - priced.length} without a qualified raw reference
        </p>
        <div className="gv-workspace-summary">
          <div>
            <p className="text-2xl font-semibold">
              {chosen.length}
              <span className="ml-2 text-sm font-normal text-[var(--gv-text-secondary)]">
                selected
              </span>
            </p>
            <p className="mt-1 text-xs text-[var(--gv-text-secondary)]">
              {priced.length} priced · {chosen.length - priced.length}{" "}
              without a price
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold text-[var(--gv-market)]">
              {priced.length ? money(Math.round(market * 100)) : "—"}
            </p>
            <p className="mt-1 text-xs text-[var(--gv-text-secondary)]">
              Qualified raw market
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="gv-secondary-button"
            type="button"
            disabled={!chosen.length || busy}
            onClick={() => setSelected([])}
          >
            Clear
          </button>
          <button
            className="gv-primary-button"
            type="button"
            hidden={mode !== "select"}
            disabled={!chosen.length || chosen.length > 250 || busy}
            onClick={() => bulkDialog.current?.showModal()}
          >
            Review bulk intent
          </button>
          <button
            className="gv-secondary-button"
            type="button"
            disabled={chosen.length !== 1 || busy}
            onClick={() => {
              setAmount("");
              setBuyer("");
              setReceived("");
              outcomeDialog.current?.showModal();
            }}
          >
            Sold / Traded
          </button>
          <button
            className="gv-primary-button"
            type="button"
            hidden={mode !== "trade"}
            onClick={() => {
              try {
                localStorage.setItem(
                  key,
                  JSON.stringify({
                    selected,
                    agreed,
                    incoming,
                    cashDirection,
                    cash,
                  }),
                );
                setMessage("Private draft saved on this device.");
              } catch {
                setMessage("Draft could not be saved on this device.");
              }
            }}
          >
            Save trade draft
          </button>
        </div>
        {message ? <p role="status" className="text-sm">{message}</p> : null}
      </div>
      <div
        className={mode === "trade"
          ? "grid gap-6 lg:grid-cols-2"
          : "gv-selection-list"}
      >
        <section
          className="min-w-0 space-y-3"
          aria-label="Outgoing exact copies"
        >
          <h2 className="text-lg font-bold">
            {mode === "trade" ? "You give" : "Your copies"}
          </h2>
          {mode === "trade"
            ? (
              <button
                type="button"
                className="min-h-11 text-sm text-[var(--gv-primary)]"
                onClick={() => setMode("select")}
              >
                ＋ Choose more copies
              </button>
            )
            : null}
          <div hidden={mode === "trade"}>
            <label className="block text-sm">
              Find a copy<input
                className={input}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Card, set, finish or GVVI"
              />
            </label>
          </div>
          <div className="max-h-[60dvh] overflow-auto divide-y divide-[var(--gv-border-soft)]">
            {(mode === "trade" ? chosen : filtered).map((row) => (
              <div
                key={row.instance_id}
                className="gv-copy-selection-row"
                data-selected={selected.includes(row.instance_id) || undefined}
              >
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.includes(row.instance_id)}
                    disabled={busy}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, row.instance_id]
                          : current.filter((id) => id !== row.instance_id)
                      )}
                  />
                  <PublicCardImage
                    src={row.card.image_url ??
                      row.card.canonical_display_image_url ?? undefined}
                    alt=""
                    imageClassName="gv-workspace-card-thumb"
                    fallbackClassName="gv-workspace-card-thumb gv-collector-thumb-empty"
                    fallbackLabel=""
                    sizes="56px"
                    unoptimized
                  />
                  <span className="min-w-0">
                    <span className="font-semibold">{row.card.name}</span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--gv-text-secondary)]">
                      {row.card.set_name} · #{row.card.number} ·{" "}
                      {row.finish_label ?? "Printing unassigned"} ·{" "}
                      {row.is_graded
                        ? `${row.grader} ${row.grade}`
                        : row.condition_label ?? "Not assessed"}
                    </span>
                  </span>
                </label>
                <details className="gv-copy-identity-disclosure">
                  <summary>Copy details</summary>
                  <Link
                    className="inline-flex min-h-11 items-center text-xs underline"
                    href={`/vault/gvvi/${
                      encodeURIComponent(row.gv_vi_id ?? "")
                    }`}
                  >
                    {row.gv_vi_id}
                  </Link>
                </details>
                {mode === "trade" && selected.includes(row.instance_id)
                  ? (
                    <label className="block text-sm">
                      Agreed value · USD<input
                        inputMode="decimal"
                        className={input}
                        value={agreed[row.instance_id] ?? ""}
                        onChange={(event) =>
                          setAgreed((current) => ({
                            ...current,
                            [row.instance_id]: event.target.value,
                          }))}
                        placeholder="Unknown"
                      />
                    </label>
                  )
                  : null}
              </div>
            ))}
            {!filtered.length
              ? (
                <p className="py-5 text-sm">
                  No active copies match this search.
                </p>
              )
              : null}
          </div>
        </section>
        <section
          hidden={mode !== "trade"}
          className="min-w-0 space-y-3"
          aria-label="Incoming trade cards"
        >
          <h2 className="text-lg font-bold">You receive</h2>
          <label className="block text-sm">
            Find an incoming card<input
              className={input}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pikachu Base Set 58"
            />
          </label>
          <p role="status" className="text-sm">{searchStatus}</p>
          {options.map((option) => (
            <details
              key={option.cardPrintId}
              className="border-b border-[var(--gv-border-soft)] py-2"
            >
              <summary className="min-h-11 cursor-pointer text-sm">
                {option.name} · {option.context}
              </summary>
              <div className="flex flex-wrap gap-2 py-2">
                {option.finishes.map((finish) => (
                  <button
                    type="button"
                    className="gv-secondary-button"
                    key={finish.id}
                    onClick={() => {
                      setIncoming((current) => [...current, {
                        key: crypto.randomUUID(),
                        cardPrintId: option.cardPrintId,
                        gvId: option.gvId,
                        name: option.name,
                        context: option.context,
                        printingId: finish.id,
                        finish: finish.label,
                        agreed: "",
                      }]);
                      setSearch("");
                      setOptions([]);
                    }}
                  >
                    Add {finish.label}
                  </button>
                ))}
                {!option.finishes.length
                  ? <p className="text-sm">No governed printing available.</p>
                  : null}
              </div>
            </details>
          ))}
          {incoming.map((row) => (
            <div
              key={row.key}
              className="space-y-2 border-b border-[var(--gv-border-soft)] py-3"
            >
              <p className="font-semibold">{row.name}</p>
              <p className="text-xs">{row.context} · {row.finish}</p>
              <label className="block text-sm">
                Agreed value · USD<input
                  className={input}
                  inputMode="decimal"
                  value={row.agreed}
                  onChange={(event) =>
                    setIncoming((current) =>
                      current.map((item) =>
                        item.key === row.key
                          ? { ...item, agreed: event.target.value }
                          : item
                      )
                    )}
                />
              </label>
              <button
                type="button"
                className="min-h-11 text-sm underline"
                onClick={() =>
                  setIncoming((current) =>
                    current.filter((item) => item.key !== row.key)
                  )}
              >
                Remove incoming card
              </button>
            </div>
          ))}
          <label className="block text-sm">
            Cash<select
              className={input}
              value={cashDirection}
              onChange={(event) => setCashDirection(event.target.value)}
            >
              <option value="none">No cash</option>
              <option value="received">Cash you receive</option>
              <option value="paid">Cash you pay</option>
            </select>
          </label>
          {cashDirection !== "none"
            ? (
              <label className="block text-sm">
                Cash amount · USD<input
                  className={input}
                  inputMode="decimal"
                  value={cash}
                  onChange={(event) => setCash(event.target.value)}
                />
              </label>
            )
            : null}
          <dl className="grid grid-cols-2 gap-3 border-y border-[var(--gv-border-soft)] py-4 text-sm">
            <dt>Agreed outgoing</dt>
            <dd>{money(outgoing)}</dd>
            <dt>Agreed incoming</dt>
            <dd>{money(receiving)}</dd>
            <dt>Net received minus given</dt>
            <dd>{net === null ? "Enter all agreed values" : money(net)}</dd>
          </dl>
          <p className="text-xs leading-5">
            Agreed values are negotiation notes. Market references stay
            separate. Save the draft, then record each actual outcome using Sold
            / Traded. Add incoming copies through the reviewed Vault add flow.
          </p>
          <button
            type="button"
            className="min-h-11 text-sm underline"
            onClick={() => {
              try {
                localStorage.removeItem(key);
                setSelected([]);
                setIncoming([]);
                setAgreed({});
                setCash("");
                setCashDirection("none");
                setMessage("Local trade draft cleared.");
              } catch {
                setMessage("Draft could not be cleared.");
              }
            }}
          >
            Clear trade draft
          </button>
        </section>
      </div>
      <dialog className={dialogClass} ref={bulkDialog}>
        <h2 className="text-lg font-bold">
          Review {chosen.length} exact {chosen.length === 1 ? 'copy' : 'copies'}
        </h2>
        <p className="mt-2 text-sm">
          Trade, Sell and Showcase publish these copies on your Wall. Hold keeps
          them private.
        </p>
        <label className="mt-3 block text-sm">
          Intent<select
            className={input}
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
          >
            {["hold", "trade", "sell", "showcase"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <ul className="my-3 space-y-2 text-sm">
          {chosen.map((row) => (
            <li key={row.instance_id}>
              {row.card.name} · {row.gv_vi_id} · {row.finish_label}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="gv-secondary-button"
            onClick={() => bulkDialog.current?.close()}
          >
            Keep editing
          </button>
          <button
            type="button"
            disabled={busy}
            className="gv-primary-button"
            onClick={applyIntent}
          >
            {busy ? "Saving…" : "Apply to selected copies"}
          </button>
        </div>
      </dialog>
      <dialog className={dialogClass} ref={outcomeDialog}>
        <h2 className="text-lg font-bold">Record exact-copy outcome</h2>
        <p className="my-2 text-sm">
          {chosen[0]?.card.name} ·{" "}
          {chosen[0]?.gv_vi_id}. Recording removes this copy from your active
          Vault.
        </p>
        <label className="block text-sm">
          Outcome<select
            className={input}
            value={outcomeType}
            onChange={(event) =>
              setOutcomeType(event.target.value as "sale" | "trade")}
          >
            <option value="sale">Sold</option>
            <option value="trade">Traded</option>
          </select>
        </label>
        {outcomeType === "sale"
          ? (
            <label className="mt-3 block text-sm">
              Actual sale price · USD<input
                className={input}
                value={amount}
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
          )
          : (
            <>
              <label className="mt-3 block text-sm">
                What you received<textarea
                  className={input}
                  maxLength={1000}
                  value={received}
                  onChange={(event) => setReceived(event.target.value)}
                />
              </label>
              <label className="mt-3 block text-sm">
                Cash adjustment<select
                  className={input}
                  value={outcomeCashDirection}
                  onChange={(event) =>
                    setOutcomeCashDirection(event.target.value)}
                >
                  <option value="none">No cash</option>
                  <option value="received">Cash received</option>
                  <option value="paid">Cash paid</option>
                </select>
              </label>
              {outcomeCashDirection !== "none"
                ? (
                  <label className="mt-3 block text-sm">
                    Cash amount · USD<input
                      className={input}
                      value={outcomeCash}
                      inputMode="decimal"
                      onChange={(event) => setOutcomeCash(event.target.value)}
                    />
                  </label>
                )
                : null}
            </>
          )}
        <label className="my-3 block text-sm">
          Counterparty (optional)<input
            className={input}
            maxLength={200}
            value={buyer}
            onChange={(event) => setBuyer(event.target.value)}
          />
        </label>
        <p role="status" className="my-3 text-sm">{message}</p>
        <div className="flex gap-2">
          <button
            className="gv-secondary-button"
            type="button"
            disabled={busy}
            onClick={() => outcomeDialog.current?.close()}
          >
            Cancel
          </button>
          <button
            className="gv-primary-button"
            type="button"
            disabled={busy}
            onClick={recordOutcome}
          >
            {busy ? "Recording…" : "Record outcome"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
