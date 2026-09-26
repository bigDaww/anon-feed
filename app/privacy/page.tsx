import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy · OutLinked",
  description: "Privacy policy for the OutLinked anonymous feed.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-ol-ink">
      <p className="text-sm text-ol-muted">
        <Link href="/" className="hover:underline">
          ← Back to feed
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Privacy</h1>
      <p className="mt-2 text-sm text-ol-muted">Last updated: September 26, 2026</p>

      <div className="mt-8 space-y-5 font-voice text-[15px] leading-relaxed text-ol-ink">
        <p>
          OutLinked is designed so you do not need an email or password. This
          policy explains what we store.
        </p>
        <h2 className="font-sans text-lg font-semibold">What we store</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            A random device identity (`anon_id`) in your browser localStorage,
            used to attribute posts, comments, and votes.
          </li>
          <li>
            Optional profile fields (display name, public ID, avatar color) and a
            hashed recovery key — never the raw recovery key.
          </li>
          <li>
            Post, comment, vote, room, and report content you submit, with
            timestamps.
          </li>
        </ul>
        <h2 className="font-sans text-lg font-semibold">What we do not ask for</h2>
        <p>
          We do not require your real name, email, or phone number to use the
          feed. Analytics or hosting providers (e.g. Vercel, Supabase) may
          process standard request logs (IP, user agent) as part of running the
          service.
        </p>
        <h2 className="font-sans text-lg font-semibold">Sharing</h2>
        <p>
          We do not sell personal data. Content you post is visible to other
          users of the product. We may disclose information if required by law
          or to address severe abuse.
        </p>
        <h2 className="font-sans text-lg font-semibold">Retention</h2>
        <p>
          Feed posts are intended to expire after about 24 hours from creation.
          Profiles, reports, and other records may be retained longer for
          safety and operations.
        </p>
        <h2 className="font-sans text-lg font-semibold">Your choices</h2>
        <p>
          Clearing site data removes your local identity. Recovery keys (if you
          saved one) can restore a profile on another device. Contact the
          operator for deletion requests related to abuse reports or legal holds.
        </p>
      </div>
    </main>
  );
}
