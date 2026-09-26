import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use · OutLinked",
  description: "Terms of use for the OutLinked anonymous feed.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-ol-ink">
      <p className="text-sm text-ol-muted">
        <Link href="/" className="hover:underline">
          ← Back to feed
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Terms of Use</h1>
      <p className="mt-2 text-sm text-ol-muted">Last updated: September 26, 2026</p>

      <div className="mt-8 space-y-5 font-voice text-[15px] leading-relaxed text-ol-ink">
        <p>
          OutLinked is an anonymous discussion product. By using the service you
          agree to these terms.
        </p>
        <h2 className="font-sans text-lg font-semibold">Acceptable use</h2>
        <p>
          Do not post illegal content, threats, doxxing, sexual content involving
          minors, malware, spam, or coordinated harassment. We may remove content
          and restrict identities that break these rules.
        </p>
        <h2 className="font-sans text-lg font-semibold">Anonymity</h2>
        <p>
          Identity is device-based and pseudonymous. It is not a guarantee of
          absolute anonymity. Do not post information that could identify you or
          others if you want to stay private.
        </p>
        <h2 className="font-sans text-lg font-semibold">Content &amp; moderation</h2>
        <p>
          Posts may expire automatically. Rate limits apply. You can report posts
          with the Report control. We may delete or hide reported material and
          ban offending anon IDs at our discretion.
        </p>
        <h2 className="font-sans text-lg font-semibold">No warranty</h2>
        <p>
          The service is provided as-is, without warranties. Availability,
          uptime, and data retention are not guaranteed.
        </p>
        <h2 className="font-sans text-lg font-semibold">Contact</h2>
        <p>
          For abuse or legal requests, use in-app Report on the relevant post, or
          contact the operator via the project repository.
        </p>
      </div>
    </main>
  );
}
