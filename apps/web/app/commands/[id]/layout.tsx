import type { ReactNode } from "react";
import { scanCommands } from "@lector/core/command-scanner";
import { CommandSidebar } from "@/components/command-sidebar";

export const dynamic = "force-dynamic";

export default function CommandDetailLayout({
    children,
}: {
    children: ReactNode;
}) {
    const { commands } = scanCommands();

    return (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <CommandSidebar commands={commands} />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}
