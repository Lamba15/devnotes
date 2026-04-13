import type {
    CollisionDetection,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
} from '@dnd-kit/core';
import {
    closestCorners,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    pointerWithin,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    defaultAnimateLayoutChanges,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Archive,
    ChevronDown,
    ChevronUp,
    GripVertical,
    Image as ImageIcon,
    Pencil,
    Paperclip,
    Plus,
    Users,
    X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import type { SharedDiscussionComment } from '@/components/issues/issue-discussion-comment';
import { IssueQuickViewDialog } from '@/components/issues/issue-quick-view-dialog';
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
import { formatDetailedTimestamp } from '@/lib/datetime';
import { cn, stripHtml } from '@/lib/utils';

type Issue = {
    id: number;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    type: string;
    assignee_id?: number | null;
    assignee?: {
        id: number;
        name: string;
        avatar_path?: string | null;
    } | null;
    due_date?: string | null;
    estimated_hours?: string | null;
    label?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    attachment_count?: number;
    image_count?: number;
    file_count?: number;
    preview_image_url?: string | null;
    comments_count?: number;
    attachments?: Array<{
        id?: number;
        file_name: string;
        file_path?: string | null;
        mime_type: string;
        file_size: number;
        url?: string | null;
        is_image?: boolean;
    }>;
    comments?: SharedDiscussionComment[];
    can_comment?: boolean;
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

type Lane = {
    id: number;
    name: string;
    issues: Issue[];
    issues_count: number;
    mapped_status: string | null;
    updates_status: boolean;
};

type BoardData = {
    backlogIssues: Issue[];
    boardColumns: Column[];
};

type IssueLocation = {
    columnId: number | null;
    index: number;
};

type DragDestination = {
    columnId: number | null;
    index: number;
};

type DragState = {
    activeIssueId: number;
    source: IssueLocation;
    over: DragDestination;
    overlayWidth: number | null;
    overlayHeight: number | null;
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

const BACKLOG_LANE_ID = 'lane-backlog';
const ISSUE_CARD_CLASS =
    'group w-full rounded-xl bg-card p-3.5 shadow-sm transition-[transform,opacity,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-md';

function getLaneId(columnId: number | null) {
    return columnId === null ? BACKLOG_LANE_ID : `lane-${columnId}`;
}

function getIssueId(issueId: number) {
    return `issue-${issueId}`;
}

function buildLanes(boardColumns: Column[]): Lane[] {
    return boardColumns.map((column) => ({
        id: column.id,
        name: column.name,
        issues: column.issues,
        issues_count: column.issues_count,
        mapped_status: column.mapped_status,
        updates_status: column.updates_status,
    }));
}

function findIssueLocation(
    issueId: number,
    backlogIssues: Issue[],
    boardColumns: Column[],
): IssueLocation | null {
    const backlogIndex = backlogIssues.findIndex(
        (issue) => issue.id === issueId,
    );

    if (backlogIndex >= 0) {
        return { columnId: null, index: backlogIndex };
    }

    for (const column of boardColumns) {
        const index = column.issues.findIndex((issue) => issue.id === issueId);

        if (index >= 0) {
            return { columnId: column.id, index };
        }
    }

    return null;
}

function areSameIssueLocations(
    left: IssueLocation | DragDestination,
    right: IssueLocation | DragDestination,
) {
    return left.columnId === right.columnId && left.index === right.index;
}

function moveIssueInBoardData(
    issueId: number,
    columnId: number | null,
    position: number,
    boardData: BoardData,
): BoardData | null {
    const source = findIssueLocation(
        issueId,
        boardData.backlogIssues,
        boardData.boardColumns,
    );

    if (!source) {
        return null;
    }

    const sourceIssues =
        source.columnId === null
            ? boardData.backlogIssues
            : (boardData.boardColumns.find(
                  (item) => item.id === source.columnId,
              )?.issues ?? []);
    const issue = sourceIssues[source.index];

    if (!issue) {
        return null;
    }

    const nextBacklog = boardData.backlogIssues.filter(
        (item) => item.id !== issueId,
    );
    const nextColumns = boardData.boardColumns.map((column) => {
        const issues = column.issues.filter((item) => item.id !== issueId);

        return {
            ...column,
            issues,
            issues_count: issues.length,
        };
    });

    if (columnId === null) {
        const insertionIndex = Math.max(
            0,
            Math.min(position - 1, nextBacklog.length),
        );
        const updatedBacklog = [...nextBacklog];

        updatedBacklog.splice(insertionIndex, 0, issue);

        return {
            backlogIssues: updatedBacklog,
            boardColumns: nextColumns,
        };
    }

    const targetColumn = nextColumns.find((item) => item.id === columnId);

    if (!targetColumn) {
        return null;
    }

    const insertionIndex = Math.max(
        0,
        Math.min(position - 1, targetColumn.issues.length),
    );
    const updatedIssues = [...targetColumn.issues];

    updatedIssues.splice(insertionIndex, 0, issue);
    targetColumn.issues = updatedIssues;
    targetColumn.issues_count = updatedIssues.length;

    return {
        backlogIssues: nextBacklog,
        boardColumns: nextColumns,
    };
}

export default function BoardShow({
    client,
    project,
    board,
    backlog,
    columns,
    can_move_issues,
    can_create_issues,
    can_manage_board,
    status_options,
}: {
    client: { id: number; name: string };
    project: { id: number; name: string };
    board: { id: number; name: string; columns_count: number };
    backlog: Issue[];
    columns: Column[];
    can_move_issues: boolean;
    can_create_issues: boolean;
    can_manage_board: boolean;
    status_options: string[];
}) {
    const [movingIssueId, setMovingIssueId] = useState<number | null>(null);
    const [boardDataOverride, setBoardDataOverride] =
        useState<BoardData | null>(null);
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [quickViewIssueId, setQuickViewIssueId] = useState<number | null>(
        null,
    );
    const [isBacklogOpen, setIsBacklogOpen] = useState(false);
    const [showAddColumn, setShowAddColumn] = useState(false);
    const issueElementRefs = useRef(new Map<number, HTMLDivElement>());
    const backlogToggleRef = useRef<HTMLButtonElement>(null);
    const lastOverIdRef = useRef<string | null>(null);
    const pendingBoardDataRef = useRef<BoardData | null>(null);
    const columnForm = useForm({
        name: '',
        updates_status: false,
        mapped_status: status_options[0] ?? 'todo',
    });
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 6,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );
    const boardColumns = boardDataOverride?.boardColumns ?? columns;
    const backlogIssues = boardDataOverride?.backlogIssues ?? backlog;
    const allLanes = buildLanes(boardColumns);
    const quickViewIssue =
        [
            ...backlogIssues,
            ...boardColumns.flatMap((column) => column.issues),
        ].find((issue) => issue.id === quickViewIssueId) ?? null;
    const activeIssue = dragState
        ? ([...backlogIssues, ...allLanes.flatMap((lane) => lane.issues)].find(
              (issue) => issue.id === dragState.activeIssueId,
          ) ?? null)
        : null;

    const closeBacklogDrawer = (restoreFocus = false) => {
        setIsBacklogOpen(false);

        if (!restoreFocus) {
            return;
        }

        requestAnimationFrame(() => {
            backlogToggleRef.current?.focus();
        });
    };

    const setIssueElementRef = (
        issueId: number,
        node: HTMLDivElement | null,
    ) => {
        if (node) {
            issueElementRefs.current.set(issueId, node);

            return;
        }

        issueElementRefs.current.delete(issueId);
    };

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

            setBoardDataOverride({
                backlogIssues: payload.backlog,
                boardColumns: payload.columns.map((column) => ({
                    id: column.id,
                    name: column.name,
                    position: column.position ?? 0,
                    updates_status: column.updates_status ?? false,
                    mapped_status: column.mapped_status ?? null,
                    issues: column.issues,
                    issues_count: column.issues.length,
                })),
            });
            setMovingIssueId(null);
            setDragState(null);
            lastOverIdRef.current = null;
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

    const getIssuesForColumn = (
        columnId: number | null,
        excludeIssueId?: number,
    ) => {
        const issues =
            columnId === null
                ? backlogIssues
                : (boardColumns.find((column) => column.id === columnId)
                      ?.issues ?? []);

        if (excludeIssueId === undefined) {
            return issues;
        }

        return issues.filter((issue) => issue.id !== excludeIssueId);
    };

    const moveIssue = (
        issueId: number,
        columnId: number | null,
        position: number,
    ) => {
        const currentBoardData: BoardData = {
            backlogIssues,
            boardColumns,
        };
        const optimisticBoardData = moveIssueInBoardData(
            issueId,
            columnId,
            position,
            currentBoardData,
        );

        setMovingIssueId(issueId);
        setDragState(null);
        lastOverIdRef.current = null;

        if (optimisticBoardData) {
            pendingBoardDataRef.current = currentBoardData;
            setBoardDataOverride(optimisticBoardData);
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
                onError: () => {
                    setBoardDataOverride(pendingBoardDataRef.current);
                },
                onFinish: () => {
                    setMovingIssueId(null);
                    lastOverIdRef.current = null;
                    pendingBoardDataRef.current = null;
                },
            },
        );
    };

    const getDropDestination = (
        event: DragOverEvent | DragEndEvent,
        draggedIssueId: number,
        source: IssueLocation,
    ): DragDestination | null => {
        const overData = event.over?.data.current;

        if (!overData) {
            return null;
        }

        if (overData.type === 'lane') {
            return {
                columnId: overData.columnId as number | null,
                index: getIssuesForColumn(
                    overData.columnId as number | null,
                    draggedIssueId,
                ).length,
            };
        }

        if (overData.type !== 'issue') {
            return null;
        }

        const targetColumnId = overData.columnId as number | null;

        if (overData.issueId === draggedIssueId) {
            return {
                columnId: source.columnId,
                index: source.index,
            };
        }

        const laneIssues = getIssuesForColumn(targetColumnId, draggedIssueId);
        const overIndex = laneIssues.findIndex(
            (issue) => issue.id === overData.issueId,
        );

        if (overIndex < 0) {
            return null;
        }

        const isBelowOverItem =
            event.over !== null && event.active.rect.current.translated !== null
                ? event.active.rect.current.translated.top >
                  event.over.rect.top + event.over.rect.height / 2
                : false;

        return {
            columnId: targetColumnId,
            index: overIndex + (isBelowOverItem ? 1 : 0),
        };
    };

    const collisionDetection: CollisionDetection = (args) => {
        const pointerCollisions = pointerWithin(args);
        const collisions =
            pointerCollisions.length > 0
                ? pointerCollisions
                : closestCorners(args);

        if (collisions.length > 0) {
            lastOverIdRef.current = String(collisions[0].id);

            return collisions;
        }

        return lastOverIdRef.current ? [{ id: lastOverIdRef.current }] : [];
    };

    const handleDragStart = (event: DragStartEvent) => {
        const issueId = event.active.data.current?.issueId;

        if (typeof issueId !== 'number') {
            return;
        }

        const source = findIssueLocation(issueId, backlogIssues, boardColumns);

        if (!source) {
            return;
        }

        const issueElement = issueElementRefs.current.get(issueId);
        const issueRect = issueElement?.getBoundingClientRect();

        lastOverIdRef.current = String(event.active.id);
        setDragState({
            activeIssueId: issueId,
            source,
            over: source,
            overlayWidth:
                issueRect?.width ??
                event.active.rect.current.initial?.width ??
                null,
            overlayHeight:
                issueRect?.height ??
                event.active.rect.current.initial?.height ??
                null,
        });
    };

    const handleDragOver = (event: DragOverEvent) => {
        const issueId = event.active.data.current?.issueId;

        if (typeof issueId !== 'number' || !dragState) {
            return;
        }

        const destination = getDropDestination(
            event,
            issueId,
            dragState.source,
        );

        if (!destination) {
            return;
        }

        setDragState((current) => {
            if (!current || current.activeIssueId !== issueId) {
                return current;
            }

            if (areSameIssueLocations(current.over, destination)) {
                return current;
            }

            return {
                ...current,
                over: destination,
            };
        });
    };

    const handleDragCancel = () => {
        setDragState(null);
        lastOverIdRef.current = null;
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const issueId = event.active.data.current?.issueId;

        if (typeof issueId !== 'number' || !dragState) {
            handleDragCancel();

            return;
        }

        const destination =
            getDropDestination(event, issueId, dragState.source) ??
            dragState.over;

        if (areSameIssueLocations(dragState.source, destination)) {
            handleDragCancel();

            return;
        }

        moveIssue(issueId, destination.columnId, destination.index + 1);
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

    return (
        <>
            <Head title={board.name} />
            <CrudPage
                title={board.name}
                description={`${client.name} / ${project.name}`}
                actions={
                    <div className="flex items-center gap-2">
                        {can_create_issues ? (
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
                        <Link
                            href={`/clients/${client.id}/boards/${board.id}/members`}
                        >
                            <Button size="sm" variant="outline">
                                <Users className="mr-1.5 size-3.5" />
                                Members
                            </Button>
                        </Link>
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
                {showAddColumn ? (
                    <div className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-sm">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="grid min-w-48 gap-1.5">
                                <Label
                                    htmlFor="column-name"
                                    className="text-xs"
                                >
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

                <DndContext
                    sensors={sensors}
                    collisionDetection={collisionDetection}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    <div
                        className={cn(
                            '-mx-6 flex overflow-x-auto px-6 transition-[padding] duration-200',
                            isBacklogOpen
                                ? 'pb-[min(65vh,29rem)] sm:pb-[min(60vh,24rem)]'
                                : 'pb-24 sm:pb-20',
                        )}
                    >
                        <div className="flex">
                            {allLanes.map((lane) => (
                                <BoardLane
                                    key={lane.id}
                                    lane={lane}
                                    canMoveIssues={can_move_issues}
                                    movingIssueId={movingIssueId}
                                    dragState={dragState}
                                    onIssueNodeChange={setIssueElementRef}
                                    onIssueOpen={(issueId) =>
                                        setQuickViewIssueId(issueId)
                                    }
                                />
                            ))}
                        </div>
                    </div>

                    <BacklogDrawer
                        issues={backlogIssues}
                        canMoveIssues={can_move_issues}
                        movingIssueId={movingIssueId}
                        dragState={dragState}
                        isOpen={isBacklogOpen}
                        onOpenChange={setIsBacklogOpen}
                        onCloseWithFocus={() => closeBacklogDrawer(true)}
                        onIssueNodeChange={setIssueElementRef}
                        toggleButtonRef={backlogToggleRef}
                        onIssueOpen={(issueId) => setQuickViewIssueId(issueId)}
                    />

                    <DragOverlay adjustScale={false}>
                        {activeIssue ? (
                            <div
                                className={ISSUE_CARD_CLASS}
                                style={{
                                    width: dragState?.overlayWidth ?? undefined,
                                    minWidth:
                                        dragState?.overlayWidth ?? undefined,
                                    maxWidth:
                                        dragState?.overlayWidth ?? undefined,
                                    minHeight:
                                        dragState?.overlayHeight ?? undefined,
                                    boxSizing: 'border-box',
                                }}
                            >
                                <IssueCardBody
                                    issue={activeIssue}
                                    showHandle
                                    className="w-full"
                                />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>

                <IssueQuickViewDialog
                    issue={quickViewIssue}
                    open={quickViewIssue !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setQuickViewIssueId(null);
                        }
                    }}
                    clientId={client.id}
                    projectId={project.id}
                    boardId={board.id}
                />
            </CrudPage>
        </>
    );
}

function BoardLane({
    lane,
    canMoveIssues,
    movingIssueId,
    dragState,
    onIssueNodeChange,
    onIssueOpen,
}: {
    lane: Lane;
    canMoveIssues: boolean;
    movingIssueId: number | null;
    dragState: DragState | null;
    onIssueNodeChange: (issueId: number, node: HTMLDivElement | null) => void;
    onIssueOpen: (issueId: number) => void;
}) {
    const { isOver, setNodeRef } = useDroppable({
        id: getLaneId(lane.id),
        data: {
            type: 'lane',
            columnId: lane.id,
        },
    });
    const isNoOpDrop =
        dragState !== null &&
        areSameIssueLocations(dragState.source, dragState.over);
    const insertionIndex =
        dragState?.over.columnId === lane.id && !isNoOpDrop
            ? Math.max(0, Math.min(dragState.over.index, lane.issues.length))
            : null;
    const adjustedInsertionIndex =
        dragState &&
        insertionIndex !== null &&
        dragState.source.columnId === lane.id
            ? insertionIndex >= dragState.source.index
                ? insertionIndex + 1
                : insertionIndex
            : insertionIndex;

    return (
        <div
            data-testid={`board-lane-${lane.id}`}
            className={cn(
                'flex w-96 min-w-[384px] shrink-0 flex-col',
                'border-l border-border',
            )}
        >
            <div className="sticky top-0 z-10 flex items-center gap-2 bg-background px-3 py-2.5">
                <h3 className="truncate text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {lane.name}
                </h3>
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {lane.issues_count}
                </span>
            </div>

            <div
                ref={setNodeRef}
                data-testid={`board-dropzone-${lane.id}`}
                className={cn(
                    'flex min-h-[200px] flex-1 flex-col gap-1.5 p-2 transition-colors',
                    isOver && 'bg-primary/5',
                )}
            >
                <SortableContext
                    items={lane.issues.map((issue) => getIssueId(issue.id))}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="flex flex-1 flex-col gap-1.5">
                        {lane.issues.length === 0 &&
                        adjustedInsertionIndex === null ? (
                            <div className="px-2 py-8 text-center text-xs text-muted-foreground">
                                Drop issues here
                            </div>
                        ) : null}

                        {lane.issues.map((issue, index) => (
                            <div key={issue.id}>
                                {adjustedInsertionIndex === index ? (
                                    <InsertionMarker label={lane.name} />
                                ) : null}
                                <IssueCard
                                    issue={issue}
                                    columnId={lane.id}
                                    canMove={canMoveIssues}
                                    isMoving={movingIssueId === issue.id}
                                    isGhosted={
                                        dragState?.activeIssueId === issue.id
                                    }
                                    isDropTarget={
                                        isNoOpDrop &&
                                        dragState?.source.columnId ===
                                            lane.id &&
                                        dragState.activeIssueId === issue.id
                                    }
                                    onNodeChange={onIssueNodeChange}
                                    onOpen={onIssueOpen}
                                />
                            </div>
                        ))}

                        {adjustedInsertionIndex === lane.issues.length ? (
                            <InsertionMarker label={lane.name} />
                        ) : null}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
}

function BacklogDrawer({
    issues,
    canMoveIssues,
    movingIssueId,
    dragState,
    isOpen,
    onOpenChange,
    onCloseWithFocus,
    onIssueNodeChange,
    toggleButtonRef,
    onIssueOpen,
}: {
    issues: Issue[];
    canMoveIssues: boolean;
    movingIssueId: number | null;
    dragState: DragState | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onCloseWithFocus: () => void;
    onIssueNodeChange: (issueId: number, node: HTMLDivElement | null) => void;
    toggleButtonRef: RefObject<HTMLButtonElement | null>;
    onIssueOpen: (issueId: number) => void;
}) {
    const [query, setQuery] = useState('');
    const [sortBy, setSortBy] = useState<
        'board' | 'newest' | 'oldest' | 'title'
    >('newest');
    const { isOver, setNodeRef } = useDroppable({
        id: BACKLOG_LANE_ID,
        data: {
            type: 'lane',
            columnId: null,
        },
    });
    const drawerId = 'board-backlog-drawer';
    const isNoOpDrop =
        dragState !== null &&
        areSameIssueLocations(dragState.source, dragState.over);
    const insertionIndex =
        dragState?.over.columnId === null && !isNoOpDrop
            ? Math.max(0, Math.min(dragState.over.index, issues.length))
            : null;
    const adjustedInsertionIndex =
        dragState &&
        insertionIndex !== null &&
        dragState.source.columnId === null
            ? insertionIndex >= dragState.source.index
                ? insertionIndex + 1
                : insertionIndex
            : insertionIndex;
    const normalizedQuery = query.trim().toLowerCase();
    let visibleIssues = issues.filter((issue) => {
        if (!normalizedQuery) {
            return true;
        }

        return [issue.title, stripHtml(issue.description ?? '')]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedQuery));
    });

    if (sortBy === 'newest') {
        visibleIssues = [...visibleIssues].sort((left, right) =>
            (right.created_at ?? '').localeCompare(left.created_at ?? ''),
        );
    } else if (sortBy === 'oldest') {
        visibleIssues = [...visibleIssues].sort((left, right) =>
            (left.created_at ?? '').localeCompare(right.created_at ?? ''),
        );
    } else if (sortBy === 'title') {
        visibleIssues = [...visibleIssues].sort((left, right) =>
            left.title.localeCompare(right.title),
        );
    }

    const backlogViewIsTransformed =
        normalizedQuery.length > 0 || sortBy !== 'board';
    const visualInsertionIndex = backlogViewIsTransformed
        ? null
        : adjustedInsertionIndex;

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-3 z-30 px-3 sm:px-6">
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-2">
                <button
                    ref={toggleButtonRef}
                    type="button"
                    data-testid="backlog-toggle"
                    aria-controls={drawerId}
                    aria-expanded={isOpen}
                    onClick={() => {
                        if (isOpen) {
                            onCloseWithFocus();

                            return;
                        }

                        onOpenChange(true);
                    }}
                    className={cn(
                        'pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/95 px-4 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-background',
                        isOpen && 'bg-background shadow-xl',
                    )}
                >
                    <Archive className="size-4 text-muted-foreground" />
                    <span>Backlog</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {issues.length}
                    </span>
                    {isOpen ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                        <ChevronUp className="size-4 text-muted-foreground" />
                    )}
                </button>

                <AnimatePresence initial={false}>
                    {isOpen ? (
                        <motion.div
                            key="backlog-drawer"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                                height: {
                                    duration: 0.3,
                                    ease: [0.25, 0.1, 0.25, 1],
                                },
                                opacity: { duration: 0.2, ease: 'easeInOut' },
                            }}
                            style={{ overflow: 'hidden' }}
                            className="pointer-events-auto w-full max-w-5xl rounded-[1.75rem] border border-border/70 bg-background/95 shadow-2xl backdrop-blur-sm"
                        >
                            <div
                                id={drawerId}
                                data-testid="backlog-drawer"
                                role="region"
                                aria-label="Backlog"
                                tabIndex={-1}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Escape') {
                                        return;
                                    }

                                    event.preventDefault();
                                    onCloseWithFocus();
                                }}
                            >
                                <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 sm:px-5">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <div className="rounded-full bg-muted p-2 text-muted-foreground">
                                            <Archive className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">
                                                Backlog
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Hidden board stash for unplaced
                                                issues.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mx-3 flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
                                        <Input
                                            value={query}
                                            onChange={(event) =>
                                                setQuery(event.target.value)
                                            }
                                            placeholder="Filter backlog"
                                            data-testid="backlog-filter"
                                            className="h-8 w-full max-w-60 min-w-40 bg-background sm:w-56"
                                        />
                                        <Select
                                            value={sortBy}
                                            onValueChange={(value) =>
                                                setSortBy(
                                                    value as
                                                        | 'board'
                                                        | 'newest'
                                                        | 'oldest'
                                                        | 'title',
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                data-testid="backlog-sort"
                                                className="h-8 w-full min-w-32 bg-background sm:w-40"
                                            >
                                                <SelectValue placeholder="Sort" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="board">
                                                    Board order
                                                </SelectItem>
                                                <SelectItem value="newest">
                                                    Newest
                                                </SelectItem>
                                                <SelectItem value="oldest">
                                                    Oldest
                                                </SelectItem>
                                                <SelectItem value="title">
                                                    Title
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                            {issues.length} issue
                                            {issues.length === 1 ? '' : 's'}
                                        </span>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={onCloseWithFocus}
                                        >
                                            <X className="size-4" />
                                            Close
                                        </Button>
                                    </div>
                                </div>

                                <div
                                    ref={setNodeRef}
                                    data-testid="backlog-dropzone"
                                    className={cn(
                                        'h-[min(65vh,28rem)] overflow-y-auto p-3 sm:h-[min(60vh,22rem)] sm:p-4',
                                        isOver && 'bg-primary/5',
                                    )}
                                >
                                    <SortableContext
                                        items={visibleIssues.map((issue) =>
                                            getIssueId(issue.id),
                                        )}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="flex flex-col gap-2">
                                            {visibleIssues.length === 0 &&
                                            visualInsertionIndex === null ? (
                                                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
                                                    {issues.length === 0
                                                        ? 'No backlog issues'
                                                        : 'No issues match this filter'}
                                                </div>
                                            ) : null}

                                            {visibleIssues.map(
                                                (issue, index) => (
                                                    <div key={issue.id}>
                                                        {visualInsertionIndex ===
                                                        index ? (
                                                            <InsertionMarker label="Backlog" />
                                                        ) : null}
                                                        <IssueCard
                                                            issue={issue}
                                                            columnId={null}
                                                            canMove={
                                                                canMoveIssues
                                                            }
                                                            isMoving={
                                                                movingIssueId ===
                                                                issue.id
                                                            }
                                                            isGhosted={
                                                                dragState?.activeIssueId ===
                                                                issue.id
                                                            }
                                                            isDropTarget={
                                                                isNoOpDrop &&
                                                                dragState
                                                                    ?.source
                                                                    .columnId ===
                                                                    null &&
                                                                dragState.activeIssueId ===
                                                                    issue.id
                                                            }
                                                            onNodeChange={
                                                                onIssueNodeChange
                                                            }
                                                            onOpen={onIssueOpen}
                                                        />
                                                    </div>
                                                ),
                                            )}

                                            {visualInsertionIndex ===
                                            visibleIssues.length ? (
                                                <InsertionMarker label="Backlog" />
                                            ) : null}
                                        </div>
                                    </SortableContext>
                                </div>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        </div>
    );
}

function InsertionMarker({ label }: { label: string }) {
    return (
        <div className="overflow-hidden">
            <div className="mx-1 flex h-full items-center rounded-md border border-dashed border-primary/35 bg-primary/6 px-3 text-[11px] font-medium text-primary">
                {label}
            </div>
        </div>
    );
}

function IssueCard({
    issue,
    columnId,
    canMove = false,
    isMoving = false,
    isGhosted = false,
    isDropTarget = false,
    onNodeChange,
    onOpen,
}: {
    issue: Issue;
    columnId: number | null;
    canMove?: boolean;
    isMoving?: boolean;
    isGhosted?: boolean;
    isDropTarget?: boolean;
    onNodeChange?: (issueId: number, node: HTMLDivElement | null) => void;
    onOpen?: (issueId: number) => void;
}) {
    const {
        attributes,
        listeners,
        isDragging,
        setActivatorNodeRef,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: getIssueId(issue.id),
        disabled: !canMove,
        data: {
            type: 'issue',
            issueId: issue.id,
            columnId,
        },
        transition: {
            duration: 140,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        },
        animateLayoutChanges: (args) => defaultAnimateLayoutChanges(args),
    });

    return (
        <div
            ref={(node) => {
                setNodeRef(node);
                onNodeChange?.(issue.id, node);
            }}
            data-testid={`board-issue-${issue.id}`}
            style={{
                transform: CSS.Translate.toString(transform),
                transition,
            }}
            className={cn(
                ISSUE_CARD_CLASS,
                isDragging && 'opacity-0',
                isGhosted && !isDragging && 'opacity-20',
                isMoving && 'scale-[0.985] opacity-60',
                isDropTarget &&
                    !isDragging &&
                    'bg-primary/6 shadow-[0_0_0_1px_rgba(59,130,246,0.08),0_12px_32px_rgba(59,130,246,0.12)] ring-2 ring-primary/35',
            )}
        >
            <IssueCardBody
                issue={issue}
                interactive
                showHandle={canMove}
                showBacklogMeta={columnId === null}
                handleTestId={
                    canMove ? `issue-drag-handle-${issue.id}` : undefined
                }
                className="w-full"
                onOpen={onOpen ? () => onOpen(issue.id) : undefined}
                handleProps={
                    canMove
                        ? {
                              ref: setActivatorNodeRef,
                              'aria-label': `Move ${issue.title}`,
                              ...attributes,
                              ...listeners,
                          }
                        : undefined
                }
            />
        </div>
    );
}

function IssueCardBody({
    issue,
    interactive = false,
    showHandle = false,
    showBacklogMeta = false,
    handleProps,
    handleTestId,
    className,
    style,
    onOpen,
}: {
    issue: Issue;
    interactive?: boolean;
    showHandle?: boolean;
    showBacklogMeta?: boolean;
    handleProps?: Record<string, unknown>;
    handleTestId?: string;
    className?: string;
    style?: CSSProperties;
    onOpen?: () => void;
}) {
    return (
        <div className={cn('w-full', className)} style={style}>
            <div className="flex items-start gap-2.5">
                {showHandle ? (
                    <button
                        type="button"
                        data-testid={handleTestId}
                        className="mt-0.5 shrink-0 cursor-grab rounded-sm p-0.5 text-muted-foreground/50 opacity-100 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted hover:text-foreground active:scale-95 active:cursor-grabbing"
                        {...handleProps}
                    >
                        <GripVertical className="size-4" />
                    </button>
                ) : (
                    <div className="mt-0.5 shrink-0 p-0.5 text-transparent">
                        <GripVertical className="size-4" />
                    </div>
                )}

                {onOpen ? (
                    <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onOpen();
                        }}
                    >
                        <IssueCardContent
                            issue={issue}
                            interactive={interactive}
                            showBacklogMeta={showBacklogMeta}
                        />
                    </button>
                ) : (
                    <IssueCardContent
                        issue={issue}
                        interactive={interactive}
                        showBacklogMeta={showBacklogMeta}
                    />
                )}
            </div>
        </div>
    );
}

function IssueCardContent({
    issue,
    interactive = false,
    showBacklogMeta = false,
}: {
    issue: Issue;
    interactive?: boolean;
    showBacklogMeta?: boolean;
}) {
    const priorityClass =
        PRIORITY_COLORS[issue.priority] ?? 'bg-muted text-muted-foreground';
    const typeClass =
        TYPE_COLORS[issue.type] ?? 'bg-muted text-muted-foreground';
    const addedLabel = issue.created_at
        ? formatDetailedTimestamp(issue.created_at)
        : null;

    return (
        <div className="min-w-0 flex-1">
            {issue.preview_image_url ? (
                <img
                    src={issue.preview_image_url}
                    alt={issue.title}
                    className="mb-2 aspect-[4/3] w-full rounded-lg border object-cover"
                />
            ) : null}
            <div className="flex items-start justify-between gap-3">
                <div
                    className={cn(
                        'min-w-0 text-sm leading-snug font-medium text-foreground transition-colors duration-150',
                        interactive && 'cursor-pointer hover:text-primary',
                    )}
                >
                    {issue.title}
                </div>
                {showBacklogMeta && addedLabel ? (
                    <span className="shrink-0 text-[10px] font-medium whitespace-nowrap text-muted-foreground">
                        {addedLabel}
                    </span>
                ) : null}
            </div>
            {issue.description ? (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {stripHtml(issue.description)}
                </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1.5">
                <span
                    className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                        priorityClass,
                    )}
                >
                    {issue.priority}
                </span>
                <span
                    className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                        typeClass,
                    )}
                >
                    {issue.type}
                </span>
                {issue.image_count ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <ImageIcon className="size-3" />
                        {issue.image_count}
                    </span>
                ) : null}
                {issue.file_count ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <Paperclip className="size-3" />
                        {issue.file_count}
                    </span>
                ) : null}
            </div>
        </div>
    );
}

BoardShow.layout = (page: ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
