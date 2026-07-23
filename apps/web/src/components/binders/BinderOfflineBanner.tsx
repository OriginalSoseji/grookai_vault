"use client";

import { createContext, useContext, useEffect, useState } from "react";

const BinderOnlineContext = createContext(true);

export function useBinderOnline() {
  return useContext(BinderOnlineContext);
}

export function BinderConnectivityBoundary({
  loadedAt,
  children,
}: {
  loadedAt?: string | null;
  children: React.ReactNode;
}) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!window.navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <BinderOnlineContext.Provider value={!offline}>
      {offline ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          You are offline. Binder changes are disabled until your connection
          returns.
          {loadedAt ? (
            <span className="block text-xs">
              Last authorized {new Date(loadedAt).toLocaleString()}.
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
    </BinderOnlineContext.Provider>
  );
}

export function BinderOfflineBanner({ loadedAt }: { loadedAt?: string | null }) {
  return (
    <BinderConnectivityBoundary loadedAt={loadedAt}>
      {null}
    </BinderConnectivityBoundary>
  );
}
