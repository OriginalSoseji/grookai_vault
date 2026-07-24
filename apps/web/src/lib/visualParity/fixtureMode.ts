import "server-only";

export function isLocalVisualParityFixtureMode(): boolean {
  return (
    process.env.GROOKAI_VISUAL_TEST_MODE === "1" &&
    process.env.VERCEL !== "1" &&
    process.env.NODE_ENV !== "production"
  );
}
