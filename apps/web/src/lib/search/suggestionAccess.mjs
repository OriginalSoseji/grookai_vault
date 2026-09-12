export function suggestionRequestIsPrivate(headers, cookies) {
  return Boolean(headers.get('authorization')?.trim()) || cookies.some(cookie =>
    cookie.name.startsWith('sb-') && cookie.name.includes('auth-token') && Boolean(cookie.value));
}

export function suggestionResponseHeaders(privateRequest) {
  return {
    'Cache-Control': privateRequest ? 'private, no-store' : 'public, s-maxage=60, stale-while-revalidate=120',
    Vary: 'Cookie, Authorization',
  };
}
