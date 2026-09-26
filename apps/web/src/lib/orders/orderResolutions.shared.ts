import { acquisitionUuid } from "./orderAcquisitionTypes.ts";

export const RESOLUTION_TERMS = "continue-original-order-after-failed-refund-v1";
export const resolutionActions = ["agree", "decline", "withdraw", "accept", "reject"] as const;
export type ResolutionAction = typeof resolutionActions[number];
export type ResolutionRole = "seller" | "buyer" | "operator";
export type ResolutionState = "requested" | "agreed" | "declined" | "withdrawn" | "accepted" | "rejected";
export type ResolutionCommand = { action: "request"; orderId: string; requestId: string } |
  { action: ResolutionAction; orderId: string; caseId: string; requestId: string; expectedSequence: number; termsHash: string };
export type ResolutionEvent = { requestId: string; sequence: number; action: "request" | ResolutionAction;
  role: ResolutionRole; recordedAt: string };
export type ResolutionCase = { caseId: string; termsVersion: typeof RESOLUTION_TERMS; termsHash: string;
  totalAmountMinor: number; currency: "usd"; state: ResolutionState; sequence: number;
  basisCurrent: boolean; createdAt: string; events: ResolutionEvent[] };
export type ResolutionStatus = { schema: "VENDOR_ORDER_RESOLUTIONS_V1"; orderId: string; role: ResolutionRole;
  writesEnabled: boolean; canRequest: boolean; cases: ResolutionCase[]; clearsFinancialHolds: false; permitsFulfillment: false };
const fail = () => new Error("Order resolution information is unavailable.");
const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw fail(); return v as Record<string, unknown>;
};
const id = (v: unknown): v is string => typeof v === "string" && acquisitionUuid.test(v);
const hash = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const integer = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const time = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
const role = (v: unknown): v is ResolutionRole => ["seller", "buyer", "operator"].includes(v as string);
const states = { request: "requested", agree: "agreed", decline: "declined", withdraw: "withdrawn", accept: "accepted", reject: "rejected" } as const;

export function resolutionCommand(value: unknown): ResolutionCommand {
  const v = record(value), keys = Object.keys(v).sort().join(",");
  if (!id(v.orderId) || !id(v.requestId)) throw fail();
  if (v.action === "request") {
    if (keys !== "action,orderId,requestId") throw fail();
    return { action: "request", orderId: v.orderId, requestId: v.requestId };
  }
  if (keys !== "action,caseId,expectedSequence,orderId,requestId,termsHash" || !id(v.caseId) ||
      !integer(v.expectedSequence, 1, 8) || !hash(v.termsHash) || !resolutionActions.includes(v.action as ResolutionAction)) throw fail();
  return { action: v.action as ResolutionAction, orderId: v.orderId, caseId: v.caseId, requestId: v.requestId,
    expectedSequence: v.expectedSequence, termsHash: v.termsHash };
}

// Display validation only. Database authorization and transitions are mandatory;
// a client-provided role, state or snapshot never authorizes a recorded event.
export function availableResolutionActions(value: ResolutionCase, actor: ResolutionRole): ResolutionAction[] {
  if (["declined", "withdrawn", "rejected"].includes(value.state)) return [];
  if (actor === "seller") return ["withdraw"];
  if (actor === "buyer") {
    if (value.state === "requested") return value.basisCurrent ? ["agree", "decline"] : ["decline"];
    if (["agreed", "accepted"].includes(value.state)) return ["withdraw"];
  }
  if (actor === "operator" && value.state === "agreed") return value.basisCurrent ? ["accept", "reject"] : ["reject"];
  return [];
}

export function resolutionStatus(value: unknown): ResolutionStatus | null {
  if (value === null) return null;
  const v = record(value);
  if (v.schema !== "VENDOR_ORDER_RESOLUTIONS_V1" || !id(v.orderId) || !role(v.role) ||
      typeof v.writesEnabled !== "boolean" || typeof v.canRequest !== "boolean" ||
      v.canRequest && (!v.writesEnabled || v.role !== "seller") || v.clearsFinancialHolds !== false || v.permitsFulfillment !== false ||
      !Array.isArray(v.cases) || v.cases.length > 20) throw fail();
  const seenCases = new Set<string>(), seenEvents = new Set<string>();
  const cases = v.cases.map(raw => {
    const c = record(raw);
    if (!id(c.caseId) || seenCases.has(c.caseId) || c.termsVersion !== RESOLUTION_TERMS || !hash(c.termsHash) ||
        !integer(c.totalAmountMinor, 1, 99_999_999) || c.currency !== "usd" || !integer(c.sequence, 1, 8) ||
        !Object.values(states).includes(c.state as ResolutionState) || typeof c.basisCurrent !== "boolean" ||
        !time(c.createdAt) || !Array.isArray(c.events) || c.events.length !== c.sequence) throw fail();
    seenCases.add(c.caseId);
    const events = c.events.map((rawEvent, index) => {
      const e = record(rawEvent);
      if (!id(e.requestId) || seenEvents.has(e.requestId) || e.sequence !== index + 1 || !role(e.role) || !time(e.recordedAt) ||
          typeof e.action !== "string" || !Object.hasOwn(states, e.action) ||
          (index === 0 ? e.action !== "request" || e.role !== "seller" || e.requestId !== c.caseId || e.recordedAt !== c.createdAt : e.action === "request") ||
          ["agree", "decline"].includes(e.action) && e.role !== "buyer" ||
          ["accept", "reject"].includes(e.action) && e.role !== "operator" || e.action === "withdraw" && e.role === "operator") throw fail();
      seenEvents.add(e.requestId);
      return { requestId: e.requestId, sequence: index + 1, role: e.role, action: e.action as ResolutionEvent["action"], recordedAt: e.recordedAt };
    });
    for (let i = 1; i < events.length; i++) {
      const previous = { state: states[events[i - 1].action], basisCurrent: true } as ResolutionCase;
      if (!availableResolutionActions(previous, events[i].role).includes(events[i].action as ResolutionAction) ||
          Date.parse(events[i].recordedAt) < Date.parse(events[i - 1].recordedAt)) throw fail();
    }
    if (states[events.at(-1)!.action] !== c.state) throw fail();
    return { caseId: c.caseId, termsVersion: RESOLUTION_TERMS as typeof RESOLUTION_TERMS, termsHash: c.termsHash, totalAmountMinor: c.totalAmountMinor,
      currency: "usd" as const, sequence: c.sequence, state: c.state as ResolutionState, basisCurrent: c.basisCurrent, createdAt: c.createdAt, events };
  });
  return { schema: "VENDOR_ORDER_RESOLUTIONS_V1", orderId: v.orderId, role: v.role, writesEnabled: v.writesEnabled,
    canRequest: v.canRequest, cases, clearsFinancialHolds: false, permitsFulfillment: false };
}
