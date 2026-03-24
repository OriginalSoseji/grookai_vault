"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markCardInteractionGroupsReadAction } from "@/lib/network/updateCardInteractionGroupStateAction";

type InteractionGroupReadMarkerProps = {
  currentPath: string;
  targets: Array<{
    cardPrintId: string;
    counterpartUserId: string;
  }>;
};

export function InteractionGroupReadMarker({ currentPath, targets }: InteractionGroupReadMarkerProps) {
  const router = useRouter();
  const hasMarkedRef = useRef(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (hasMarkedRef.current || targets.length === 0) {
      return;
    }

    hasMarkedRef.current = true;

    startTransition(async () => {
      const result = await markCardInteractionGroupsReadAction(targets, currentPath);
      if (result.ok && result.updatedCount > 0) {
        router.refresh();
      }
    });
  }, [currentPath, router, targets]);

  return null;
}

export default InteractionGroupReadMarker;
