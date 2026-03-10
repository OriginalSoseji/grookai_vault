import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CODE_VERIFIER_SUFFIX = "-code-verifier";

if (!url || !anon) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const encodedName = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(encodedName));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(encodedName.length));
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") {
    return;
  }

  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") {
    return;
  }

  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

const storage = {
  getItem(key: string) {
    if (typeof window === "undefined") {
      return null;
    }

    const localValue = window.localStorage.getItem(key);
    if (localValue !== null) {
      return localValue;
    }

    if (key.endsWith(CODE_VERIFIER_SUFFIX)) {
      return readCookie(key);
    }

    return null;
  },
  setItem(key: string, value: string) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(key, value);
    if (key.endsWith(CODE_VERIFIER_SUFFIX)) {
      writeCookie(key, value, 60 * 10);
    }
  },
  removeItem(key: string) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(key);
    if (key.endsWith(CODE_VERIFIER_SUFFIX)) {
      clearCookie(key);
    }
  },
};

export const supabase = createClient(url, anon, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false,
    storage,
  },
});
