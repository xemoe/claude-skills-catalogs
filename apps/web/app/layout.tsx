import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { LowPolyBackground } from "@/components/lowpoly-background";
import { Raleway, Noto_Sans_Thai } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n/context";
import { getServerI18n } from "@/lib/i18n/server";
import { THEME_COOKIE, DEFAULT_THEME, isTheme } from "@/lib/theme";
import { Providers } from "./providers";

const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway" });
const notoSansThai = Noto_Sans_Thai({
    subsets: ["thai"],
    variable: "--font-noto-thai",
});

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getServerI18n();
    return {
        title: t.meta.title,
        description: t.meta.description,
    };
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { locale } = await getServerI18n();
    const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
    const theme = isTheme(themeCookie) ? themeCookie : DEFAULT_THEME;

    return (
        <html
            lang={locale}
            suppressHydrationWarning
            className={cn(
                "font-sans",
                raleway.variable,
                notoSansThai.variable,
                theme === "dark" && "dark",
            )}
        >
            <body className="flex min-h-screen flex-col font-sans antialiased">
                <Providers>
                    <LowPolyBackground />
                    <LanguageProvider initialLocale={locale}>
                        <TooltipProvider>
                            <SiteHeader initialTheme={theme} />
                            <main className="container mx-auto w-full max-w-7xl flex-1 border-x bg-background px-4 py-8 dark:bg-background/74 dark:backdrop-blur">
                                {children}
                            </main>
                        </TooltipProvider>
                    </LanguageProvider>
                </Providers>
            </body>
        </html>
    );
}
