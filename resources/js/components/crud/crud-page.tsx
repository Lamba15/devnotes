import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { setCrudPageHeaderContent } from '@/components/crud/crud-page-header-slot';
import { useBackNavigation } from '@/hooks/use-back-navigation';

export function CrudPage({
    title,
    titleMeta,
    description,
    actions,
    children,
}: {
    title: string;
    titleMeta?: ReactNode;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
}) {
    const goBack = useBackNavigation();

    const headerContent = (
        <div className="flex min-w-0 items-center justify-between gap-6">
            <div className="flex min-w-0 items-center gap-3">
                {goBack ? (
                    <button
                        type="button"
                        onClick={goBack}
                        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="size-4" />
                    </button>
                ) : null}
                <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h1 className="min-w-0 truncate text-2xl font-bold tracking-tight">
                            {title}
                        </h1>
                        {titleMeta ? (
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                {titleMeta}
                            </div>
                        ) : null}
                    </div>
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

    useEffect(() => {
        setCrudPageHeaderContent(headerContent);

        return () => {
            setCrudPageHeaderContent(null);
        };
    }, [headerContent]);

    return <div className="flex flex-1 flex-col gap-6 p-6">{children}</div>;
}
