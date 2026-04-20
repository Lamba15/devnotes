import { cn } from '@/lib/utils';

export const issuePriorityColors: Record<string, string> = {
    low: '#94a3b8',
    medium: '#f59e0b',
    high: '#ef4444',
};

export function PriorityBadge({ priority }: { priority: string }) {
    const toneClasses: Record<string, string> = {
        low: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400',
        medium: 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300',
        high: 'border-red-200 bg-red-100 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300',
    };

    return (
        <span
            className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
                toneClasses[priority] ?? toneClasses.low,
            )}
        >
            {priority}
        </span>
    );
}
