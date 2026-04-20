import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AlertIndicator({
    icon: Icon,
    label,
    count,
    tone,
    href,
}: {
    icon: LucideIcon;
    label: string;
    count: number;
    tone: 'red' | 'amber' | 'slate';
    href: string;
}) {
    const active = count > 0;

    const bg = {
        red: active
            ? 'border-red-200/70 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20'
            : 'border-border/40 bg-muted/10',
        amber: active
            ? 'border-amber-200/70 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20'
            : 'border-border/40 bg-muted/10',
        slate: 'border-border/40 bg-muted/10',
    };

    const iconColor = {
        red: active
            ? 'text-red-600 dark:text-red-400'
            : 'text-muted-foreground/50',
        amber: active
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-muted-foreground/50',
        slate: 'text-muted-foreground/50',
    };

    const countColor = {
        red: active
            ? 'text-red-700 dark:text-red-300'
            : 'text-muted-foreground/60',
        amber: active
            ? 'text-amber-700 dark:text-amber-300'
            : 'text-muted-foreground/60',
        slate: active ? 'text-foreground' : 'text-muted-foreground/60',
    };

    return (
        <Link
            href={href}
            className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/30',
                bg[tone],
            )}
        >
            <Icon className={cn('size-4 shrink-0', iconColor[tone])} />
            <span
                className={cn(
                    'text-sm',
                    active ? 'text-foreground' : 'text-muted-foreground/60',
                )}
            >
                {label}
            </span>
            <span
                className={cn(
                    'ml-auto text-lg font-bold tabular-nums',
                    countColor[tone],
                )}
            >
                {count}
            </span>
        </Link>
    );
}
