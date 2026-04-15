import { cn } from '@/lib/utils';

type FinanceProjectLabelProps = {
    project?: {
        name?: string | null;
        client?: { name?: string | null } | null;
    } | null;
    stacked?: boolean;
    className?: string;
};

export function FinanceProjectLabel({
    project,
    stacked = false,
    className,
}: FinanceProjectLabelProps) {
    const clientName = project?.client?.name?.trim() || null;
    const projectName = project?.name?.trim() || '—';

    if (!stacked) {
        return (
            <span className={className}>
                {clientName ? `${clientName} / ${projectName}` : projectName}
            </span>
        );
    }

    return (
        <div className={cn('space-y-1', className)}>
            {clientName ? (
                <p className="text-xs text-muted-foreground">{clientName}</p>
            ) : null}
            <p className="font-medium text-foreground">{projectName}</p>
        </div>
    );
}
