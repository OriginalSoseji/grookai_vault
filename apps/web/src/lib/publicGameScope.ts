export type PublicGameScope = "pokemon" | "one_piece";

export const PUBLIC_GAME_SCOPE_OPTIONS: Array<{
  value: PublicGameScope;
  label: string;
}> = [
  { value: "pokemon", label: "Pokemon" },
  { value: "one_piece", label: "One Piece" },
];

export function normalizePublicGameScope(
  value?: string | null,
): PublicGameScope {
  return value === "one_piece" ? "one_piece" : "pokemon";
}

export function matchesPublicGameScope(
  value: { game_code?: string | null },
  scope: PublicGameScope,
) {
  return (value.game_code ?? "pokemon").trim().toLowerCase() === scope;
}

export function getPublicGameScopeLabel(scope: PublicGameScope) {
  return (
    PUBLIC_GAME_SCOPE_OPTIONS.find((option) => option.value === scope)?.label ??
    "Pokemon"
  );
}
