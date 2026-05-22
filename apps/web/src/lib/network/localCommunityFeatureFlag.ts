export function isLocalCommunityFeedEnabled() {
  if (
    process.env.LOCAL_COMMUNITY_FEED_V1_ENABLED === "false" ||
    process.env.NEXT_PUBLIC_LOCAL_COMMUNITY_FEED_V1_ENABLED === "false"
  ) {
    return false;
  }

  return (
    process.env.LOCAL_COMMUNITY_FEED_V1_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_LOCAL_COMMUNITY_FEED_V1_ENABLED === "true" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.APP_ENV === "staging"
  );
}
