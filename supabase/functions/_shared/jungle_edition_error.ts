export function jungleEditionErrorResponse(error: { message?: string } | null) {
  const code = error?.message ?? "";
  const messages: Record<string, string> = {
    JUNGLE_EDITION_REQUIRED: "Choose First Edition or Unlimited on the card page before adding a new copy.",
    JUNGLE_EDITION_UNAVAILABLE: "Edition choices are being reviewed. Your saved copies remain available.",
    JUNGLE_EDITION_PRINTING_REQUIRED: "Choose the verified printing for this edition on the card page.",
    JUNGLE_EDITION_OWNED_RESOLUTION_REQUIRED: "Changing an existing copy's edition requires a separate confirmation.",
  };
  return Object.hasOwn(messages, code) ? { error: code, message: messages[code] } : null;
}
