import Link from "next/link";
import {
    BookOpen,
    Compass,
    FolderTree,
    HelpCircle,
    Lightbulb,
    Sparkles,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { InlineCode } from "@/components/inline-code";
import { Markdown } from "@/components/markdown";
import { getServerI18n } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

const SECTIONS = [
    { id: "concepts", icon: Lightbulb, key: "concepts" },
    { id: "locations", icon: FolderTree, key: "locations" },
    { id: "catalog-tour", icon: Compass, key: "catalogTour" },
    { id: "examples", icon: Sparkles, key: "examples" },
    { id: "faq", icon: HelpCircle, key: "faq" },
] as const;

function TableOfContents({ t }: { t: Dictionary }) {
    return (
        <nav
            aria-label={t.usecasePage.tocTitle}
            className="rounded-sm border bg-secondary/20 p-4"
        >
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                {t.usecasePage.tocTitle}
            </div>
            <ol className="space-y-1 text-sm">
                {SECTIONS.map(({ id, icon: Icon, key }, i) => (
                    <li key={id}>
                        <a
                            href={`#${id}`}
                            className="flex items-center gap-2 rounded-none px-2 py-1 hover:bg-accent hover:text-foreground"
                        >
                            <span className="text-muted-foreground tabular-nums">
                                {i + 1}.
                            </span>
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{t.usecasePage.toc[key]}</span>
                        </a>
                    </li>
                ))}
            </ol>
        </nav>
    );
}

function CodeSample({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-none border bg-secondary/40">
            <div className="flex items-center justify-between border-b bg-secondary/60 px-3 py-1.5">
                <span className="font-mono text-xs text-muted-foreground">
                    {label}
                </span>
                <CopyButton value={value} size="icon-xs" />
            </div>
            <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
                <code>{value}</code>
            </pre>
        </div>
    );
}

function SectionHeading({
    id,
    Icon,
    children,
}: {
    id: string;
    Icon: typeof Lightbulb;
    children: React.ReactNode;
}) {
    return (
        <h2
            id={id}
            className="scroll-mt-24 flex items-center gap-2 text-xl font-bold tracking-tight"
        >
            <Icon className="h-5 w-5 text-muted-foreground" />
            {children}
        </h2>
    );
}

export default async function UsecasePage() {
    const { t } = await getServerI18n();
    const u = t.usecasePage;

    return (
        <div className="space-y-6 px-5 py-0">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{u.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{u.subtitle}</p>
            </div>

            <div className="grid items-start gap-6 md:grid-cols-[1fr_240px] md:[grid-template-areas:'main_toc']">
                <div className="space-y-10 md:[grid-area:main] min-w-0">
                    <section className="space-y-3">
                        <SectionHeading id="concepts" Icon={Lightbulb}>
                            {u.concepts.heading}
                        </SectionHeading>
                        <Markdown content={u.concepts.body} />
                    </section>

                    <section className="space-y-3">
                        <SectionHeading id="locations" Icon={FolderTree}>
                            {u.locations.heading}
                        </SectionHeading>
                        <Markdown content={u.locations.body} />
                    </section>

                    <section className="space-y-3">
                        <SectionHeading id="catalog-tour" Icon={Compass}>
                            {u.catalogTour.heading}
                        </SectionHeading>
                        <Markdown content={u.catalogTour.body} />
                    </section>

                    <section className="space-y-4">
                        <SectionHeading id="examples" Icon={Sparkles}>
                            {u.examples.heading}
                        </SectionHeading>
                        <p className="text-sm text-muted-foreground">
                            {u.examples.intro}
                        </p>

                        <Card className="rounded-sm">
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {u.examples.installVendor.heading}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Markdown content={u.examples.installVendor.body} />
                                <div className="flex items-start gap-2">
                                    <code className="min-w-0 flex-1 break-all rounded-none bg-secondary p-2 font-mono text-xs">
                                        {u.examples.installVendor.listInvocation}
                                    </code>
                                    <CopyButton
                                        value={u.examples.installVendor.listInvocation}
                                    />
                                </div>
                                <div className="flex items-start gap-2">
                                    <code className="min-w-0 flex-1 break-all rounded-none bg-secondary p-2 font-mono text-xs">
                                        {u.examples.installVendor.installInvocation}
                                    </code>
                                    <CopyButton
                                        value={u.examples.installVendor.installInvocation}
                                    />
                                </div>
                                <Markdown content={u.examples.installVendor.after} />
                            </CardContent>
                        </Card>

                        <Card className="rounded-sm">
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {u.examples.authorSkill.heading}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Markdown content={u.examples.authorSkill.body} />
                                <CodeSample
                                    label={u.examples.authorSkill.sampleLabel}
                                    value={u.examples.authorSkill.sample}
                                />
                                <Markdown content={u.examples.authorSkill.after} />
                            </CardContent>
                        </Card>

                        <Card className="rounded-sm">
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {u.examples.authorCommand.heading}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Markdown content={u.examples.authorCommand.body} />
                                <CodeSample
                                    label={u.examples.authorCommand.sampleLabel}
                                    value={u.examples.authorCommand.sample}
                                />
                                <Markdown content={u.examples.authorCommand.after} />
                            </CardContent>
                        </Card>

                        <Card className="rounded-sm">
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {u.examples.discover.heading}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Markdown content={u.examples.discover.body} />
                                <p className="text-xs text-muted-foreground">
                                    <Link
                                        href="/sources"
                                        className="underline underline-offset-2 hover:text-foreground"
                                    >
                                        {t.sources.title}
                                    </Link>{" "}
                                    ·{" "}
                                    <InlineCode>vendor/</InlineCode>
                                </p>
                            </CardContent>
                        </Card>
                    </section>

                    <section className="space-y-3">
                        <SectionHeading id="faq" Icon={HelpCircle}>
                            {u.faq.heading}
                        </SectionHeading>
                        <div className="divide-y rounded-none border">
                            {u.faq.items.map((item, i) => (
                                <details
                                    key={i}
                                    className="group px-4 py-3 [&_summary::-webkit-details-marker]:hidden"
                                >
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                                        <span>{item.q}</span>
                                        <span
                                            aria-hidden
                                            className="shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                                        >
                                            ›
                                        </span>
                                    </summary>
                                    <div className="mt-2">
                                        <Markdown content={item.a} />
                                    </div>
                                </details>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="md:[grid-area:toc] md:sticky md:top-20">
                    <TableOfContents t={t} />
                </aside>
            </div>
        </div>
    );
}
