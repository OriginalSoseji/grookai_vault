"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useClientViewer } from "@/lib/auth/useClientViewer";

export const COLLECTOR_BLOCKED_EVENT = "grookai:collector-blocked";

export type ContactEligibilityTarget = {
  vaultItemId: string;
  cardPrintId: string;
};

type ContactEligibilityContextValue = {
  isEligible: (vaultItemId: string, cardPrintId: string, ownerUserId: string | null) => boolean | null;
};

type ContactEligibilityResult = {
  requestKey: string;
  eligibleTargetKeys: Set<string>;
};

const ContactEligibilityContext = createContext<ContactEligibilityContextValue | null>(null);

function targetKey(vaultItemId: string, cardPrintId: string) {
  return `${vaultItemId.trim()}:${cardPrintId.trim()}`;
}

export function dispatchCollectorBlocked(ownerUserId: string) {
  window.dispatchEvent(
    new CustomEvent(COLLECTOR_BLOCKED_EVENT, {
      detail: { ownerUserId },
    }),
  );
}

export function ContactEligibilityProvider({
  targets,
  children,
}: {
  targets: ContactEligibilityTarget[];
  children: ReactNode;
}) {
  const viewer = useClientViewer(null);
  const [eligibilityResult, setEligibilityResult] = useState<ContactEligibilityResult | null>(null);
  const [blockedOwnerUserIds, setBlockedOwnerUserIds] = useState<Set<string>>(() => new Set());
  const eligibilityRequestVersionRef = useRef(0);
  const normalizedTargets = useMemo(
    () =>
      Array.from(
        new Map(
          targets.map((target) => [targetKey(target.vaultItemId, target.cardPrintId), target]),
        ).values(),
      ).slice(0, 100),
    [targets],
  );
  const currentRequestKey = useMemo(() => {
    if (!viewer.isAuthenticated || !viewer.userId || normalizedTargets.length === 0) {
      return null;
    }

    return `${viewer.userId}:${normalizedTargets
      .map((target) => targetKey(target.vaultItemId, target.cardPrintId))
      .join(",")}`;
  }, [normalizedTargets, viewer.isAuthenticated, viewer.userId]);

  useEffect(() => {
    function handleCollectorBlocked(event: Event) {
      const ownerUserId = (event as CustomEvent<{ ownerUserId?: unknown }>).detail?.ownerUserId;
      if (typeof ownerUserId !== "string" || !ownerUserId.trim()) {
        return;
      }

      setBlockedOwnerUserIds((current) => {
        const next = new Set(current);
        next.add(ownerUserId.trim());
        return next;
      });
    }

    window.addEventListener(COLLECTOR_BLOCKED_EVENT, handleCollectorBlocked);
    return () => window.removeEventListener(COLLECTOR_BLOCKED_EVENT, handleCollectorBlocked);
  }, []);

  useEffect(() => {
    setBlockedOwnerUserIds(new Set());
    setEligibilityResult(null);
  }, [viewer.userId]);

  useEffect(() => {
    const requestVersion = ++eligibilityRequestVersionRef.current;
    if (!viewer.hasCheckedSession || !currentRequestKey) {
      setEligibilityResult(null);
      return;
    }

    const controller = new AbortController();
    setEligibilityResult(null);
    fetch("/api/network/contact-eligibility", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targets: normalizedTargets }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as { eligibleTargetKeys?: unknown };
      })
      .then((payload) => {
        if (controller.signal.aborted || eligibilityRequestVersionRef.current !== requestVersion) {
          return;
        }

        if (!payload || !Array.isArray(payload.eligibleTargetKeys)) {
          setEligibilityResult({ requestKey: currentRequestKey, eligibleTargetKeys: new Set() });
          return;
        }

        setEligibilityResult({
          requestKey: currentRequestKey,
          eligibleTargetKeys: new Set(
            payload.eligibleTargetKeys.filter((key): key is string => typeof key === "string"),
          ),
        });
      })
      .catch(() => {
        if (!controller.signal.aborted && eligibilityRequestVersionRef.current === requestVersion) {
          setEligibilityResult({ requestKey: currentRequestKey, eligibleTargetKeys: new Set() });
        }
      });

    return () => controller.abort();
  }, [currentRequestKey, normalizedTargets, viewer.hasCheckedSession]);

  const isEligible = useCallback(
    (vaultItemId: string, cardPrintId: string, ownerUserId: string | null) => {
      if (ownerUserId && blockedOwnerUserIds.has(ownerUserId)) {
        return false;
      }
      if (!currentRequestKey || eligibilityResult?.requestKey !== currentRequestKey) {
        return null;
      }
      return eligibilityResult.eligibleTargetKeys.has(targetKey(vaultItemId, cardPrintId));
    },
    [blockedOwnerUserIds, currentRequestKey, eligibilityResult],
  );

  const value = useMemo(() => ({ isEligible }), [isEligible]);

  return (
    <ContactEligibilityContext.Provider value={value}>
      {children}
    </ContactEligibilityContext.Provider>
  );
}

export function useContactEligibility() {
  return useContext(ContactEligibilityContext);
}

export function useSingletonContactEligibility({
  enabled,
  vaultItemId,
  cardPrintId,
  viewerUserId,
}: {
  enabled: boolean;
  vaultItemId: string;
  cardPrintId: string;
  viewerUserId: string | null;
}) {
  const normalizedVaultItemId = vaultItemId.trim();
  const normalizedCardPrintId = cardPrintId.trim();
  const currentRequestKey = enabled
    ? `${viewerUserId ?? "authenticated"}:${targetKey(normalizedVaultItemId, normalizedCardPrintId)}`
    : null;
  const [eligibilityResult, setEligibilityResult] = useState<{
    requestKey: string;
    isEligible: boolean;
  } | null>(null);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    const requestVersion = ++requestVersionRef.current;
    setEligibilityResult(null);

    if (!currentRequestKey) {
      return;
    }

    if (!normalizedVaultItemId || !normalizedCardPrintId) {
      setEligibilityResult({ requestKey: currentRequestKey, isEligible: false });
      return;
    }

    const controller = new AbortController();
    const requestedTargetKey = targetKey(normalizedVaultItemId, normalizedCardPrintId);

    fetch("/api/network/contact-eligibility", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targets: [
          {
            vaultItemId: normalizedVaultItemId,
            cardPrintId: normalizedCardPrintId,
          },
        ],
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as { eligibleTargetKeys?: unknown };
      })
      .then((payload) => {
        if (controller.signal.aborted || requestVersionRef.current !== requestVersion) {
          return;
        }

        const isExplicitlyEligible = Boolean(
          payload &&
            Array.isArray(payload.eligibleTargetKeys) &&
            payload.eligibleTargetKeys.some((key) => key === requestedTargetKey),
        );
        setEligibilityResult({ requestKey: currentRequestKey, isEligible: isExplicitlyEligible });
      })
      .catch(() => {
        if (!controller.signal.aborted && requestVersionRef.current === requestVersion) {
          setEligibilityResult({ requestKey: currentRequestKey, isEligible: false });
        }
      });

    return () => controller.abort();
  }, [currentRequestKey, normalizedCardPrintId, normalizedVaultItemId]);

  return currentRequestKey && eligibilityResult?.requestKey === currentRequestKey
    ? eligibilityResult.isEligible
    : null;
}

export default ContactEligibilityProvider;
