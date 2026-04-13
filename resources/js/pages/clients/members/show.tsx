import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Activity,
    Bot,
    Coins,
    FolderKanban,
    Pencil,
    Save,
    Shield,
    Trash2,
    Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';
import { formatDetailedTimestamp } from '@/lib/datetime';
import type { Auth } from '@/types';

type Client = {
    id: number;
    name: string;
};

type RoleOption = {
    label: string;
    value: 'owner' | 'admin' | 'member';
};

type PermissionCatalogItem = {
    value: string;
    label: string;
    group: string;
};

type AvailableProject = {
    id: number;
    name: string;
};

type AvailableBoard = {
    id: number;
    name: string;
    project: {
        id: number;
        name: string;
    } | null;
};

type ActivityPoint = {
    date: string;
    count: number;
};

type Membership = {
    id: number;
    role: 'owner' | 'admin' | 'member';
    is_unrestricted: boolean;
    joined_at: string | null;
    permissions: string[];
    user: {
        id: number;
        name: string;
        email: string;
        avatar_path?: string | null;
        email_verified_at: string | null;
        ai_credits?: number;
        ai_credits_used?: number;
    };
    assignments: {
        project_ids: number[];
        board_ids: number[];
        projects_count: number;
        boards_count: number;
    };
    activity: {
        last_activity_at: string | null;
        general_usage: ActivityPoint[];
        ai_usage: ActivityPoint[];
        audit_feed: Array<{
            id: number;
            event: string;
            source: string | null;
            subject_type: string | null;
            subject_id: number | null;
            created_at: string | null;
        }>;
        assistant_summary: {
            threads_count: number;
            messages_count: number;
            runs_count: number;
            tool_executions_count: number;
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
        };
    };
};

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function filterSeriesByRange(
    series: ActivityPoint[],
    range: '30d' | '90d' | '365d' | 'all',
): ActivityPoint[] {
    if (range === 'all') {
        return series;
    }

    const days = Number.parseInt(range.replace('d', ''), 10);
    const threshold = new Date();
    threshold.setHours(0, 0, 0, 0);
    threshold.setDate(threshold.getDate() - (days - 1));

    return series.filter((point) => new Date(point.date) >= threshold);
}

function creditLabel(
    credits: number | undefined,
    used: number | undefined,
): string {
    const allocation = credits ?? 0;
    const consumed = used ?? 0;

    if (allocation === -1) {
        return `Unlimited · ${consumed} used`;
    }

    return `${consumed}/${allocation}`;
}

export default function ClientMemberShow({
    client,
    membership,
    roles,
    permission_catalog,
    graph_ranges,
    available_projects,
    available_boards,
    can_manage_members,
    can_manage_ai_credits,
}: {
    client: Client;
    membership: Membership;
    roles: RoleOption[];
    permission_catalog: PermissionCatalogItem[];
    graph_ranges: Array<'30d' | '90d' | '365d' | 'all'>;
    available_projects: AvailableProject[];
    available_boards: AvailableBoard[];
    can_manage_members: boolean;
    can_manage_ai_credits: boolean;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const avatarSrc = membership.user.avatar_path
        ? `/storage/${membership.user.avatar_path}`
        : null;
    const [graphRange, setGraphRange] = useState<
        '30d' | '90d' | '365d' | 'all'
    >('30d');
    const [creditsValue, setCreditsValue] = useState(
        String(membership.user.ai_credits ?? 0),
    );
    const profileForm = useForm({
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
    });
    const permissionsForm = useForm({
        permissions: membership.permissions,
    });
    const projectsForm = useForm({
        project_ids: membership.assignments.project_ids,
    });
    const boardsForm = useForm({
        board_ids: membership.assignments.board_ids,
    });
    const groupedPermissions = useMemo(() => {
        return permission_catalog.reduce<
            Record<string, PermissionCatalogItem[]>
        >((groups, permission) => {
            groups[permission.group] ??= [];
            groups[permission.group].push(permission);

            return groups;
        }, {});
    }, [permission_catalog]);
    const generalUsage = filterSeriesByRange(
        membership.activity.general_usage,
        graphRange,
    );
    const aiUsage = filterSeriesByRange(
        membership.activity.ai_usage,
        graphRange,
    );
    const projectOptions = useMemo(
        () =>
            available_projects.map((project) => ({
                value: String(project.id),
                label: project.name,
            })),
        [available_projects],
    );
    const boardOptions = useMemo(
        () =>
            available_boards.map((board) => {
                const projectAssigned = Boolean(
                    board.project &&
                    projectsForm.data.project_ids.includes(board.project.id),
                );

                return {
                    value: String(board.id),
                    label: board.project
                        ? `${board.project.name} / ${board.name}`
                        : board.name,
                    disabled: !board.project || !projectAssigned,
                };
            }),
        [available_boards, projectsForm.data.project_ids],
    );

    const togglePermission = (permission: string) => {
        permissionsForm.setData(
            'permissions',
            toggleStringValue(permissionsForm.data.permissions, permission),
        );
    };

    const setProjectIds = (projectIds: number[]) => {
        const nextProjectIds = Array.from(new Set(projectIds));
        projectsForm.setData('project_ids', nextProjectIds);
        boardsForm.setData(
            'board_ids',
            boardsForm.data.board_ids.filter((boardId) => {
                const board = available_boards.find(
                    (item) => item.id === boardId,
                );

                return Boolean(
                    board?.project && nextProjectIds.includes(board.project.id),
                );
            }),
        );
    };

    const setBoardIds = (boardIds: number[]) => {
        boardsForm.setData(
            'board_ids',
            Array.from(
                new Set(
                    boardIds.filter((boardId) => {
                        const board = available_boards.find(
                            (item) => item.id === boardId,
                        );

                        return Boolean(
                            board?.project &&
                            projectsForm.data.project_ids.includes(
                                board.project.id,
                            ),
                        );
                    }),
                ),
            ),
        );
    };

    return (
        <>
            <Head title={`${membership.user.name} Member Profile`} />

            <div className="space-y-8">
                <section className="space-y-4">
                    <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                            <Avatar className="size-16 rounded-2xl">
                                {avatarSrc ? (
                                    <AvatarImage
                                        src={avatarSrc}
                                        alt={membership.user.name}
                                    />
                                ) : null}
                                <AvatarFallback className="rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
                                    {getInitials(membership.user.name)}
                                </AvatarFallback>
                            </Avatar>

                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl font-semibold tracking-tight">
                                        {membership.user.name}
                                    </h1>
                                    <Badge
                                        variant="outline"
                                        className="capitalize"
                                    >
                                        {membership.role}
                                    </Badge>
                                    {membership.role === 'owner' ||
                                    membership.role === 'admin' ? (
                                        <Badge variant="secondary">
                                            Unrestricted client access
                                        </Badge>
                                    ) : null}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {membership.user.email}
                                </p>
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <span>
                                        Joined{' '}
                                        {formatDetailedTimestamp(
                                            membership.joined_at,
                                            {
                                                timeZone: auth.user.timezone,
                                                fallback: 'No activity yet',
                                            },
                                        )}
                                    </span>
                                    <span>
                                        Last activity{' '}
                                        {formatDetailedTimestamp(
                                            membership.activity
                                                .last_activity_at,
                                            {
                                                timeZone: auth.user.timezone,
                                                fallback: 'No activity yet',
                                            },
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button asChild variant="outline">
                                <Link href={`/clients/${client.id}/members`}>
                                    Back to members
                                </Link>
                            </Button>
                            {can_manage_members ? (
                                <Button asChild variant="outline">
                                    <Link
                                        href={`/clients/${client.id}/members/create`}
                                    >
                                        <Users className="mr-1.5 size-4" />
                                        New member
                                    </Link>
                                </Button>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            icon={Coins}
                            label="AI Credits"
                            value={creditLabel(
                                membership.user.ai_credits,
                                membership.user.ai_credits_used,
                            )}
                        />
                        <StatCard
                            icon={FolderKanban}
                            label="Projects"
                            value={String(
                                membership.assignments.projects_count,
                            )}
                        />
                        <StatCard
                            icon={Shield}
                            label="Boards"
                            value={String(membership.assignments.boards_count)}
                        />
                        <StatCard
                            icon={Bot}
                            label="AI Runs"
                            value={String(
                                membership.activity.assistant_summary
                                    .runs_count,
                            )}
                        />
                    </div>
                </section>

                <SectionShell
                    title="Access"
                    description="Manage identity, role, explicit permissions, and assignment scope from one surface."
                >
                    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle>Basic info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="member-name">
                                            Name
                                        </Label>
                                        <Input
                                            id="member-name"
                                            value={profileForm.data.name}
                                            onChange={(event) =>
                                                profileForm.setData(
                                                    'name',
                                                    event.target.value,
                                                )
                                            }
                                            disabled={!can_manage_members}
                                        />
                                        {profileForm.errors.name ? (
                                            <p className="text-sm text-destructive">
                                                {profileForm.errors.name}
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="member-email">
                                            Email
                                        </Label>
                                        <Input
                                            id="member-email"
                                            value={profileForm.data.email}
                                            onChange={(event) =>
                                                profileForm.setData(
                                                    'email',
                                                    event.target.value,
                                                )
                                            }
                                            disabled={!can_manage_members}
                                        />
                                        {profileForm.errors.email ? (
                                            <p className="text-sm text-destructive">
                                                {profileForm.errors.email}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <SearchableSelect
                                        className="w-full"
                                        value={profileForm.data.role}
                                        isClearable={false}
                                        isSearchable={false}
                                        onValueChange={(value) =>
                                            profileForm.setData(
                                                'role',
                                                value as typeof profileForm.data.role,
                                            )
                                        }
                                        disabled={!can_manage_members}
                                        placeholder="Select role"
                                        options={roles}
                                    />
                                    {profileForm.errors.role ? (
                                        <p className="text-sm text-destructive">
                                            {profileForm.errors.role}
                                        </p>
                                    ) : null}
                                </div>

                                {can_manage_members ? (
                                    <div className="flex justify-end">
                                        <Button
                                            onClick={() =>
                                                profileForm.put(
                                                    `/clients/${client.id}/members/${membership.id}`,
                                                    { preserveScroll: true },
                                                )
                                            }
                                            disabled={profileForm.processing}
                                        >
                                            <Save className="mr-1.5 size-4" />
                                            Save profile
                                        </Button>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>

                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle>AI credits</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                                    Credits stay platform-owner-only to mutate.
                                    Staff managers can still see current
                                    allocation and usage here.
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="member-ai-credits">
                                        Allocation
                                    </Label>
                                    <Input
                                        id="member-ai-credits"
                                        type="number"
                                        min={-1}
                                        value={creditsValue}
                                        onChange={(event) =>
                                            setCreditsValue(event.target.value)
                                        }
                                        disabled={!can_manage_ai_credits}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Used{' '}
                                        {membership.user.ai_credits_used ?? 0}{' '}
                                        credits so far.
                                    </p>
                                </div>
                                {can_manage_ai_credits ? (
                                    <div className="flex justify-end">
                                        <Button
                                            onClick={() => {
                                                const nextCredits =
                                                    Number.parseInt(
                                                        creditsValue,
                                                        10,
                                                    ) || 0;

                                                if (
                                                    !window.confirm(
                                                        `Update ${membership.user.name}'s AI credits to ${nextCredits}?`,
                                                    )
                                                ) {
                                                    return;
                                                }

                                                router.put(
                                                    `/users/${membership.user.id}/credits`,
                                                    {
                                                        ai_credits: nextCredits,
                                                    },
                                                    { preserveScroll: true },
                                                );
                                            }}
                                        >
                                            <Pencil className="mr-1.5 size-4" />
                                            Update credits
                                        </Button>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle>Permissions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {profileForm.data.role === 'member' ? (
                                    <>
                                        {Object.entries(groupedPermissions).map(
                                            ([group, permissions]) => (
                                                <div
                                                    key={group}
                                                    className="space-y-3 rounded-2xl border border-border/50 p-4"
                                                >
                                                    <div>
                                                        <h3 className="text-sm font-semibold capitalize">
                                                            {group}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground">
                                                            Member-scoped access
                                                            for the {group}{' '}
                                                            domain.
                                                        </p>
                                                    </div>
                                                    <div className="grid gap-3 md:grid-cols-2">
                                                        {permissions.map(
                                                            (permission) => (
                                                                <label
                                                                    key={
                                                                        permission.value
                                                                    }
                                                                    className="flex items-start gap-3 rounded-xl border border-border/40 p-3"
                                                                >
                                                                    <Checkbox
                                                                        checked={permissionsForm.data.permissions.includes(
                                                                            permission.value,
                                                                        )}
                                                                        onCheckedChange={() =>
                                                                            togglePermission(
                                                                                permission.value,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            !can_manage_members
                                                                        }
                                                                    />
                                                                    <div className="space-y-1">
                                                                        <p className="text-sm font-medium">
                                                                            {
                                                                                permission.label
                                                                            }
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {
                                                                                permission.value
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </label>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            ),
                                        )}

                                        {can_manage_members ? (
                                            <div className="flex justify-end">
                                                <Button
                                                    onClick={() =>
                                                        permissionsForm.put(
                                                            `/clients/${client.id}/members/${membership.id}/permissions`,
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                    disabled={
                                                        permissionsForm.processing
                                                    }
                                                >
                                                    <Save className="mr-1.5 size-4" />
                                                    Save permissions
                                                </Button>
                                            </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                                        This role has unrestricted access inside
                                        the client. Explicit permission rows are
                                        only stored for members.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle>Project assignments</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {membership.is_unrestricted ? (
                                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                                        {membership.role === 'admin'
                                            ? 'Admins automatically access every project in this client. They do not use project assignment rows.'
                                            : 'Owners automatically access every project in this client. They do not use project assignment rows.'}
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Projects</Label>
                                            <MultiSelect
                                                values={projectsForm.data.project_ids.map(
                                                    String,
                                                )}
                                                options={projectOptions}
                                                placeholder="Select project access"
                                                disabled={!can_manage_members}
                                                onValuesChange={(values) =>
                                                    setProjectIds(
                                                        values.map((value) =>
                                                            Number.parseInt(
                                                                value,
                                                                10,
                                                            ),
                                                        ),
                                                    )
                                                }
                                            />
                                            <p className="text-sm text-muted-foreground">
                                                Project scope gates projects,
                                                issues, finance, and boards.
                                            </p>
                                        </div>
                                        {can_manage_members ? (
                                            <div className="flex justify-end">
                                                <Button
                                                    onClick={() =>
                                                        projectsForm.put(
                                                            `/clients/${client.id}/members/${membership.id}/projects`,
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                    disabled={
                                                        projectsForm.processing
                                                    }
                                                >
                                                    <Save className="mr-1.5 size-4" />
                                                    Save projects
                                                </Button>
                                            </div>
                                        ) : null}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="shadow-none">
                        <CardHeader>
                            <CardTitle>Board assignments</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {membership.is_unrestricted ? (
                                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                                    {membership.role === 'admin'
                                        ? 'Admins automatically access every board in this client through unrestricted client access.'
                                        : 'Owners automatically access every board in this client through unrestricted client access.'}
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label>Boards</Label>
                                        <MultiSelect
                                            values={boardsForm.data.board_ids.map(
                                                String,
                                            )}
                                            options={boardOptions}
                                            placeholder="Select board access"
                                            emptyMessage="No boards available."
                                            disabled={!can_manage_members}
                                            onValuesChange={(values) =>
                                                setBoardIds(
                                                    values.map((value) =>
                                                        Number.parseInt(
                                                            value,
                                                            10,
                                                        ),
                                                    ),
                                                )
                                            }
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Board access still depends on the
                                            selected project scope above.
                                        </p>
                                    </div>

                                    {projectsForm.data.project_ids.length ===
                                    0 ? (
                                        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                                            Assign at least one project before
                                            selecting boards.
                                        </div>
                                    ) : null}

                                    <div className="flex flex-wrap gap-2">
                                        {available_projects
                                            .filter((project) =>
                                                projectsForm.data.project_ids.includes(
                                                    project.id,
                                                ),
                                            )
                                            .map((project) => (
                                                <Badge
                                                    key={project.id}
                                                    variant="secondary"
                                                >
                                                    {project.name}
                                                </Badge>
                                            ))}
                                    </div>

                                    {can_manage_members ? (
                                        <div className="flex justify-end">
                                            <Button
                                                onClick={() =>
                                                    boardsForm.put(
                                                        `/clients/${client.id}/members/${membership.id}/boards`,
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                                disabled={boardsForm.processing}
                                            >
                                                <Save className="mr-1.5 size-4" />
                                                Save boards
                                            </Button>
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {can_manage_members ? (
                        <Card className="border-destructive/30 shadow-none">
                            <CardHeader>
                                <CardTitle>Danger zone</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Removing this membership revokes client
                                    access for {membership.user.name}.
                                </p>
                                <Button
                                    variant="destructive"
                                    onClick={() =>
                                        router.delete(
                                            `/clients/${client.id}/members/${membership.id}`,
                                        )
                                    }
                                >
                                    <Trash2 className="mr-1.5 size-4" />
                                    Remove member
                                </Button>
                            </CardContent>
                        </Card>
                    ) : null}
                </SectionShell>

                <SectionShell
                    title="Activity"
                    description="Review general usage, AI usage, and the recent audit trail for this member."
                >
                    <div className="flex flex-wrap gap-2">
                        {graph_ranges.map((range) => (
                            <Button
                                key={range}
                                variant={
                                    graphRange === range ? 'default' : 'outline'
                                }
                                size="sm"
                                onClick={() => setGraphRange(range)}
                            >
                                {range}
                            </Button>
                        ))}
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <ActivityChart
                            title="General activity"
                            description="Audit-log volume grouped by day."
                            series={generalUsage}
                        />
                        <ActivityChart
                            title="AI usage"
                            description="Assistant runs grouped by day."
                            series={aiUsage}
                        />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle>Assistant summary</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-3 sm:grid-cols-2">
                                <Metric
                                    label="Threads"
                                    value={
                                        membership.activity.assistant_summary
                                            .threads_count
                                    }
                                />
                                <Metric
                                    label="User messages"
                                    value={
                                        membership.activity.assistant_summary
                                            .messages_count
                                    }
                                />
                                <Metric
                                    label="Runs"
                                    value={
                                        membership.activity.assistant_summary
                                            .runs_count
                                    }
                                />
                                <Metric
                                    label="Tool executions"
                                    value={
                                        membership.activity.assistant_summary
                                            .tool_executions_count
                                    }
                                />
                                <Metric
                                    label="Prompt tokens"
                                    value={
                                        membership.activity.assistant_summary
                                            .prompt_tokens
                                    }
                                />
                                <Metric
                                    label="Completion tokens"
                                    value={
                                        membership.activity.assistant_summary
                                            .completion_tokens
                                    }
                                />
                                <Metric
                                    label="Total tokens"
                                    value={
                                        membership.activity.assistant_summary
                                            .total_tokens
                                    }
                                />
                            </CardContent>
                        </Card>

                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle>Recent audit activity</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {membership.activity.audit_feed.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No audit activity has been recorded yet.
                                    </p>
                                ) : (
                                    membership.activity.audit_feed.map(
                                        (entry) => (
                                            <div
                                                key={entry.id}
                                                className="rounded-2xl border border-border/50 p-4"
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="outline">
                                                        {entry.event}
                                                    </Badge>
                                                    {entry.source ? (
                                                        <Badge variant="secondary">
                                                            {entry.source}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                                <p className="mt-2 text-sm text-muted-foreground">
                                                    {entry.subject_type ??
                                                        'Subject'}
                                                    {entry.subject_id
                                                        ? ` #${entry.subject_id}`
                                                        : ''}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {formatDetailedTimestamp(
                                                        entry.created_at,
                                                        {
                                                            timeZone:
                                                                auth.user
                                                                    .timezone,
                                                            fallback:
                                                                'No activity yet',
                                                        },
                                                    )}
                                                </p>
                                            </div>
                                        ),
                                    )
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </SectionShell>
            </div>
        </>
    );
}

function SectionShell({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">
                    {title}
                </h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {children}
        </section>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Coins;
    label: string;
    value: string;
}) {
    return (
        <Card className="shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-4" />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
        </div>
    );
}

function ActivityChart({
    title,
    description,
    series,
}: {
    title: string;
    description: string;
    series: ActivityPoint[];
}) {
    const max = Math.max(...series.map((point) => point.count), 1);

    return (
        <Card className="shadow-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="size-4" />
                    {title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{description}</p>
            </CardHeader>
            <CardContent>
                {series.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        No activity in this range.
                    </div>
                ) : (
                    <div className="space-y-3">
                        <svg viewBox="0 0 100 36" className="h-44 w-full">
                            {series.map((point, index) => {
                                const width = 100 / series.length;
                                const height = (point.count / max) * 28;
                                const x = index * width + 0.75;
                                const y = 32 - height;

                                return (
                                    <rect
                                        key={`${point.date}-${index}`}
                                        x={x}
                                        y={y}
                                        width={Math.max(width - 1.5, 1)}
                                        height={height}
                                        rx={1.5}
                                        className="fill-primary/80"
                                    />
                                );
                            })}
                        </svg>

                        <div className="grid gap-2 sm:grid-cols-3">
                            <div className="rounded-2xl border border-border/50 p-3">
                                <p className="text-xs text-muted-foreground">
                                    Total events
                                </p>
                                <p className="text-base font-semibold">
                                    {series.reduce(
                                        (sum, point) => sum + point.count,
                                        0,
                                    )}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-border/50 p-3">
                                <p className="text-xs text-muted-foreground">
                                    Peak day
                                </p>
                                <p className="text-base font-semibold">{max}</p>
                            </div>
                            <div className="rounded-2xl border border-border/50 p-3">
                                <p className="text-xs text-muted-foreground">
                                    Latest point
                                </p>
                                <p className="text-base font-semibold">
                                    {series[series.length - 1]?.date ?? 'n/a'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function toggleStringValue(values: string[], value: string): string[] {
    return values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
}

ClientMemberShow.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
