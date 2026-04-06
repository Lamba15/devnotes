import { Head, router, useForm } from '@inertiajs/react';
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormField } from '@/components/crud/dynamic-form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';

type Issue = {
    id: number;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    type: string;
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

function CommentThread({
    comments,
    canComment,
    replyBodies,
    onReplyChange,
    onReplySubmit,
}: {
    comments: IssueComment[];
    canComment: boolean;
    replyBodies: Record<number, string>;
    onReplyChange: (commentId: number, value: string) => void;
    onReplySubmit: (commentId: number) => void;
}) {
    return (
        <div className="space-y-4">
            {comments.map((comment) => (
                <article key={comment.id} className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                    <div className="space-y-2">
                        <p className="text-sm font-medium">{comment.user?.name ?? 'Unknown user'}</p>
                        <p className="text-sm text-foreground">{comment.body}</p>
                    </div>

                    {canComment ? (
                        <div className="mt-4 space-y-2 border-l pl-4">
                            <Textarea
                                name={`reply_body_${comment.id}`}
                                value={replyBodies[comment.id] ?? ''}
                                placeholder="Write a reply..."
                                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                                    onReplyChange(comment.id, event.target.value)
                                }
                            />
                            <Button type="button" size="sm" onClick={() => onReplySubmit(comment.id)}>
                                Reply
                            </Button>
                        </div>
                    ) : null}

                    {comment.replies.length > 0 ? (
                        <div className="mt-4 border-l pl-4">
                            <CommentThread
                                comments={comment.replies}
                                canComment={canComment}
                                replyBodies={replyBodies}
                                onReplyChange={onReplyChange}
                                onReplySubmit={onReplySubmit}
                            />
                        </div>
                    ) : null}
                </article>
            ))}
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
    status_options: string[];
    priority_options: string[];
    type_options: string[];
}) {
    const form = useForm({
        title: issue.title,
        description: issue.description ?? '',
        status: issue.status,
        priority: issue.priority,
        type: issue.type,
    });
    const commentForm = useForm({
        body: '',
    });
    const [replyBodies, setReplyBodies] = useState<Record<number, string>>({});

    const commentUrl = `/clients/${client.id}/projects/${project.id}/issues/${issue.id}/comments`;

    const fields: DynamicFormField[] = [
        { name: 'title', label: 'Title', type: 'text', placeholder: 'Issue title' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description' },
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
                },
            },
        );
    };

    return (
        <>
            <Head title={issue.title} />
            <CrudPage title={issue.title} description={`${client.name} / ${project.name}`}>
                {can_manage_issue ? (
                    <section className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <DynamicForm
                            fields={fields}
                            data={form.data}
                            errors={form.errors}
                            processing={form.processing}
                            submitLabel="Update issue"
                            onChange={(name, value) =>
                                form.setData(name as 'title' | 'description' | 'status' | 'priority' | 'type', value)
                            }
                            onSubmit={() => form.put(`/clients/${client.id}/projects/${project.id}/issues/${issue.id}`)}
                        />
                    </section>
                ) : (
                    <section className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">{issue.description ?? 'No description.'}</p>
                        <div className="mt-4 grid gap-2 text-sm">
                            <p>Status: {issue.status}</p>
                            <p>Priority: {issue.priority}</p>
                            <p>Type: {issue.type}</p>
                        </div>
                    </section>
                )}

                <section className="mt-6 rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold">Discussion</h2>
                        <p className="text-sm text-muted-foreground">Comments and replies stay attached to this issue.</p>
                    </div>

                    {can_comment ? (
                        <form
                            className="mt-4 space-y-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                commentForm.post(commentUrl, {
                                    preserveScroll: true,
                                    onSuccess: () => commentForm.reset('body'),
                                });
                            }}
                        >
                            <Textarea
                                name="comment_body"
                                value={commentForm.data.body}
                                placeholder="Add a comment..."
                                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                                    commentForm.setData('body', event.target.value)
                                }
                            />
                            {commentForm.errors.body ? (
                                <p className="text-sm text-destructive">{commentForm.errors.body}</p>
                            ) : null}
                            <Button type="submit" disabled={commentForm.processing}>
                                Add comment
                            </Button>
                        </form>
                    ) : null}

                    <div className="mt-6">
                        {comments.length > 0 ? (
                            <CommentThread
                                comments={comments}
                                canComment={can_comment}
                                replyBodies={replyBodies}
                                onReplyChange={(commentId, value) =>
                                    setReplyBodies((current) => ({
                                        ...current,
                                        [commentId]: value,
                                    }))
                                }
                                onReplySubmit={submitReply}
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground">No comments yet.</p>
                        )}
                    </div>
                </section>
            </CrudPage>
        </>
    );
}

IssueShow.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
