import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
import { Providers } from "@/app/providers";
import { SITE_URL } from "@/lib/config";
import "./globals.css";

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Syne({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TravellersIn",
    template: "%s | TravellersIn",
  },
  description: "Social travel marketplace for collaborative plans and agency packages.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "TravellersIn",
    description: "Social travel marketplace for collaborative plans and agency packages.",
    siteName: "TravellersIn",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TravellersIn",
    description: "Social travel marketplace for collaborative plans and agency packages.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--color-surface)] text-[var(--color-ink-900)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
