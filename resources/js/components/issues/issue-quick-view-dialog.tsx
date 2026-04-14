import { Link, usePage } from '@inertiajs/react';
import {
    Calendar,
    Clock,
    ExternalLink,
    FileText,
    Images,
    MessageSquare,
    Tag,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { IssueAttachmentsSection } from '@/components/issues/issue-attachments';
import { IssueDiscussionComment } from '@/components/issues/issue-discussion-comment';
import type { SharedDiscussionComment } from '@/components/issues/issue-discussion-comment';
import { RichIssueContent } from '@/components/issues/rich-issue-content';
import { RichIssueEditor } from '@/components/issues/rich-issue-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatDateOnly, formatDetailedTimestamp } from '@/lib/datetime';
import type { Auth } from '@/types';

type IssueAttachment = {
    id?: number;
    file_name: string;
    file_path?: string | null;
    mime_type: string;
    file_size: number;
    url?: string | null;
    is_image?: boolean;
};

type QuickViewComment = SharedDiscussionComment;

type QuickViewIssue = {
    id: number;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    type: string;
    assignee_id?: number | null;
    due_date?: string | null;
    estimated_hours?: string | null;
    label?: string | null;
    created_at?: string | null;
    attachment_count?: number;
    image_count?: number;
    file_count?: number;
    comments_count?: number;
    attachments?: IssueAttachment[];
    comments?: QuickViewComment[];
    can_comment?: boolean;
};

type MentionOption = { id: string; label: string };

function csrfToken(): string {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? ''
    );
}

function isRichTextEmpty(html: string): boolean {
    return (
        html
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim() === ''
    );
}

function collectMentionOptions(
    issue: QuickViewIssue,
    authUser: { id: number; name: string },
): MentionOption[] {
    const seen = new Map<string, MentionOption>();

    const pushUser = (
        user: { id: number; name: string } | null | undefined,
    ) => {
        if (!user) {
            return;
        }

        seen.set(String(user.id), { id: String(user.id), label: user.name });
    };

    const walk = (comments?: QuickViewComment[]) => {
        comments?.forEach((comment) => {
            pushUser(comment.user ?? undefined);
            walk(comment.replies);
        });
    };

    pushUser(authUser);
    walk(issue.comments);

    return Array.from(seen.values());
}

async function sendJson<T>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: BodyInit | null,
): Promise<T> {
    const response = await fetch(url, {
        method,
        body: body ?? null,
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': csrfToken(),
        },
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
}

export function IssueQuickViewDialog({
    issue,
    open,
    onOpenChange,
    clientId,
    projectId,
    boardId,
}: {
    issue: QuickViewIssue | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: number;
    projectId: number;
    boardId?: number;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const [workspaceIssue, setWorkspaceIssue] = useState<QuickViewIssue | null>(
        issue,
    );
    const [activeProjectId, setActiveProjectId] = useState(projectId);
    const [descriptionDraft, setDescriptionDraft] = useState(
        issue?.description ?? '<p></p>',
    );
    const [editingDescription, setEditingDescription] = useState(false);
    const [descriptionFiles, setDescriptionFiles] = useState<File[]>([]);
    const [commentDraft, setCommentDraft] = useState('<p></p>');
    const [commentFiles, setCommentFiles] = useState<File[]>([]);
    const [savingDescription, setSavingDescription] = useState(false);
    const [savingComment, setSavingComment] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!issue) {
            return;
        }

        setWorkspaceIssue(issue);
        setActiveProjectId(projectId);
        setDescriptionDraft(issue?.description ?? '<p></p>');
        setEditingDescription(false);
        setDescriptionFiles([]);
        setCommentDraft('<p></p>');
        setCommentFiles([]);
    }, [issue, projectId]);

    const workspaceUrl = useMemo(
        () =>
            workspaceIssue
                ? `/clients/${clientId}/projects/${activeProjectId}/issues/${workspaceIssue.id}/workspace`
                : null,
        [activeProjectId, clientId, workspaceIssue],
    );
    const mentionOptions = useMemo(
        () =>
            workspaceIssue
                ? collectMentionOptions(workspaceIssue, auth.user)
                : [],
        [workspaceIssue, auth.user],
    );

    if (!workspaceIssue) {
        return null;
    }

    const fullIssueUrl = `/clients/${clientId}/projects/${activeProjectId}/issues/${workspaceIssue.id}${boardId ? `?board_id=${boardId}` : ''}`;

    const refreshWorkspace = async () => {
        if (!workspaceUrl) {
            return;
        }

        setLoading(true);

        try {
            const data = await sendJson<{ issue: QuickViewIssue }>(
                workspaceUrl,
                'GET',
            );
            setWorkspaceIssue(data.issue);
            setDescriptionDraft(data.issue.description ?? '<p></p>');
        } finally {
            setLoading(false);
        }
    };

    const saveDescription = async () => {
        setSavingDescription(true);

        try {
            const formData = new FormData();
            formData.append('_method', 'PUT');
            formData.append('title', workspaceIssue.title);
            formData.append('description', descriptionDraft);
            formData.append('status', workspaceIssue.status);
            formData.append('priority', workspaceIssue.priority);
            formData.append('type', workspaceIssue.type);
            formData.append(
                'assignee_id',
                workspaceIssue.assignee_id
                    ? String(workspaceIssue.assignee_id)
                    : '',
            );
            formData.append('label', workspaceIssue.label ?? '');
            formData.append(
                'estimated_hours',
                workspaceIssue.estimated_hours ?? '',
            );
            formData.append('due_date', workspaceIssue.due_date ?? '');
            descriptionFiles.forEach((file) =>
                formData.append('attachments[]', file),
            );

            const data = await sendJson<{ issue: QuickViewIssue }>(
                `/clients/${clientId}/projects/${activeProjectId}/issues/${workspaceIssue.id}`,
                'POST',
                formData,
            );

            setWorkspaceIssue(data.issue);
            setDescriptionDraft(data.issue.description ?? '<p></p>');
            setEditingDescription(false);
            setDescriptionFiles([]);
        } finally {
            setSavingDescription(false);
        }
    };

    const saveComment = async () => {
        setSavingComment(true);

        try {
            const formData = new FormData();
            formData.append('body', commentDraft);
            commentFiles.forEach((file) =>
                formData.append('attachments[]', file),
            );

            await sendJson(
                `/clients/${clientId}/projects/${activeProjectId}/issues/${workspaceIssue.id}/comments`,
                'POST',
                formData,
            );

            setCommentDraft('<p></p>');
            setCommentFiles([]);
            await refreshWorkspace();
        } finally {
            setSavingComment(false);
        }
    };

    const saveReply = async (parentId: number, body: string, files: File[]) => {
        const formData = new FormData();
        formData.append('body', body);
        formData.append('parent_id', String(parentId));
        files.forEach((file) => formData.append('attachments[]', file));

        await sendJson(
            `/clients/${clientId}/projects/${activeProjectId}/issues/${workspaceIssue.id}/comments`,
            'POST',
            formData,
        );

        await refreshWorkspace();
    };

    const updateComment = async (
        commentId: number,
        body: string,
        parentId?: number | null,
    ) => {
        await sendJson(
            `/clients/${clientId}/projects/${activeProjectId}/issues/${workspaceIssue.id}/comments/${commentId}`,
            'PUT',
            new URLSearchParams({
                body,
                ...(parentId ? { parent_id: String(parentId) } : {}),
            }),
        );

        await refreshWorkspace();
    };

    const deleteComment = async (commentId: number) => {
        await sendJson(
            `/clients/${clientId}/projects/${activeProjectId}/issues/${workspaceIssue.id}/comments/${commentId}`,
            'DELETE',
        );

        await refreshWorkspace();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-6xl">
                <DialogHeader className="border-b px-4 pt-4 pr-14 pb-3 sm:px-6 sm:pt-6 sm:pr-14 sm:pb-4">
                    <div className="flex flex-col items-start gap-1 pb-1">
                        <Link
                            href={fullIssueUrl}
                            className="mb-1 inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                            <ExternalLink className="size-3.5" />
                            Open full issue
                        </Link>
                        <DialogTitle className="text-xl leading-tight">
                            {workspaceIssue.title}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="hidden" />
                </DialogHeader>

                <div className="flex h-[calc(92vh-100px)] flex-col overflow-y-auto xl:grid xl:h-[calc(92vh-115px)] xl:grid-cols-[minmax(0,0.92fr)_430px] xl:overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 xl:overflow-y-auto">
                        <div className="space-y-5">
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="capitalize">
                                    {workspaceIssue.status.replace('_', ' ')}
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                    {workspaceIssue.priority}
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                    {workspaceIssue.type}
                                </Badge>
                                {workspaceIssue.label ? (
                                    <Badge variant="outline" className="gap-1">
                                        <Tag className="size-3" />
                                        {workspaceIssue.label}
                                    </Badge>
                                ) : null}
                                {workspaceIssue.due_date ? (
                                    <Badge variant="outline" className="gap-1">
                                        <Calendar className="size-3" />
                                        {formatDateOnly(
                                            workspaceIssue.due_date,
                                        )}
                                    </Badge>
                                ) : null}
                                {workspaceIssue.created_at ? (
                                    <Badge variant="outline" className="gap-1">
                                        <span>Created</span>
                                        <span>
                                            {formatDetailedTimestamp(
                                                workspaceIssue.created_at,
                                                {
                                                    timeZone:
                                                        auth.user.timezone,
                                                },
                                            )}
                                        </span>
                                    </Badge>
                                ) : null}
                                {workspaceIssue.estimated_hours ? (
                                    <Badge variant="outline" className="gap-1">
                                        <Clock className="size-3" />
                                        {workspaceIssue.estimated_hours}h
                                    </Badge>
                                ) : null}
                                <Badge variant="outline" className="gap-1">
                                    <Images className="size-3" />
                                    {workspaceIssue.image_count ?? 0} images
                                </Badge>
                                <Badge variant="outline" className="gap-1">
                                    <FileText className="size-3" />
                                    {workspaceIssue.file_count ?? 0} files
                                </Badge>
                            </div>

                            <section className="rounded-2xl border bg-card p-4 shadow-sm">
                                <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                                    Description
                                </h2>

                                {editingDescription ? (
                                    <>
                                        <RichIssueEditor
                                            value={descriptionDraft}
                                            onChange={setDescriptionDraft}
                                            placeholder="Write the description, important integration notes, checklist, and context here..."
                                            attachments={descriptionFiles}
                                            onAttachmentsChange={
                                                setDescriptionFiles
                                            }
                                            mentionOptions={mentionOptions}
                                            uploadContext={{
                                                attachableType: 'issue',
                                                attachableId: workspaceIssue.id,
                                            }}
                                        />

                                        <div className="mt-3 flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => {
                                                    setEditingDescription(
                                                        false,
                                                    );
                                                    setDescriptionDraft(
                                                        workspaceIssue.description ??
                                                            '<p></p>',
                                                    );
                                                    setDescriptionFiles([]);
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="button"
                                                disabled={savingDescription}
                                                onClick={saveDescription}
                                            >
                                                {savingDescription
                                                    ? 'Saving...'
                                                    : 'Save'}
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        className="block w-full cursor-text rounded-xl border border-transparent p-0 text-left transition hover:border-border/60"
                                        onClick={() =>
                                            setEditingDescription(true)
                                        }
                                    >
                                        {workspaceIssue.description ? (
                                            <RichIssueContent
                                                html={
                                                    workspaceIssue.description
                                                }
                                                className="prose-lg text-foreground/95"
                                            />
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                Click to add a description.
                                            </p>
                                        )}
                                    </button>
                                )}

                                {workspaceIssue.attachments?.filter(
                                    (a) => !a.is_image,
                                ).length ? (
                                    <IssueAttachmentsSection
                                        attachments={workspaceIssue.attachments.filter(
                                            (a) => !a.is_image,
                                        )}
                                        hideHeader
                                        allowUpload={false}
                                        className="mt-3 border-0 bg-transparent p-0 shadow-none"
                                    />
                                ) : null}
                            </section>
                        </div>
                    </div>

                    <aside className="border-t bg-muted/20 xl:flex xl:flex-col xl:overflow-hidden xl:border-t-0 xl:border-l">
                        <div className="flex flex-col xl:h-full">
                            <div className="border-b px-4 py-4 sm:px-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-sm font-semibold">
                                            Discussion
                                        </h2>
                                    </div>
                                    <Badge variant="outline" className="gap-1">
                                        <MessageSquare className="size-3" />
                                        {workspaceIssue.comments_count ?? 0}
                                    </Badge>
                                </div>
                            </div>

                            <div className="px-4 py-4 sm:px-5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
                                {workspaceIssue.comments &&
                                workspaceIssue.comments.length > 0 ? (
                                    <div className="space-y-4">
                                        {workspaceIssue.comments.map(
                                            (comment) => (
                                                <IssueDiscussionComment
                                                    key={comment.id}
                                                    comment={comment}
                                                    depth={0}
                                                    authUserId={auth.user.id}
                                                    issueId={workspaceIssue.id}
                                                    canComment={Boolean(
                                                        workspaceIssue.can_comment,
                                                    )}
                                                    mentionOptions={
                                                        mentionOptions
                                                    }
                                                    onReply={saveReply}
                                                    onUpdate={updateComment}
                                                    onDelete={deleteComment}
                                                />
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-dashed bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                                        No discussion yet. Start the thread
                                        here.
                                    </div>
                                )}
                                {loading ? (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        Refreshing discussion...
                                    </p>
                                ) : null}
                            </div>

                            {workspaceIssue.can_comment ? (
                                <div className="border-t bg-background px-4 py-4">
                                    <RichIssueEditor
                                        value={commentDraft}
                                        onChange={setCommentDraft}
                                        placeholder="Write a comment, checklist, note, integration update, or blocker..."
                                        attachments={commentFiles}
                                        onAttachmentsChange={setCommentFiles}
                                        mentionOptions={mentionOptions}
                                        uploadContext={{
                                            attachableType: 'issue',
                                            attachableId: workspaceIssue.id,
                                        }}
                                    />
                                    <div className="mt-3 flex justify-end">
                                        <Button
                                            type="button"
                                            disabled={
                                                savingComment ||
                                                isRichTextEmpty(commentDraft)
                                            }
                                            onClick={saveComment}
                                        >
                                            {savingComment
                                                ? 'Posting...'
                                                : 'Comment'}
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </aside>
                </div>
            </DialogContent>
        </Dialog>
    );
}
