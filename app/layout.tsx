import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { Raleway } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway" });

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
    <html lang="en" suppressHydrationWarning className={cn("font-sans", raleway.variable)}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <TooltipProvider>
          <SiteHeader />
          <main className="container mx-auto max-w-7xl px-4 py-8">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}
