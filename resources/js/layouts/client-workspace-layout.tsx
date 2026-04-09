import { Link, usePage } from '@inertiajs/react';
import { DollarSign, FolderKanban, LayoutDashboard, LayoutGrid, ListChecks, Ticket, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

type ClientWorkspaceLayoutProps = PropsWithChildren<{
    title?: string;
    description?: string;
}>;

type ClientWorkspacePageProps = {
    auth: {
        user?: {
            capabilities?: {
                platform?: boolean;
            } | null;
        } | null;
    };
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: {
            id: number;
            name: string;
            slug: string;
        } | null;
    };
};

const sections = (clientId: number): Array<{ title: string; href: string; exact?: boolean; icon: LucideIcon }> => [
    { title: 'Overview', href: `/clients/${clientId}`, exact: true, icon: LayoutDashboard },
    { title: 'Members', href: `/clients/${clientId}/members`, icon: Users },
    { title: 'Projects', href: `/clients/${clientId}/projects`, icon: FolderKanban },
    { title: 'Issues', href: `/clients/${clientId}/issues`, icon: Ticket },
    { title: 'Boards', href: `/clients/${clientId}/boards`, icon: LayoutGrid },
    { title: 'Statuses', href: `/clients/${clientId}/statuses`, icon: ListChecks },
    { title: 'Finance', href: `/clients/${clientId}/finance`, icon: DollarSign },
];

export default function ClientWorkspaceLayout({
    title,
    description,
    children,
}: ClientWorkspaceLayoutProps) {
    const { auth, client } = usePage<ClientWorkspacePageProps>().props;
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();
    const canAccessPlatform = Boolean(auth.user?.capabilities?.platform);

    return (
        <AppLayout>
            <div className="flex flex-1 flex-col gap-0">
                <div className="border-b border-border bg-card px-6 py-5">
                    <h1 className="text-lg font-bold">
                        {title ?? 'Workspace'}
                    </h1>
                    <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                        <p>{description ?? 'Workspace with Nour'}</p>
                        <p>
                            {client.name}
                            {client.email ? ` · ${client.email}` : ''}
                            {client.behavior
                                ? ` · ${client.behavior.name}`
                                : ''}
                        </p>
                    </div>
                </div>

                {canAccessPlatform ? (
                    <div className="grid flex-1 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <aside className="border-b border-border bg-card p-4 lg:border-b-0 lg:border-r">
                            <nav className="space-y-1">
                                {sections(client.id).map((section) => {
                                    const active = section.exact
                                        ? isCurrentUrl(section.href)
                                        : isCurrentOrParentUrl(section.href);
                                    const Icon = section.icon;
                                    return (
                                        <Link
                                            key={section.title}
                                            href={section.href}
                                            className={cn(
                                                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
                                                active
                                                    ? 'bg-accent font-semibold text-accent-foreground shadow-[inset_3px_0_0_0_var(--primary)]'
                                                    : 'text-muted-foreground hover:bg-muted',
                                            )}
                                        >
                                            <Icon className="size-4 shrink-0" />
                                            {section.title}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </aside>

                        <div className="min-w-0 p-6">{children}</div>
                    </div>
                ) : (
                    <div className="min-w-0 p-6">{children}</div>
                )}
            </div>
        </AppLayout>
    );
}
