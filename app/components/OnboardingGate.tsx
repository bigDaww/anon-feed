"use client";

import { useCallback, useEffect, useState } from "react";
import OnboardingScreen from "@/app/components/onboarding/OnboardingScreen";
import {
  fetchCurrentProfile,
  getCachedProfile,
  setCachedProfile,
  type Profile,
} from "@/lib/profile";

type OnboardingGateProps = {
  children: React.ReactNode;
};

/**
 * Blocks the app until the device has an onboarded profile.
 * Existing anon_id users without a profile row see onboarding once.
 */
export default function OnboardingGate({ children }: OnboardingGateProps) {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const cached = getCachedProfile();
      if (cached) {
        setProfile(cached);
        setReady(true);
      }
      const remote = await fetchCurrentProfile();
      if (remote) {
        setProfile(remote);
        setReady(true);
      } else {
        setCachedProfile(null);
        setProfile(null);
        setReady(false);
      }
    } catch {
      // Profiles migration not applied yet — don't block the feed.
      setReady(true);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  if (checking && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ol-canvas text-sm text-ol-muted">
        Loading…
      </div>
    );
  }

  if (!ready) {
    return (
      <OnboardingScreen
        onComplete={(p) => {
          setProfile(p);
          setCachedProfile(p);
          setReady(true);
        }}
      />
    );
  }

  return <>{children}</>;
}
