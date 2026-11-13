import type { Metadata } from "next";
import type { Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import Link from "next/link";
import "./globals.css";
import AuthButton from "@/components/AuthButton";
import CurrencySelect from "@/components/CurrencySelect";
import ThemeToggle from "@/components/ThemeToggle";
import AlertChecker from "@/components/AlertChecker";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Crypto Tracker",
  title: "Crypto Tracker",
  description: "Live crypto prices, interactive charts, watchlist and portfolio tracker",
  appleWebApp: {
    capable: true,
    title: "Crypto Tracker",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/192", sizes: "192x192", type: "image/png" },
      { url: "/icons/512", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/192", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
      <header className="relative flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 px-4 py-3 md:flex-nowrap md:items-center md:justify-between md:py-2">
        <div className="flex min-w-0 items-center gap-2 md:gap-4">
          <Link href="/" className="truncate text-base font-medium md:font-normal">
            Crypto Tracker
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/portfolio">Portfolio</Link>
            <Link href="/compare">Compare</Link>
            <Link href="/alerts">Alerts</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 min-w-0 [&_button]:min-h-10 [&_select]:min-h-10 md:[&_button]:min-h-0 md:[&_select]:min-h-0 [&_select]:text-sm">
          <Suspense fallback={null}>
            <AuthButton />
          </Suspense>
          <ThemeToggle />
          <CurrencySelect />
        </div>
      </header>
      <div className="pb-24 md:pb-0">
        {children}
      </div>
      <BottomNav />
      <AlertChecker />
    </body>
    </html>
  );
}
