import { AlertCircle, Calendar, CalendarClock, Clock } from 'lucide-react';
import { formatDateOnly } from '@/lib/datetime';
import { cn } from '@/lib/utils';

type Urgency = 'overdue' | 'today' | 'soon' | 'future';

function todayYmd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${y}-${m}-${day}`;
}

function classifyDueDate(value: string): Urgency {
    const today = todayYmd();

    if (value < today) {
        return 'overdue';
    }

    if (value === today) {
        return 'today';
    }

    // within 3 days → soon
    const todayDate = new Date(today + 'T00:00:00');
    const dueDate = new Date(value + 'T00:00:00');
    const diffMs = dueDate.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffMs / 86_400_000);

    if (diffDays <= 3) {
        return 'soon';
    }

    return 'future';
}

const urgencyStyles: Record<
    Urgency,
    { className: string; icon: React.ComponentType<{ className?: string }> }
> = {
    overdue: {
        className:
            'border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
        icon: AlertCircle,
    },
    today: {
        className:
            'border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        icon: Clock,
    },
    soon: {
        className:
            'border border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300',
        icon: CalendarClock,
    },
    future: {
        className: 'border border-border/60 text-muted-foreground',
        icon: Calendar,
    },
};

export function IssueDueDate({
    value,
    className,
}: {
    value: string | null | undefined;
    className?: string;
}) {
    if (!value) {
        return null;
    }

    const urgency = classifyDueDate(value);
    const { className: tone, icon: Icon } = urgencyStyles[urgency];

    const label =
        urgency === 'overdue'
            ? `Overdue · ${formatDateOnly(value)}`
            : urgency === 'today'
              ? 'Due today'
              : formatDateOnly(value);

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                tone,
                className,
            )}
            title={`Due ${formatDateOnly(value)}`}
        >
            <Icon className="size-3.5" />
            {label}
        </span>
    );
}
