import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Claude Skills Catalog",
  description: "Browse and inspect deployed Claude Skills on this machine.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <SiteHeader />
        <main className="container mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
