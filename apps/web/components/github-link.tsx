"use client";

import * as React from "react"
import Link from "next/link"

import {siteConfig} from "@/lib/config"
import {Icons} from "@/components/icons"
import {Button} from "@/components/ui/button";
// import {Skeleton} from "@/components/ui/skeleton";

export function GitHubLink() {
    return (
        <Button asChild size="sm" variant="ghost" className="h-8 shadow-none">
            <Link href={siteConfig.links.github} target="_blank" rel="noreferrer">
                <Icons.gitHub/>
            </Link>
        </Button>
    )
}

// export async function StarsCount() {
//     const data = await fetch("https://api.github.com/repos/xemoe/skills-lector", {
//         next: {revalidate: 86400},
//     })
//
//     const json = await data.json()
//     const formattedCount =
//         json.stargazers_count >= 1000
//             ? `${Math.round(json.stargazers_count / 1000)}k`
//             : json.stargazers_count?.toLocaleString()
//
//     return (
//         <span className="w-fit text-xs text-muted-foreground tabular-nums">{formattedCount}</span>
//     )
// }
