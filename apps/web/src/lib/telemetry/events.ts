export const WEB_EVENT_NAMES = [
  "page_view_card",
  "page_view_set",
  "search_performed",
  "vault_add_click",
  "vault_add_success",
  "account_created",
  "vault_opened",
] as const;

export type WebEventName = (typeof WEB_EVENT_NAMES)[number];

export type WebEventPayload = {
  eventName: WebEventName;
  userId?: string | null;
  anonymousId?: string | null;
  path?: string | null;
  gvId?: string | null;
  setCode?: string | null;
  searchQuery?: string | null;
  metadata?: Record<string, unknown> | null;
};
