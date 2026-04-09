import type { ReactNode } from 'react';

export function FilterBar({
    children,
    meta,
}: {
    children: ReactNode;
    meta?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex-1">{children}</div>
            {meta ? (
                <div className="text-sm text-muted-foreground">{meta}</div>
            ) : null}
        </div>
    );
}
