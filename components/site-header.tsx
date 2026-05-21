import Link from "next/link";
import { Boxes } from "lucide-react";
import { MainNav } from "@/components/main-nav";
import { RescanButton } from "@/components/rescan-button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Boxes className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">Claude Skills Catalog</span>
        </Link>
        <MainNav />
        <div className="ml-auto">
          <RescanButton />
        </div>
      </div>
    </header>
  );
}
