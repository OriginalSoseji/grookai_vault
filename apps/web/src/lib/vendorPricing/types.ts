export type PricingDefinition = {
  markupBps: number; flatMinor: number; rounding: "none" | "up" | "down" | "nearest";
  stepMinor: number; minMinor: number | null; maxMinor: number | null;
};
export type PricingRule = {id: string; name: string; revision: number; definition: PricingDefinition};
export type PricingWorkspace = {
  enabled: boolean;
  settings: {default_rule_id: string | null; auto_for_new: boolean; revision: number};
  rules: PricingRule[];
  copy: {mode: "manual" | "default" | "preset"; rule_id: string | null; revision: number;
    state: string; reason: string | null; resolved_minor: number | null} | null;
};
export type PricingQuote = {status: string; amountMinor?: number; reason?: string; ruleName?: string; observedAt?: string};
