import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useCrudPageHeaderSlot } from '@/components/crud/crud-page-header-slot';

export function CrudPage({
    title,
    description,
    actions,
    onBack,
    children,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
    onBack?: () => void;
    children: ReactNode;
}) {
    const headerSlot = useCrudPageHeaderSlot();

    const headerContent = (
        <div className="flex min-w-0 items-center justify-between gap-6">
            <div className="flex min-w-0 items-center gap-3">
                {onBack ? (
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        style={{ cursor: 'pointer' }}
                        aria-label="Go back"
                    >
                        <ArrowLeft className="size-4" />
                    </button>
                ) : null}
                <div className="min-w-0">
                    <h1 className="truncate text-2xl font-bold tracking-tight">
                        {title}
                    </h1>
                    {description ? (
                        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
    );

    return (
        <div className="flex flex-1 flex-col gap-6 p-6">
            {headerSlot ? createPortal(headerContent, headerSlot) : null}
            {children}
        </div>
    );
}
