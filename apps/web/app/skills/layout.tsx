import type { ReactNode } from "react";
import { scanSkills } from "@lector/core/scanner";
import { SkillSidebar } from "@/components/skill-sidebar";

export const dynamic = "force-dynamic";

export default function SkillsLayout({ children }: { children: ReactNode }) {
    const { skills } = scanSkills();

    return (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <SkillSidebar skills={skills} />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}
