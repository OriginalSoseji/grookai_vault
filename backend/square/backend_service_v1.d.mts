export type SquareBackend = {
  start(ownerId: string, input?: {clientReturn:'web'|'native'}): Promise<{launchUrl: string}>;
  launch(capability: string): Promise<{browserNonce: string; authorizationUrl: string; clientReturn:'web'|'native'}>;
  callback(input: {state: string; browserNonce: string; code?: string; denied?: boolean}): Promise<{clientReturn?:'web'|'native'}>;
  locations(ownerId: string, connectionId: string): Promise<unknown>;
  configure(ownerId: string, connectionId: string, input: {locationId: string; autoSync: boolean}): Promise<unknown>;
  select(ownerId: string, connectionId: string, input: {instanceIds: string[]; confirmed: boolean}): Promise<unknown>;
  sync(ownerId: string, connectionId: string, targetId: string, requestId: string): Promise<unknown>;
  adopt(ownerId: string, connectionId: string, targetId: string, input: {itemId: string; variationId: string; expectedReviewHash: string; requestId: string; confirmed: boolean}): Promise<unknown>;
  pause(ownerId: string, connectionId: string): Promise<unknown>;
  disconnect(ownerId: string, connectionId: string): Promise<unknown>;
  deselect(ownerId: string, connectionId: string, instanceIds: string[]): Promise<unknown>;
};
export function createSquareBackendService(): SquareBackend;
