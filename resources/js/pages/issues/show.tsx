import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Calendar,
    Check,
    ChevronRight,
    Clock,
    Download,
    Image as ImageIcon,
    MessageSquare,
    Paperclip,
    Pencil,
    Send,
    Tag,
    Trash2,
    X,
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormField } from '@/components/crud/dynamic-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

type Issue = {
    id: number;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    type: string;
    assignee_id: number | null;
    assignee: {
        id: number;
        name: string;
    } | null;
    due_date: string | null;
    estimated_hours: string | null;
    label: string | null;
};

type AttachmentRow = {
    id: number;
    file_name: string;
    file_path: string;
    mime_type: string;
    file_size: number;
};

type IssueComment = {
    id: number;
    body: string;
    parent_id: number | null;
    user: {
        id: number;
        name: string;
        avatar_path?: string | null;
    } | null;
    replies: IssueComment[];
    created_at?: string;
};

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function countReplies(comment: IssueComment): number {
    let count = comment.replies.length;
    for (const reply of comment.replies) {
        count += countReplies(reply);
    }
    return count;
}

function Comment({
    comment,
    canReply,
    replyBody,
    replyingTo,
    authUserId,
    commentBaseUrl,
    onReplyToggle,
    onReplyChange,
    onReplySubmit,
}: {
    comment: IssueComment;
    canReply: boolean;
    replyBody: string;
    replyingTo: number | null;
    authUserId: number;
    commentBaseUrl: string;
    onReplyToggle: (commentId: number) => void;
    onReplyChange: (commentId: number, value: string) => void;
    onReplySubmit: (commentId: number) => void;
}) {
    const name = comment.user?.name ?? 'Unknown';
    const avatarSrc = comment.user?.avatar_path
        ? `/storage/${comment.user.avatar_path}`
        : null;
    const isReplying = replyingTo === comment.id;
    const hasReplies = comment.replies.length > 0;
    const [collapsed, setCollapsed] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editBody, setEditBody] = useState(comment.body);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const isOwner = comment.user?.id === authUserId;
    const totalReplies = countReplies(comment);

    const submitEdit = () => {
        if (!editBody.trim()) return;
        router.put(
            `${commentBaseUrl}/${comment.id}`,
            { body: editBody },
            {
                preserveScroll: true,
                onSuccess: () => setEditing(false),
            },
        );
    };

    const submitDelete = () => {
        router.delete(`${commentBaseUrl}/${comment.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <div className="flex gap-3">
            {/* Avatar + collapse line */}
            <div className="flex shrink-0 flex-col items-center">
                <Avatar className="size-8">
                    {avatarSrc && <AvatarImage src={avatarSrc} alt={name} />}
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(name)}
                    </AvatarFallback>
                </Avatar>
                {hasReplies ? (
                    <button
                        type="button"
                        onClick={() => setCollapsed((c) => !c)}
                        className="group/line mt-1 flex w-5 flex-1 cursor-pointer justify-center"
                        title={
                            collapsed ? 'Expand replies' : 'Collapse replies'
                        }
                    >
                        <div className="w-px bg-border transition-colors group-hover/line:bg-primary" />
                    </button>
                ) : null}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pb-4">
                <p className="text-sm font-medium text-foreground">{name}</p>

                {editing ? (
                    <div className="mt-1 flex gap-2">
                        <Textarea
                            value={editBody}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                                setEditBody(e.target.value)
                            }
                            className="min-h-16 flex-1 resize-none text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                                if (
                                    e.key === 'Enter' &&
                                    (e.metaKey || e.ctrlKey)
                                ) {
                                    e.preventDefault();
                                    submitEdit();
                                }
                                if (e.key === 'Escape') {
                                    setEditing(false);
                                    setEditBody(comment.body);
                                }
                            }}
                        />
                        <div className="flex flex-col gap-1">
                            <Button
                                size="sm"
                                onClick={submitEdit}
                                disabled={!editBody.trim()}
                            >
                                <Check className="size-3.5" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    setEditing(false);
                                    setEditBody(comment.body);
                                }}
                            >
                                <X className="size-3.5" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
                        {comment.body}
                    </p>
                )}

                <div className="mt-2 flex items-center gap-3">
                    {canReply && !editing ? (
                        <button
                            type="button"
                            onClick={() => onReplyToggle(comment.id)}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
                        >
                            <MessageSquare className="size-3" />
                            Reply
                        </button>
                    ) : null}

                    {isOwner && !editing ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setEditing(true)}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
                            >
                                <Pencil className="size-3" />
                                Edit
                            </button>
                            {confirmDelete ? (
                                <span className="inline-flex items-center gap-1 text-xs">
                                    <span className="text-destructive">
                                        Delete?
                                    </span>
                                    <button
                                        type="button"
                                        onClick={submitDelete}
                                        className="font-medium text-destructive hover:underline"
                                    >
                                        Yes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(false)}
                                        className="text-muted-foreground hover:underline"
                                    >
                                        No
                                    </button>
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setConfirmDelete(true)}
                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-destructive"
                                >
                                    <Trash2 className="size-3" />
                                    Delete
                                </button>
                            )}
                        </>
                    ) : null}

                    {hasReplies && collapsed ? (
                        <button
                            type="button"
                            onClick={() => setCollapsed(false)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:text-primary/80"
                        >
                            <ChevronRight className="size-3" />
                            {totalReplies}{' '}
                            {totalReplies === 1 ? 'reply' : 'replies'}
                        </button>
                    ) : null}
                </div>

                {/* Inline reply form */}
                {isReplying ? (
                    <div className="mt-3 flex gap-2">
                        <Textarea
                            value={replyBody}
                            onChange={(
                                event: ChangeEvent<HTMLTextAreaElement>,
                            ) => onReplyChange(comment.id, event.target.value)}
                            placeholder="Write a reply..."
                            className="min-h-16 flex-1 resize-none text-sm"
                            autoFocus
                            onKeyDown={(event) => {
                                if (
                                    event.key === 'Enter' &&
                                    (event.metaKey || event.ctrlKey)
                                ) {
                                    event.preventDefault();
                                    onReplySubmit(comment.id);
                                }
                            }}
                        />
                        <div className="flex flex-col gap-1">
                            <Button
                                size="sm"
                                onClick={() => onReplySubmit(comment.id)}
                                disabled={replyBody.trim() === ''}
                            >
                                <Send className="size-3.5" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onReplyToggle(comment.id)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : null}

                {/* Nested replies */}
                {hasReplies && !collapsed ? (
                    <div className="mt-3 space-y-0">
                        {comment.replies.map((reply) => (
                            <Comment
                                key={reply.id}
                                comment={reply}
                                canReply={canReply}
                                replyBody={
                                    replyingTo === reply.id
                                        ? (replyBody ?? '')
                                        : ''
                                }
                                replyingTo={replyingTo}
                                authUserId={authUserId}
                                commentBaseUrl={commentBaseUrl}
                                onReplyToggle={onReplyToggle}
                                onReplyChange={onReplyChange}
                                onReplySubmit={onReplySubmit}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default function IssueShow({
    client,
    project,
    issue,
    can_manage_issue,
    can_comment,
    comments,
    attachments = [],
    assignee_options,
    status_options,
    priority_options,
    type_options,
}: {
    client: { id: number; name: string };
    project: { id: number; name: string };
    issue: Issue;
    can_manage_issue: boolean;
    can_comment: boolean;
    comments: IssueComment[];
    attachments?: AttachmentRow[];
    assignee_options: Array<{ label: string; value: string }>;
    status_options: string[];
    priority_options: string[];
    type_options: string[];
}) {
    const form = useForm({
        title: issue.title,
        description: issue.description ?? '',
        assignee_id: issue.assignee_id ? String(issue.assignee_id) : '',
        status: issue.status,
        priority: issue.priority,
        type: issue.type,
        due_date: issue.due_date ?? '',
        estimated_hours: issue.estimated_hours ?? '',
        label: issue.label ?? '',
    });
    const commentForm = useForm({
        body: '',
    });
    const [replyBodies, setReplyBodies] = useState<Record<number, string>>({});
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [commentFiles, setCommentFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { auth } = usePage<{
        auth: {
            user: { id: number; name: string; avatar_path?: string | null };
        };
    }>().props;
    const commentUrl = `/clients/${client.id}/projects/${project.id}/issues/${issue.id}/comments`;

    const fields: DynamicFormField[] = [
        {
            name: 'title',
            label: 'Title',
            type: 'text',
            placeholder: 'Issue title',
        },
        {
            name: 'description',
            label: 'Description',
            type: 'textarea',
            placeholder: 'Optional description',
        },
        {
            name: 'assignee_id',
            label: 'Assignee',
            type: 'select',
            options: assignee_options,
        },
        {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: status_options.map((status) => ({
                label: status,
                value: status,
            })),
        },
        {
            name: 'priority',
            label: 'Priority',
            type: 'select',
            options: priority_options.map((priority) => ({
                label: priority,
                value: priority,
            })),
        },
        {
            name: 'type',
            label: 'Type',
            type: 'select',
            options: type_options.map((type) => ({ label: type, value: type })),
        },
        { name: 'due_date', label: 'Due date', type: 'date' as const },
        {
            name: 'estimated_hours',
            label: 'Estimated hours',
            type: 'text' as const,
            placeholder: 'e.g. 4',
        },
        {
            name: 'label',
            label: 'Label',
            type: 'text' as const,
            placeholder: 'e.g. frontend, backend',
        },
    ];

    const toggleReply = (commentId: number) => {
        if (replyingTo === commentId) {
            setReplyingTo(null);
        } else {
            setReplyingTo(commentId);
        }
    };

    const submitReply = (commentId: number) => {
        const body = (replyBodies[commentId] ?? '').trim();

        if (!body) {
            return;
        }

        router.post(
            commentUrl,
            {
                body,
                parent_id: commentId,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setReplyBodies((current) => ({
                        ...current,
                        [commentId]: '',
                    }));
                    setReplyingTo(null);
                },
            },
        );
    };

    return (
        <>
            <Head title={issue.title} />
            <CrudPage
                title={issue.title}
                description={`${client.name} / ${project.name}`}
                onBack={() => window.history.back()}
            >
                {can_manage_issue ? (
                    <DynamicForm
                        fields={fields}
                        data={form.data}
                        errors={form.errors}
                        processing={form.processing}
                        submitLabel="Update issue"
                        cancelLabel="Back"
                        onCancel={() => window.history.back()}
                        onChange={(name, value) =>
                            form.setData(name as keyof typeof form.data, value)
                        }
                        onSubmit={() =>
                            form.put(
                                `/clients/${client.id}/projects/${project.id}/issues/${issue.id}`,
                            )
                        }
                    />
                ) : (
                    <section className="rounded-xl bg-card p-4 shadow-sm">
                        <p className="text-sm text-muted-foreground">
                            {issue.description ?? 'No description.'}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Badge
                                variant="outline"
                                className="gap-1 capitalize"
                            >
                                Status: {issue.status.replace('_', ' ')}
                            </Badge>
                            <Badge
                                variant="outline"
                                className="gap-1 capitalize"
                            >
                                Priority: {issue.priority}
                            </Badge>
                            <Badge
                                variant="outline"
                                className="gap-1 capitalize"
                            >
                                Type: {issue.type}
                            </Badge>
                            <Badge variant="outline">
                                Assignee: {issue.assignee?.name ?? 'Unassigned'}
                            </Badge>
                            {issue.due_date ? (
                                <Badge variant="outline" className="gap-1">
                                    <Calendar className="size-3" />
                                    {issue.due_date}
                                </Badge>
                            ) : null}
                            {issue.estimated_hours ? (
                                <Badge variant="outline" className="gap-1">
                                    <Clock className="size-3" />
                                    {issue.estimated_hours}h
                                </Badge>
                            ) : null}
                            {issue.label ? (
                                <Badge variant="outline" className="gap-1">
                                    <Tag className="size-3" />
                                    {issue.label}
                                </Badge>
                            ) : null}
                        </div>
                    </section>
                )}

                {/* Attachments */}
                {attachments.length > 0 ? (
                    <section className="space-y-3">
                        <h2 className="flex items-center gap-2 text-base font-semibold">
                            <Paperclip className="size-4" />
                            Attachments
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                {attachments.length}
                            </span>
                        </h2>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {attachments.map((att) => {
                                const isImage =
                                    att.mime_type.startsWith('image/');
                                return (
                                    <div
                                        key={att.id}
                                        className="flex items-center gap-3 rounded-lg border px-3 py-2"
                                    >
                                        {isImage ? (
                                            <ImageIcon className="size-4 shrink-0 text-blue-500" />
                                        ) : (
                                            <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                                        )}
                                        <span className="min-w-0 flex-1 truncate text-sm">
                                            {att.file_name}
                                        </span>
                                        <a
                                            href={`/storage/${att.file_path}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="shrink-0 text-muted-foreground hover:text-foreground"
                                        >
                                            <Download className="size-4" />
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ) : null}

                {/* Discussion */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-base font-semibold">Discussion</h2>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {comments.length}
                        </span>
                    </div>

                    {/* Comment thread */}
                    {comments.length > 0 ? (
                        <div className="space-y-0">
                            {comments.map((comment) => (
                                <Comment
                                    key={comment.id}
                                    comment={comment}
                                    canReply={can_comment}
                                    replyBody={replyBodies[comment.id] ?? ''}
                                    replyingTo={replyingTo}
                                    authUserId={auth.user.id}
                                    commentBaseUrl={commentUrl}
                                    onReplyToggle={toggleReply}
                                    onReplyChange={(commentId, value) =>
                                        setReplyBodies((current) => ({
                                            ...current,
                                            [commentId]: value,
                                        }))
                                    }
                                    onReplySubmit={submitReply}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            No comments yet. Start the discussion below.
                        </p>
                    )}

                    {/* New comment composer */}
                    {can_comment ? (
                        <form
                            className="flex gap-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                const formData = new FormData();
                                formData.append('body', commentForm.data.body);
                                commentFiles.forEach((file) =>
                                    formData.append('attachments[]', file),
                                );
                                router.post(commentUrl, formData as any, {
                                    preserveScroll: true,
                                    forceFormData: true,
                                    onSuccess: () => {
                                        commentForm.reset('body');
                                        setCommentFiles([]);
                                    },
                                });
                            }}
                        >
                            <Avatar className="size-8 shrink-0">
                                {auth.user.avatar_path && (
                                    <AvatarImage
                                        src={`/storage/${auth.user.avatar_path}`}
                                        alt={auth.user.name}
                                    />
                                )}
                                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                    {getInitials(auth.user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 space-y-2">
                                <Textarea
                                    name="comment_body"
                                    value={commentForm.data.body}
                                    placeholder="Add a comment..."
                                    className="min-h-20 resize-none text-sm"
                                    onChange={(
                                        event: ChangeEvent<HTMLTextAreaElement>,
                                    ) =>
                                        commentForm.setData(
                                            'body',
                                            event.target.value,
                                        )
                                    }
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === 'Enter' &&
                                            (event.metaKey || event.ctrlKey)
                                        ) {
                                            event.preventDefault();
                                            const formData = new FormData();
                                            formData.append(
                                                'body',
                                                commentForm.data.body,
                                            );
                                            commentFiles.forEach((file) =>
                                                formData.append(
                                                    'attachments[]',
                                                    file,
                                                ),
                                            );
                                            router.post(
                                                commentUrl,
                                                formData as any,
                                                {
                                                    preserveScroll: true,
                                                    forceFormData: true,
                                                    onSuccess: () => {
                                                        commentForm.reset(
                                                            'body',
                                                        );
                                                        setCommentFiles([]);
                                                    },
                                                },
                                            );
                                        }
                                    }}
                                />
                                {commentFiles.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {commentFiles.map((file, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                                            >
                                                <Paperclip className="size-3 text-muted-foreground" />
                                                <span className="max-w-[150px] truncate">
                                                    {file.name}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setCommentFiles((f) =>
                                                            f.filter(
                                                                (_, i) =>
                                                                    i !== idx,
                                                            ),
                                                        )
                                                    }
                                                    className="ml-0.5 text-muted-foreground hover:text-foreground"
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                                {commentForm.errors.body ? (
                                    <p className="text-sm text-destructive">
                                        {commentForm.errors.body}
                                    </p>
                                ) : null}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] text-muted-foreground">
                                            Cmd+Enter to send
                                        </p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={(event) => {
                                                if (event.target.files) {
                                                    setCommentFiles((prev) => [
                                                        ...prev,
                                                        ...Array.from(
                                                            event.target.files!,
                                                        ),
                                                    ]);
                                                    event.target.value = '';
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                        >
                                            <Paperclip className="size-3.5" />
                                        </Button>
                                    </div>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={
                                            commentForm.processing ||
                                            (commentForm.data.body.trim() ===
                                                '' &&
                                                commentFiles.length === 0)
                                        }
                                    >
                                        <Send className="size-3.5" />
                                        Comment
                                    </Button>
                                </div>
                            </div>
                        </form>
                    ) : null}
                </section>
            </CrudPage>
        </>
    );
}

IssueShow.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
