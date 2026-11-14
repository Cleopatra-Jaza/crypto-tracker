import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service | Crypto Tracker",
  description: `Terms of service for ${SITE.name}, a personal cryptocurrency tracking project.`,
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm text-[var(--muted)] underline-offset-4 hover:underline"
      >
        Back to home
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">Terms of Service</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Last updated: {SITE.updated}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-[var(--foreground)]">
        <section>
          <h2 className="text-base font-semibold">Acceptance of terms</h2>
          <p className="mt-2">
            By using {SITE.name}, you agree to these terms. If you do not agree, please do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">The service</h2>
          <p className="mt-2">
            {SITE.name} is a free personal portfolio project provided as is. Features may change or stop at any time.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">No financial advice</h2>
          <p className="mt-2">
            Prices, charts, indicators, alerts, and the Fear and Greed index are for information only and may be delayed, incomplete, or wrong.
            Nothing here is investment, financial, tax, or legal advice. You are responsible for your own decisions.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Accounts</h2>
          <p className="mt-2">If you create or use an account, you agree to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Be responsible for your account and give accurate information.</li>
            <li>Not abuse or attack the service.</li>
            <li>Not try to access other users&apos; data.</li>
          </ul>
          <p className="mt-2">Automated heavy use may be blocked.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Third-party data and services</h2>
          <p className="mt-2">
            The app relies on third-party data and services, including CoinGecko, Binance, alternative.me, GitHub, Google, Vercel, and Neon.
            We do not control them, and their availability or accuracy is not guaranteed.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Disclaimer of warranties and limitation of liability</h2>
          <p className="mt-2">
            The service is provided &quot;as is&quot; without warranties of any kind. To the extent permitted by law, we are not liable for losses
            arising from your use of the service, including trading losses.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Termination</h2>
          <p className="mt-2">
            We may suspend access to the service at any time. You may stop using the service and request deletion of your account and data.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Changes to the terms</h2>
          <p className="mt-2">
            We may update these terms. The date at the top shows the latest version.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Contact</h2>
          <p className="mt-2">
            Questions about these terms? Email{" "}
            <a className="underline" href={`mailto:${SITE.contactEmail}`}>
              {SITE.contactEmail}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
