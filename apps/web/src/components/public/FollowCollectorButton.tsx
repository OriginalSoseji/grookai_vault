"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useClientViewer } from "@/lib/auth/useClientViewer";
import { followCollectorAction } from "@/lib/follows/followCollectorAction";
import { unfollowCollectorAction } from "@/lib/follows/unfollowCollectorAction";

type FollowCollectorButtonProps = {
  collectorUserId: string;
  isAuthenticated: boolean;
  isOwnProfile: boolean;
  initialIsFollowing: boolean;
  loginHref: string;
};

export default function FollowCollectorButton({
  collectorUserId,
  isAuthenticated,
  isOwnProfile,
  initialIsFollowing,
  loginHref,
}: FollowCollectorButtonProps) {
  const router = useRouter();
  const viewer = useClientViewer(null);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [clientIsOwnProfile, setClientIsOwnProfile] = useState(isOwnProfile);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const effectiveIsAuthenticated = isAuthenticated || viewer.isAuthenticated;
  const effectiveIsOwnProfile = isOwnProfile || clientIsOwnProfile;

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  useEffect(() => {
    if (!viewer.userId) {
      setClientIsOwnProfile(false);
      return;
    }

    if (viewer.userId === collectorUserId) {
      setClientIsOwnProfile(true);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ collector_user_id: collectorUserId });

    fetch(`/api/follows/state?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { isFollowing?: boolean } | null) => {
        if (payload) {
          setIsFollowing(Boolean(payload.isFollowing));
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [collectorUserId, viewer.userId]);

  if (effectiveIsOwnProfile) {
    return null;
  }

  if (!effectiveIsAuthenticated) {
    return (
      <Link
        href={loginHref}
        className="inline-flex rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Follow
      </Link>
    );
  }

  function handleToggle() {
    if (isPending) {
      return;
    }

    const previousIsFollowing = isFollowing;
    const nextIsFollowing = !previousIsFollowing;

    setIsFollowing(nextIsFollowing);
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const result = previousIsFollowing
          ? await unfollowCollectorAction({ followedUserId: collectorUserId })
          : await followCollectorAction({ followedUserId: collectorUserId });

        if (!result.ok) {
          setIsFollowing(previousIsFollowing);
          setStatusMessage(result.message);
          return;
        }

        setIsFollowing(result.isFollowing);
        router.refresh();
      } catch {
        setIsFollowing(previousIsFollowing);
        setStatusMessage(previousIsFollowing ? "Collector could not be unfollowed." : "Collector could not be followed.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <button
        type="button"
        disabled={isPending}
        onClick={handleToggle}
        className={`inline-flex rounded-full px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${
          isFollowing
            ? "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
            : "bg-slate-950 text-white hover:bg-slate-800"
        }`}
      >
        {isPending ? "Saving..." : isFollowing ? "Following" : "Follow"}
      </button>
      {statusMessage ? <p className="text-xs text-rose-700">{statusMessage}</p> : null}
    </div>
  );
}
