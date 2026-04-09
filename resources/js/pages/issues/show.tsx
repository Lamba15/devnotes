import { Head, router, useForm } from '@inertiajs/react';
import { ChevronRight, MessageSquare, Send } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormField } from '@/components/crud/dynamic-form';
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
};

type IssueComment = {
    id: number;
    body: string;
    parent_id: number | null;
    user: {
        id: number;
        name: string;
    } | null;
    replies: IssueComment[];
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
    onReplyToggle,
    onReplyChange,
    onReplySubmit,
}: {
    comment: IssueComment;
    canReply: boolean;
    replyBody: string;
    replyingTo: number | null;
    onReplyToggle: (commentId: number) => void;
    onReplyChange: (commentId: number, value: string) => void;
    onReplySubmit: (commentId: number) => void;
}) {
    const name = comment.user?.name ?? 'Unknown';
    const isReplying = replyingTo === comment.id;
    const hasReplies = comment.replies.length > 0;
    const [collapsed, setCollapsed] = useState(false);

    const totalReplies = countReplies(comment);

    return (
        <div className="flex gap-3">
            {/* Avatar + collapse line */}
            <div className="flex shrink-0 flex-col items-center">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(name)}
                </div>
                {hasReplies ? (
                    <button
                        type="button"
                        onClick={() => setCollapsed((c) => !c)}
                        className="group/line mt-1 flex w-5 flex-1 cursor-pointer justify-center"
                        title={collapsed ? 'Expand replies' : 'Collapse replies'}
                    >
                        <div className="w-px bg-border transition-colors group-hover/line:bg-primary" />
                    </button>
                ) : null}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pb-4">
                <p className="text-sm font-medium text-foreground">{name}</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                    {comment.body}
                </p>

                <div className="mt-2 flex items-center gap-3">
                    {canReply ? (
                        <button
                            type="button"
                            onClick={() => onReplyToggle(comment.id)}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
                        >
                            <MessageSquare className="size-3" />
                            Reply
                        </button>
                    ) : null}

                    {hasReplies && collapsed ? (
                        <button
                            type="button"
                            onClick={() => setCollapsed(false)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:text-primary/80"
                        >
                            <ChevronRight className="size-3" />
                            {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}
                        </button>
                    ) : null}
                </div>

                {/* Inline reply form */}
                {isReplying ? (
                    <div className="mt-3 flex gap-2">
                        <Textarea
                            value={replyBody}
                            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                                onReplyChange(comment.id, event.target.value)
                            }
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
    });
    const commentForm = useForm({
        body: '',
    });
    const [replyBodies, setReplyBodies] = useState<Record<number, string>>({});
    const [replyingTo, setReplyingTo] = useState<number | null>(null);

    const commentUrl = `/clients/${client.id}/projects/${project.id}/issues/${issue.id}/comments`;

    const fields: DynamicFormField[] = [
        { name: 'title', label: 'Title', type: 'text', placeholder: 'Issue title' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description' },
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
            options: status_options.map((status) => ({ label: status, value: status })),
        },
        {
            name: 'priority',
            label: 'Priority',
            type: 'select',
            options: priority_options.map((priority) => ({ label: priority, value: priority })),
        },
        {
            name: 'type',
            label: 'Type',
            type: 'select',
            options: type_options.map((type) => ({ label: type, value: type })),
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
                            form.setData(
                                name as
                                    | 'title'
                                    | 'description'
                                    | 'assignee_id'
                                    | 'status'
                                    | 'priority'
                                    | 'type',
                                value,
                            )
                        }
                        onSubmit={() => form.put(`/clients/${client.id}/projects/${project.id}/issues/${issue.id}`)}
                    />
                ) : (
                    <section className="rounded-xl bg-card p-4 shadow-sm">
                        <p className="text-sm text-muted-foreground">{issue.description ?? 'No description.'}</p>
                        <div className="mt-4 grid gap-2 text-sm">
                            <p>Assignee: {issue.assignee?.name ?? 'Unassigned'}</p>
                            <p>Status: {issue.status}</p>
                            <p>Priority: {issue.priority}</p>
                            <p>Type: {issue.type}</p>
                        </div>
                    </section>
                )}

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
                                commentForm.post(commentUrl, {
                                    preserveScroll: true,
                                    onSuccess: () => commentForm.reset('body'),
                                });
                            }}
                        >
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                You
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                                <Textarea
                                    name="comment_body"
                                    value={commentForm.data.body}
                                    placeholder="Add a comment..."
                                    className="min-h-20 resize-none text-sm"
                                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                                        commentForm.setData('body', event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === 'Enter' &&
                                            (event.metaKey || event.ctrlKey)
                                        ) {
                                            event.preventDefault();
                                            commentForm.post(commentUrl, {
                                                preserveScroll: true,
                                                onSuccess: () =>
                                                    commentForm.reset('body'),
                                            });
                                        }
                                    }}
                                />
                                {commentForm.errors.body ? (
                                    <p className="text-sm text-destructive">
                                        {commentForm.errors.body}
                                    </p>
                                ) : null}
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-muted-foreground">
                                        Cmd+Enter to send
                                    </p>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={
                                            commentForm.processing ||
                                            commentForm.data.body.trim() === ''
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
