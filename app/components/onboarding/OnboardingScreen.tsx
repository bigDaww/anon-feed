"use client";

import { FormEvent, useMemo, useState } from "react";
import AvatarBadge from "@/app/components/AvatarBadge";
import { generatePublicId, generateRecoveryKey } from "@/lib/identity";
import { animalNameFromAnonId, resolveAvatar } from "@/lib/avatar";
import { getAnonId } from "@/lib/anon";
import {
  adoptProfileIdentity,
  createProfile,
  recoverProfile,
  type Profile,
} from "@/lib/profile";

type OnboardingScreenProps = {
  onComplete: (profile: Profile) => void;
};

type Step = "who" | "recovery" | "recover";

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<Step>("who");
  const [displayName, setDisplayName] = useState("");
  const [anonId] = useState(() => getAnonId());
  const [publicId, setPublicId] = useState(() => generatePublicId());
  const [recoveryKey] = useState(() => generateRecoveryKey());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [loginPublicId, setLoginPublicId] = useState("");
  const [loginKey, setLoginKey] = useState("");

  const animalName = useMemo(() => animalNameFromAnonId(anonId), [anonId]);
  const avatarColor = useMemo(() => resolveAvatar(anonId).color, [anonId]);
  const previewName = useMemo(
    () => displayName.trim() || animalName,
    [displayName, animalName],
  );

  async function finishCreate(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = getAnonId();
      let pid = publicId;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await createProfile({
            id,
            displayName: previewName,
            publicId: pid,
            recoveryKey,
            avatar: avatarColor,
          });
          if (pid !== publicId) setPublicId(pid);
          setStep("recovery");
          return;
        } catch (err) {
          lastError = err;
          const msg =
            err instanceof Error ? err.message : String(err ?? "");
          // Only retry public_id unique collisions
          if (
            msg.toLowerCase().includes("duplicate") ||
            msg.toLowerCase().includes("unique") ||
            msg.includes("23505")
          ) {
            pid = generatePublicId();
            continue;
          }
          throw err instanceof Error
            ? err
            : new Error(msg || "Could not create profile");
        }
      }
      throw lastError instanceof Error
        ? lastError
        : new Error("Could not create profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create profile");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRecoverySeen() {
    setBusy(true);
    try {
      const { fetchCurrentProfile } = await import("@/lib/profile");
      const p = await fetchCurrentProfile();
      if (p) onComplete(p);
      else setError("Profile not found. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecover(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const profile = await recoverProfile(loginPublicId, loginKey);
      if (!profile) {
        setError("Invalid Public ID or Recovery Key.");
        return;
      }
      adoptProfileIdentity(profile.id);
      onComplete(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recovery failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (step === "recover") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ol-canvas px-4 py-10">
        <form
          onSubmit={handleRecover}
          className="ol-card w-full max-w-md p-6 animate-in fade-in duration-300"
        >
          <h1 className="text-2xl font-semibold text-ol-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-ol-muted">
            Sign in with your Public ID and Recovery Key.
          </p>

          <label className="mt-5 block text-xs font-semibold text-ol-muted">
            Public ID
            <input
              value={loginPublicId}
              onChange={(e) => setLoginPublicId(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              placeholder="483271"
              className="mt-1.5 h-10 w-full rounded-md border border-ol-border bg-white px-3 text-sm outline-none focus:border-ol-primary focus:ring-1 focus:ring-ol-primary"
            />
          </label>

          <label className="mt-3 block text-xs font-semibold text-ol-muted">
            Recovery Key
            <input
              value={loginKey}
              onChange={(e) => setLoginKey(e.target.value.toUpperCase())}
              placeholder="FROST-LAMP-RIVER-92"
              className="mt-1.5 h-10 w-full rounded-md border border-ol-border bg-white px-3 font-mono text-sm outline-none focus:border-ol-primary focus:ring-1 focus:ring-ol-primary"
            />
          </label>

          {error ? (
            <p className="mt-3 text-xs text-ol-danger" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || loginPublicId.length < 6 || !loginKey.trim()}
            className="mt-5 h-10 w-full rounded-full bg-ol-primary text-sm font-semibold text-white transition hover:bg-ol-primary-hover disabled:opacity-50"
          >
            {busy ? "Checking…" : "Continue"}
          </button>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep("who");
            }}
            className="mt-3 w-full text-center text-xs font-semibold text-ol-primary"
          >
            Create a new identity instead
          </button>
        </form>
      </main>
    );
  }

  if (step === "recovery") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ol-canvas px-4 py-10">
        <div className="ol-card w-full max-w-md p-6">
          <h1 className="text-2xl font-semibold text-ol-ink">Save your Recovery Key</h1>
          <p className="mt-2 text-sm text-ol-muted">
            This is shown once. Store it somewhere safe — you&apos;ll need it to
            restore access on another device.
          </p>

          <div className="mt-5 rounded-lg border border-ol-border bg-neutral-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ol-muted">
              Public ID
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-ol-ink">
              {publicId}
            </p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ol-muted">
              Recovery Key
            </p>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-ol-ink">
              {recoveryKey}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void copyKey()}
            className="mt-3 h-9 w-full rounded-full border border-ol-primary text-sm font-semibold text-ol-primary transition hover:bg-neutral-50"
          >
            {copied ? "Copied" : "Copy Recovery Key"}
          </button>

          <button
            type="button"
            onClick={() => void confirmRecoverySeen()}
            className="mt-3 h-10 w-full rounded-full bg-ol-primary text-sm font-semibold text-white transition hover:bg-ol-primary-hover"
          >
            I saved it — enter OutLinked
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ol-canvas px-4 py-10">
      <form
        onSubmit={finishCreate}
        className="ol-card w-full max-w-md p-6"
      >
        <div className="mb-5 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ol-primary text-sm font-bold text-white">
            OL
          </span>
          <span className="text-lg font-semibold text-ol-ink">OutLinked</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-ol-ink">
          Who are you?
        </h1>
        <p className="mt-2 text-sm text-ol-muted">
          You don&apos;t have to tell us who you are.
        </p>

        <div className="mt-6 flex items-center gap-4">
          <AvatarBadge anonId={anonId} size={44} className="shadow" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm font-semibold text-ol-ink">
              {animalName}
            </p>
            <p className="font-mono text-xs text-ol-muted">Public ID · {publicId}</p>
            <p className="mt-1 text-xs text-ol-faint">
              Your animal badge is unique to this device identity.
            </p>
          </div>
        </div>

        <label className="mt-5 block text-xs font-semibold text-ol-muted">
          Display Name (optional)
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 32))}
            placeholder={animalName}
            maxLength={32}
            className="mt-1.5 h-10 w-full rounded-md border border-ol-border bg-neutral-50 px-3 text-sm text-ol-ink outline-none transition focus:border-ol-primary focus:bg-white focus:ring-1 focus:ring-ol-primary"
          />
        </label>

        {error ? (
          <p className="mt-3 text-xs text-ol-danger" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 h-10 w-full rounded-full bg-ol-primary text-sm font-semibold text-white transition hover:bg-ol-primary-hover disabled:opacity-50"
        >
          {busy ? "Creating…" : "Continue"}
        </button>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setStep("recover");
          }}
          className="mt-3 w-full text-center text-xs font-semibold text-ol-primary"
        >
          Already have a Public ID? Recover access
        </button>
      </form>
    </main>
  );
}
