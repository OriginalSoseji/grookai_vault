export function suggestionRequestIsPrivate(headers: Headers, cookies: Array<{ name: string; value: string }>): boolean;
export function suggestionResponseHeaders(privateRequest: boolean): Record<string, string>;
