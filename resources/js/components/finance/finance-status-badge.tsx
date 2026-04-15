import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type FinanceStatusBadgeProps = {
    status?: string | null;
    className?: string;
};

const statusToneClasses: Record<string, string> = {
    draft: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300',
    pending:
        'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300',
    sent: 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300',
    paid: 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300',
    overdue:
        'border-red-200 bg-red-100 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300',
};

export function FinanceStatusBadge({
    status,
    className,
}: FinanceStatusBadgeProps) {
    const normalizedStatus = status?.trim().toLowerCase() || 'draft';
    const label = normalizedStatus
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

    return (
        <Badge
            variant="outline"
            className={cn(
                'rounded-full px-2.5 py-1 font-semibold capitalize',
                statusToneClasses[normalizedStatus] ?? statusToneClasses.draft,
                className,
            )}
        >
            {label}
        </Badge>
    );
}
