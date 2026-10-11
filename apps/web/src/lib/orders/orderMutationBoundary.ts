/** Browser order actions must carry their editor's original bearer, never cookies alone.
 * The existing handler remains responsible for verifying that bearer with Auth,
 * origin checks, permissions and all payment/provider rollout gates.
 */
export function orderMutationBoundary(handler: (request: Request) => Promise<Response>) {
  return (request: Request) => {
    if (!/^Bearer\s+\S+$/i.test(request.headers.get("authorization")?.trim() ?? "")) {
      return Promise.resolve(Response.json({ error: "Sign in required." }, { status: 401,
        headers: { "Cache-Control": "private, no-store", Vary: "Authorization, Cookie" } }));
    }
    return handler(request);
  };
}
