import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy | Crypto Tracker",
  description: `Privacy policy for ${SITE.name}, a personal cryptocurrency tracking project.`,
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm text-[var(--muted)] underline-offset-4 hover:underline"
      >
        Back to home
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Last updated: {SITE.updated}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-[var(--foreground)]">
        <section>
          <h2 className="text-base font-semibold">Who we are</h2>
          <p className="mt-2">
            {SITE.name} is a personal portfolio project for tracking cryptocurrency prices.
            If you have questions or requests, contact us at{" "}
            <a className="underline" href={`mailto:${SITE.contactEmail}`}>
              {SITE.contactEmail}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">What we collect when you sign in</h2>
          <p className="mt-2">You can sign in with GitHub or Google. When you do, we receive:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Your name, email address, and profile picture from the provider.</li>
            <li>The provider&apos;s account identifier and sign-in tokens, which are stored in our database so that you stay signed in.</li>
          </ul>
          <p className="mt-2">We never receive or store your password.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Data you create</h2>
          <p className="mt-2">
            We store data you create in the app and link it to your account:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Your watchlist.</li>
            <li>Your portfolio holdings (coin, amount, buy price).</li>
            <li>Your price alerts.</li>
          </ul>
          <p className="mt-2">
            This data is stored in our database. Nothing is public and nothing is shared with other users.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Data stored in your browser</h2>
          <p className="mt-2">
            Some settings are kept in localStorage on your device, such as your theme, selected currency, and (when signed out) your watchlist.
            We use only the cookies that are needed for sign-in (session cookie). We do not use advertising or analytics cookies.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Where data goes</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Hosting:</strong> Vercel.</li>
            <li><strong>Database:</strong> Neon (PostgreSQL).</li>
            <li><strong>Sign-in:</strong> GitHub and Google.</li>
            <li>
              <strong>Market data:</strong> fetched from CoinGecko, alternative.me (Fear and Greed index), and Binance public market data.
              These requests are made without your personal data.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">How we use data</h2>
          <p className="mt-2">
            We use your data only to provide the features of the app (sign-in, watchlist, portfolio, alerts).
            We do not sell your data and we do not show ads.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Retention and deletion</h2>
          <p className="mt-2">
            Your data stays until you ask us to delete it. Email{" "}
            <a className="underline" href={`mailto:${SITE.contactEmail}`}>
              {SITE.contactEmail}
            </a>{" "}
            to request deletion of your account and data.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Security</h2>
          <p className="mt-2">
            We use HTTPS and limit access so you can only see your own records. No system is perfectly secure.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Children</h2>
          <p className="mt-2">The app is not intended for children under 13.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Changes to this policy</h2>
          <p className="mt-2">
            We may update this page. The date at the top shows the latest version.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Google user data</h2>
          <p className="mt-2">
            The app&apos;s use of information received from Google APIs is limited to your basic profile (name, email, profile picture) for sign-in.
            This information is not used for advertising and is not shared with third parties.
          </p>
        </section>
      </div>
    </main>
  );
}
