import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Calendar,
    Clock,
    Download,
    Image as ImageIcon,
    MessageSquare,
    Paperclip,
    Send,
    Tag,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormField } from '@/components/crud/dynamic-form';
import { IssueDiscussionComment } from '@/components/issues/issue-discussion-comment';
import type { SharedDiscussionComment } from '@/components/issues/issue-discussion-comment';
import { RichIssueContent } from '@/components/issues/rich-issue-content';
import { RichIssueEditor } from '@/components/issues/rich-issue-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

type IssueAttachment = {
    id?: number;
    file_name: string;
    file_path?: string | null;
    mime_type: string;
    file_size: number;
    url?: string | null;
    is_image?: boolean;
};

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

type MentionOption = { id: string; label: string };

function isRichTextEmpty(html: string): boolean {
    return (
        html
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim() === ''
    );
}

function collectMentionOptions(
    comments: SharedDiscussionComment[],
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

    const walk = (nodes?: SharedDiscussionComment[]) => {
        nodes?.forEach((node) => {
            pushUser(node.user ?? undefined);
            walk(node.replies);
        });
    };

    pushUser(authUser);
    walk(comments);

    return Array.from(seen.values());
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
    comments: SharedDiscussionComment[];
    attachments?: IssueAttachment[];
    assignee_options: Array<{ label: string; value: string }>;
    status_options: string[];
    priority_options: string[];
    type_options: string[];
}) {
    const form = useForm({
        title: issue.title,
        description: issue.description ?? '<p></p>',
        assignee_id: issue.assignee_id ? String(issue.assignee_id) : '',
        status: issue.status,
        priority: issue.priority,
        type: issue.type,
        due_date: issue.due_date ?? '',
        estimated_hours: issue.estimated_hours ?? '',
        label: issue.label ?? '',
    });

    const [descriptionFiles, setDescriptionFiles] = useState<File[]>([]);
    
    const [commentDraft, setCommentDraft] = useState('<p></p>');
    const [commentFiles, setCommentFiles] = useState<File[]>([]);
    const [savingComment, setSavingComment] = useState(false);

    const { auth } = usePage<{
        auth: {
            user: { id: number; name: string; avatar_path?: string | null };
        };
    }>().props;

    const commentUrl = `/clients/${client.id}/projects/${project.id}/issues/${issue.id}/comments`;

    const mentionOptions = useMemo(
        () => collectMentionOptions(comments, auth.user),
        [comments, auth.user],
    );

    const fields: DynamicFormField[] = [
        {
            name: 'title',
            label: 'Title',
            type: 'text',
            placeholder: 'Issue title',
            wide: true,
        },
        {
            name: 'description',
            label: 'Description',
            type: 'custom',
            wide: true,
            render: ({ value, onChange, error }) => (
                <div className="space-y-2">
                    <RichIssueEditor
                        value={value}
                        onChange={onChange}
                        placeholder="Write the description, important integration notes, checklist, and context here..."
                        attachments={descriptionFiles}
                        onAttachmentsChange={setDescriptionFiles}
                        mentionOptions={mentionOptions}
                        uploadContext={{
                            attachableType: 'issue',
                            attachableId: issue.id,
                        }}
                    />
                    {error ? (
                        <p className="text-sm text-destructive">{error}</p>
                    ) : null}
                </div>
            )
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

    const saveComment = () => {
        setSavingComment(true);

        const formData = new FormData();
        formData.append('body', commentDraft);
        commentFiles.forEach((file) => formData.append('attachments[]', file));

        router.post(commentUrl, formData as any, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setCommentDraft('<p></p>');
                setCommentFiles([]);
            },
            onFinish: () => setSavingComment(false),
        });
    };

    const saveReply = async (parentId: number, body: string, files: File[]) => {
        return new Promise<void>((resolve, reject) => {
            const formData = new FormData();
            formData.append('body', body);
            formData.append('parent_id', String(parentId));
            files.forEach((file) => formData.append('attachments[]', file));

            router.post(commentUrl, formData as any, {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => resolve(),
                onError: (errors) => reject(errors),
            });
        });
    };

    const updateComment = async (
        commentId: number,
        body: string,
        parentId?: number | null,
    ) => {
        return new Promise<void>((resolve, reject) => {
            router.put(
                `${commentUrl}/${commentId}`,
                {
                    body,
                    ...(parentId ? { parent_id: parentId } : {}),
                },
                {
                    preserveScroll: true,
                    onSuccess: () => resolve(),
                    onError: (errors) => reject(errors),
                },
            );
        });
    };

    const deleteComment = async (commentId: number) => {
        router.delete(`${commentUrl}/${commentId}`, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={issue.title} />
            <CrudPage
                title={issue.title}
                description={`${client.name} / ${project.name}`}
                onBack={() => {
                    const fallbackUrl = `/clients/${client.id}/projects/${project.id}/issues`;

                    if (window.history.length > 1) {
                        router.visit(fallbackUrl);
                    } else {
                        router.visit(fallbackUrl);
                    }
                }}
            >
                <div className="w-full max-w-[1400px] space-y-8">
                    {/* Top Section: Form or Static Badges */}
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
                            onSubmit={() => {
                                form.transform((data) => ({
                                    ...data,
                                    _method: 'put',
                                    attachments: descriptionFiles,
                                }));
                                form.post(
                                    `/clients/${client.id}/projects/${project.id}/issues/${issue.id}`,
                                    {
                                        forceFormData: true,
                                        onSuccess: () => setDescriptionFiles([]),
                                    }
                                );
                            }}
                        />
                    ) : (
                        <section className="rounded-xl border bg-card p-6 shadow-sm">
                            <div className="mb-6 flex flex-wrap gap-2">
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

                            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                                Description
                            </h2>
                            {issue.description ? (
                                <RichIssueContent
                                    html={issue.description}
                                    className="prose-lg text-foreground/95"
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No description.
                                </p>
                            )}
                        </section>
                    )}

                    {/* Attachments Section */}
                    {attachments.length > 0 ? (
                        <section className="space-y-4">
                            <h2 className="flex items-center gap-2 text-base font-semibold">
                                <Paperclip className="size-4" />
                                Attachments
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                    {attachments.length}
                                </span>
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                {attachments.map((att) => {
                                    const isImage = att.mime_type
                                        ? att.mime_type.startsWith('image/')
                                        : att.is_image;

                                    return (
                                        <div
                                            key={att.id ?? att.file_name}
                                            className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm"
                                        >
                                            {isImage ? (
                                                <ImageIcon className="size-4 shrink-0 text-blue-500" />
                                            ) : (
                                                <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                                            )}
                                            {att.file_path ? (
                                                <a
                                                    href={`/storage/${att.file_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline hover:text-primary transition-colors"
                                                >
                                                    {att.file_name}
                                                </a>
                                            ) : (
                                                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                                    {att.file_name}
                                                </span>
                                            )}
                                            {att.file_path ? (
                                                <a
                                                    href={`/storage/${att.file_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                >
                                                    <Download className="size-4" />
                                                </a>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ) : null}

                    {/* Discussion Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-b pb-4">
                            <h2 className="text-xl font-semibold">Discussion</h2>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                {comments.length}
                            </span>
                        </div>

                        {comments.length > 0 ? (
                            <div className="space-y-4">
                                {comments.map((comment) => (
                                    <IssueDiscussionComment
                                        key={comment.id}
                                        comment={comment}
                                        depth={0}
                                        authUserId={auth.user.id}
                                        issueId={issue.id}
                                        canComment={can_comment}
                                        mentionOptions={mentionOptions}
                                        onReply={saveReply}
                                        onUpdate={updateComment}
                                        onDelete={deleteComment}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed bg-card px-4 py-12 text-center shadow-sm">
                                <MessageSquare className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                                <p className="text-sm font-medium text-muted-foreground">
                                    No comments yet. Start the discussion below.
                                </p>
                            </div>
                        )}

                        {can_comment ? (
                            <div className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
                                <RichIssueEditor
                                    value={commentDraft}
                                    onChange={setCommentDraft}
                                    placeholder="Write a comment, checklist, note, integration update, or blocker..."
                                    attachments={commentFiles}
                                    onAttachmentsChange={setCommentFiles}
                                    mentionOptions={mentionOptions}
                                    uploadContext={{
                                        attachableType: 'issue',
                                        attachableId: issue.id,
                                    }}
                                />
                                <div className="mt-3 flex justify-end">
                                    <Button
                                        type="button"
                                        disabled={
                                            savingComment || isRichTextEmpty(commentDraft)
                                        }
                                        onClick={saveComment}
                                    >
                                        <Send className="mr-2 size-4" />
                                        {savingComment ? 'Posting...' : 'Comment'}
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </section>
                </div>
            </CrudPage>
        </>
    );
}

IssueShow.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
