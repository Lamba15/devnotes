import { Head, Link, router, useForm } from '@inertiajs/react';
import { GripVertical, Pencil, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';
import { cn } from '@/lib/utils';

type Issue = {
    id: number;
    title: string;
    status: string;
    priority: string;
    type: string;
};

type Column = {
    id: number;
    name: string;
    position: number;
    updates_status: boolean;
    mapped_status: string | null;
    issues_count: number;
    issues: Issue[];
};

type BoardContextResult = {
    type: 'board_context';
    board: {
        id: number;
        name: string;
    };
    backlog: Issue[];
    columns: Array<{
        id: number;
        name: string;
        position?: number;
        updates_status?: boolean;
        mapped_status?: string | null;
        issues: Issue[];
    }>;
};

const PRIORITY_COLORS: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-700 dark:text-red-400',
    high: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
    medium: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
    low: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
};

const TYPE_COLORS: Record<string, string> = {
    bug: 'bg-red-500/15 text-red-700 dark:text-red-400',
    feature: 'bg-green-500/15 text-green-700 dark:text-green-400',
    task: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    improvement: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
};

export default function BoardShow({
    client,
    project,
    board,
    backlog,
    columns,
    can_move_issues,
    can_manage_board,
    status_options,
}: {
    client: { id: number; name: string };
    project: { id: number; name: string };
    board: { id: number; name: string; columns_count: number };
    backlog: Issue[];
    columns: Column[];
    can_move_issues: boolean;
    can_manage_board: boolean;
    status_options: string[];
}) {
    const [movingIssueId, setMovingIssueId] = useState<number | null>(null);
    const [boardColumns, setBoardColumns] = useState(columns);
    const [backlogIssues, setBacklogIssues] = useState(backlog);
    const [draggingIssue, setDraggingIssue] = useState<{
        issueId: number;
        fromColumnId: number | null;
    } | null>(null);
    const [activeDropTarget, setActiveDropTarget] = useState<{
        columnId: number | null;
        position: number;
    } | null>(null);
    const [showAddColumn, setShowAddColumn] = useState(false);
    const columnForm = useForm({
        name: '',
        updates_status: false,
        mapped_status: status_options[0] ?? 'todo',
    });

    useEffect(() => {
        setBoardColumns(columns);
    }, [columns]);

    useEffect(() => {
        setBacklogIssues(backlog);
    }, [backlog]);

    useEffect(() => {
        const handleAssistantBoardSync = (event: Event) => {
            const syncEvent = event as CustomEvent<BoardContextResult>;
            const payload = syncEvent.detail;

            if (
                !payload ||
                payload.type !== 'board_context' ||
                payload.board.id !== board.id
            ) {
                return;
            }

            setBacklogIssues(payload.backlog);
            setBoardColumns(
                payload.columns.map((column) => ({
                    id: column.id,
                    name: column.name,
                    position: column.position ?? 0,
                    updates_status: column.updates_status ?? false,
                    mapped_status: column.mapped_status ?? null,
                    issues: column.issues,
                    issues_count: column.issues.length,
                })),
            );
            setMovingIssueId(null);
            setDraggingIssue(null);
            setActiveDropTarget(null);
        };

        window.addEventListener(
            'assistant:board-sync',
            handleAssistantBoardSync,
        );

        return () => {
            window.removeEventListener(
                'assistant:board-sync',
                handleAssistantBoardSync,
            );
        };
    }, [board.id]);

    const moveIssue = (
        issueId: number,
        columnId: number | null,
        position?: number,
        sourceColumnId?: number | null,
    ) => {
        setMovingIssueId(issueId);

        if (sourceColumnId !== undefined) {
            applyOptimisticMove(issueId, sourceColumnId, columnId, position);
        }

        router.post(
            `/boards/${board.id}/issues/move`,
            {
                issue_id: issueId,
                column_id: columnId,
                position,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setMovingIssueId(null);
                    setDraggingIssue(null);
                    setActiveDropTarget(null);
                },
            },
        );
    };

    const applyOptimisticMove = (
        issueId: number,
        fromColumnId: number | null,
        toColumnId: number | null,
        position?: number,
    ) => {
        const sourceIssues =
            fromColumnId === null
                ? backlogIssues
                : (boardColumns.find((column) => column.id === fromColumnId)
                      ?.issues ?? []);
        const issue = sourceIssues.find((item) => item.id === issueId);

        if (!issue) {
            return;
        }

        const cleanedBacklog = backlogIssues.filter(
            (item) => item.id !== issueId,
        );
        const cleanedColumns = boardColumns.map((column) => ({
            ...column,
            issues: column.issues.filter((item) => item.id !== issueId),
            issues_count: column.issues.filter((item) => item.id !== issueId)
                .length,
        }));

        if (toColumnId === null) {
            const nextBacklog = [...cleanedBacklog];
            const insertionIndex = Math.max(
                0,
                Math.min(
                    (position ?? nextBacklog.length + 1) - 1,
                    nextBacklog.length,
                ),
            );
            nextBacklog.splice(insertionIndex, 0, issue);
            setBacklogIssues(nextBacklog);
            setBoardColumns(cleanedColumns);

            return;
        }

        setBacklogIssues(cleanedBacklog);
        setBoardColumns(
            cleanedColumns.map((column) => {
                if (column.id !== toColumnId) {
                    return column;
                }

                const nextIssues = [...column.issues];
                const insertionIndex = Math.max(
                    0,
                    Math.min(
                        (position ?? nextIssues.length + 1) - 1,
                        nextIssues.length,
                    ),
                );
                nextIssues.splice(insertionIndex, 0, issue);

                return {
                    ...column,
                    issues: nextIssues,
                    issues_count: nextIssues.length,
                };
            }),
        );
    };

    const submitColumn = () => {
        columnForm.transform((data) => ({
            name: data.name.trim(),
            updates_status: data.updates_status,
            mapped_status: data.updates_status ? data.mapped_status : null,
        }));
        columnForm.post(`/clients/${client.id}/boards/${board.id}/columns`, {
            preserveScroll: true,
            onSuccess: () => {
                columnForm.reset('name', 'updates_status', 'mapped_status');
                setShowAddColumn(false);
            },
        });
    };

    const allLanes = [
        {
            id: null as number | null,
            name: 'Backlog',
            issues: backlogIssues,
            issues_count: backlogIssues.length,
            mapped_status: null as string | null,
            updates_status: false,
        },
        ...boardColumns.map((col) => ({
            id: col.id as number | null,
            name: col.name,
            issues: col.issues,
            issues_count: col.issues_count,
            mapped_status: col.mapped_status,
            updates_status: col.updates_status,
        })),
    ];

    return (
        <>
            <Head title={board.name} />
            <CrudPage
                title={board.name}
                description={`${client.name} / ${project.name}`}
                actions={
                    <div className="flex items-center gap-2">
                        {can_manage_board ? (
                            <Link
                                href={`/clients/${client.id}/projects/${project.id}/issues/create`}
                            >
                                <Button size="sm">
                                    <Plus className="size-4" />
                                    New issue
                                </Button>
                            </Link>
                        ) : null}
                        {can_manage_board ? (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowAddColumn(true)}
                            >
                                <Plus className="size-4" />
                                Add column
                            </Button>
                        ) : null}
                        {can_manage_board ? (
                            <Link
                                href={`/clients/${client.id}/boards/${board.id}/edit`}
                            >
                                <Button size="sm" variant="ghost">
                                    <Pencil className="mr-1.5 size-3.5" />
                                    Edit board
                                </Button>
                            </Link>
                        ) : null}
                    </div>
                }
            >
                {/* Inline add-column form */}
                {showAddColumn ? (
                    <div className="rounded-xl bg-card p-4 shadow-sm">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="grid min-w-48 gap-1.5">
                                <Label htmlFor="column-name" className="text-xs">
                                    Column name
                                </Label>
                                <Input
                                    id="column-name"
                                    value={columnForm.data.name}
                                    onChange={(event) =>
                                        columnForm.setData(
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. In Progress"
                                    className="h-8"
                                />
                                {columnForm.errors.name ? (
                                    <p className="text-xs text-destructive">
                                        {columnForm.errors.name}
                                    </p>
                                ) : null}
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={columnForm.data.updates_status}
                                    onCheckedChange={(checked) =>
                                        columnForm.setData(
                                            'updates_status',
                                            checked === true,
                                        )
                                    }
                                />
                                <Label className="text-xs">
                                    Updates status
                                </Label>
                            </div>

                            {columnForm.data.updates_status ? (
                                <div className="grid min-w-36 gap-1.5">
                                    <Label className="text-xs">
                                        Mapped status
                                    </Label>
                                    <Select
                                        value={columnForm.data.mapped_status}
                                        onValueChange={(value) =>
                                            columnForm.setData(
                                                'mapped_status',
                                                value,
                                            )
                                        }
                                    >
                                        <SelectTrigger className="h-8 w-full">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {status_options.map((status) => (
                                                <SelectItem
                                                    key={status}
                                                    value={status}
                                                >
                                                    {status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : null}

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={columnForm.processing}
                                    onClick={submitColumn}
                                >
                                    <Plus className="mr-1 size-3.5" />
                                    Create
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowAddColumn(false)}
                                >
                                    <X className="mr-1 size-3.5" />
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Board swim lanes */}
                <div className="flex overflow-x-auto pb-4 -mx-6 px-6">
                    {allLanes.map((lane, laneIndex) => (
                        <div
                            key={lane.id ?? 'backlog'}
                            className={cn(
                                'flex w-64 min-w-[256px] shrink-0 flex-col',
                                laneIndex > 0 && 'border-l border-border',
                            )}
                            onDragOver={(event) => event.preventDefault()}
                            onDragEnter={(event) => {
                                event.preventDefault();
                                if (draggingIssue) {
                                    setActiveDropTarget({
                                        columnId: lane.id,
                                        position: lane.issues.length + 1,
                                    });
                                }
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                if (draggingIssue) {
                                    moveIssue(
                                        draggingIssue.issueId,
                                        lane.id,
                                        activeDropTarget?.columnId === lane.id
                                            ? activeDropTarget.position
                                            : lane.issues.length + 1,
                                        draggingIssue.fromColumnId,
                                    );
                                }
                            }}
                        >
                            {/* Column header */}
                            <div className="sticky top-0 z-10 flex items-center gap-2 bg-background px-3 py-2.5">
                                <h3 className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {lane.name}
                                </h3>
                                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    {lane.issues_count}
                                </span>
                            </div>

                            {/* Column body */}
                            <div
                                className={cn(
                                    'flex min-h-[200px] flex-1 flex-col gap-1.5 p-2 transition-colors',
                                    activeDropTarget?.columnId === lane.id &&
                                        draggingIssue !== null &&
                                        'bg-primary/5',
                                )}
                            >
                                {lane.issues.length === 0 ? (
                                    <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                                        {lane.id === null
                                            ? 'No backlog issues'
                                            : 'Drop issues here'}
                                    </p>
                                ) : (
                                    lane.issues.map((issue, index) => (
                                        <div key={issue.id}>
                                            {index > 0 &&
                                            draggingIssue !== null ? (
                                                <DropZone
                                                    active={
                                                        activeDropTarget?.columnId ===
                                                            lane.id &&
                                                        activeDropTarget?.position ===
                                                            index + 1
                                                    }
                                                    onDragEnter={() =>
                                                        setActiveDropTarget({
                                                            columnId: lane.id,
                                                            position: index + 1,
                                                        })
                                                    }
                                                    onDrop={() => {
                                                        if (!draggingIssue)
                                                            return;
                                                        moveIssue(
                                                            draggingIssue.issueId,
                                                            lane.id,
                                                            index + 1,
                                                            draggingIssue.fromColumnId,
                                                        );
                                                    }}
                                                />
                                            ) : null}
                                            <IssueCard
                                                issue={issue}
                                                href={`/clients/${client.id}/projects/${project.id}/issues/${issue.id}`}
                                                canMove={can_move_issues}
                                                isMoving={
                                                    movingIssueId === issue.id
                                                }
                                                isDragging={
                                                    draggingIssue?.issueId ===
                                                    issue.id
                                                }
                                                onDragStart={() =>
                                                    setDraggingIssue({
                                                        issueId: issue.id,
                                                        fromColumnId: lane.id,
                                                    })
                                                }
                                                onDragEnd={() => {
                                                    setDraggingIssue(null);
                                                    setActiveDropTarget(null);
                                                }}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CrudPage>
        </>
    );
}

function IssueCard({
    issue,
    href,
    canMove = false,
    isMoving = false,
    isDragging = false,
    onDragStart,
    onDragEnd,
}: {
    issue: Issue;
    href: string;
    canMove?: boolean;
    isMoving?: boolean;
    isDragging?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}) {
    const priorityClass =
        PRIORITY_COLORS[issue.priority] ??
        'bg-muted text-muted-foreground';
    const typeClass =
        TYPE_COLORS[issue.type] ?? 'bg-muted text-muted-foreground';

    return (
        <div
            draggable={canMove}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={cn(
                'group rounded-lg bg-card p-2.5 shadow-sm transition-all hover:shadow-md',
                canMove && 'cursor-grab active:cursor-grabbing',
                isDragging && 'scale-[0.97] opacity-50',
                isMoving && 'opacity-60',
            )}
        >
            <div className="flex items-start gap-2">
                {canMove ? (
                    <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition group-hover:opacity-100" />
                ) : null}
                <div className="min-w-0 flex-1">
                    <Link
                        href={href}
                        className="block text-sm font-medium leading-snug text-foreground hover:text-primary"
                    >
                        {issue.title}
                    </Link>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                        <span
                            className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                                priorityClass,
                            )}
                        >
                            {issue.priority}
                        </span>
                        <span
                            className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                                typeClass,
                            )}
                        >
                            {issue.type}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DropZone({
    active,
    onDragEnter,
    onDrop,
}: {
    active: boolean;
    onDragEnter: () => void;
    onDrop: () => void;
}) {
    return (
        <div
            onDragOver={(event) => event.preventDefault()}
            onDragEnter={(event) => {
                event.preventDefault();
                onDragEnter();
            }}
            onDrop={(event) => {
                event.preventDefault();
                onDrop();
            }}
            className={cn(
                'mx-1 h-1 rounded-full transition-all',
                active
                    ? 'h-1.5 bg-primary'
                    : 'bg-transparent',
            )}
        />
    );
}

BoardShow.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
