import type { IssueAssignee } from '@/types/issue';
import { cn } from '@/lib/utils';

type Props = {
    users: IssueAssignee[];
    max?: number;
    size?: 'xs' | 'sm' | 'md';
    className?: string;
    emptyLabel?: string;
};

const sizeClass = {
    xs: 'size-5 text-[10px]',
    sm: 'size-6 text-xs',
    md: 'size-8 text-sm',
} as const;

export function AvatarStack({
    users,
    max = 3,
    size = 'sm',
    className,
    emptyLabel = 'Unassigned',
}: Props) {
    if (!users || users.length === 0) {
        return (
            <span className="text-xs text-muted-foreground">{emptyLabel}</span>
        );
    }

    const shown = users.slice(0, max);
    const extra = users.length - shown.length;

    return (
        <div className={cn('flex items-center -space-x-1.5', className)}>
            {shown.map((user) => (
                <div
                    key={user.id}
                    title={
                        user.is_main_owner
                            ? `${user.name} (default)`
                            : user.name
                    }
                    className={cn(
                        'relative inline-flex items-center justify-center rounded-full border-2 border-background bg-muted overflow-hidden',
                        sizeClass[size],
                    )}
                >
                    {user.avatar_path ? (
                        <img
                            src={`/storage/${user.avatar_path}`}
                            alt={user.name}
                            className="size-full object-cover"
                        />
                    ) : (
                        <span className="font-medium text-muted-foreground">
                            {user.name.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>
            ))}
            {extra > 0 ? (
                <div
                    className={cn(
                        'relative inline-flex items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-muted-foreground',
                        sizeClass[size],
                    )}
                    title={users
                        .slice(max)
                        .map((u) => u.name)
                        .join(', ')}
                >
                    +{extra}
                </div>
            ) : null}
        </div>
    );
}
