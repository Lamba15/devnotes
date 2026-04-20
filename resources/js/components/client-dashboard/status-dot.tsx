export const issueStatusColors: Record<string, string> = {
    todo: '#f59e0b',
    in_progress: '#3b82f6',
    done: '#10b981',
};

export function StatusDot({ status }: { status: string }) {
    const color = issueStatusColors[status] ?? '#94a3b8';

    return (
        <span
            className="block size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
        />
    );
}
