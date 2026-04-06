import type { ReactNode } from 'react';

export function CrudPage({
    title,
    description,
    actions,
    children,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-1 flex-col gap-6 p-4">
            <section className="flex items-start justify-between gap-4 rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                <div>
                    <h1 className="text-xl font-semibold">{title}</h1>
                    {description ? (
                        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    ) : null}
                </div>
                {actions ? <div className="shrink-0">{actions}</div> : null}
            </section>
            {children}
        </div>
    );
}
