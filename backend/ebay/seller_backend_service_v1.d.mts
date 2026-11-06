export type SellerOperationInput = { actorId: string; draftId: string; requestId: string;
  revision: number; kind: 'publish' | 'withdraw' | 'reconcile'; reviewHash?: string | null };
export type SellerPreparationInput = { actorId: string; draftId: string; requestId: string;
  revision: number; operationId?: string | null };
export type SellerCookie = { name: string; value: string; secure: boolean; httpOnly: boolean;
  sameSite: 'lax'; path: string; maxAge: number };
export function createEbaySellerBackendService(): {
  oauth: {
    start(actorId: string): Promise<{ attemptId: string; expiresAt: string; launchUrl: string }>;
    launch(capability: string): Promise<{ authorizationUrl: string; cookie: SellerCookie }>;
    callback(input: { state: string; browserNonce: string; code?: string; error?: string }): Promise<{
      status: 'linked' | 'denied'; accountId?: string; clearCookie: SellerCookie }>;
    clearCookie(): SellerCookie;
  };
  preparation: { step(input: SellerPreparationInput): Promise<Record<string, unknown>> };
  publication: { execute(input: SellerOperationInput): Promise<Record<string, unknown>> };
  saveDraft(actorId: string, input: { draftId: string; instanceId: string; accountId: string;
    revision: number; listing: Record<string, unknown> }): Promise<Record<string, unknown>>;
  registerPhoto(actorId: string, input: { draftId: string; photoId: string; revision: number }): Promise<Record<string, unknown>>;
  removePhoto(actorId: string, input: { draftId: string; photoId: string; revision: number }): Promise<Record<string, unknown>>;
  draftAction(actorId: string, input: { draftId: string; requestId: string; revision: number;
    action: 'edit' | 'abandon' }): Promise<Record<string, unknown>>;
  metadata(actorId: string, input: { instanceId: string; accountId: string }): Promise<Record<string, unknown>>;
};
