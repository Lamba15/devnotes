import { usePage } from '@inertiajs/react';
import { CornerDownRight, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { IssueAttachmentsSection } from '@/components/issues/issue-attachments';
import { RichIssueContent } from '@/components/issues/rich-issue-content';
import { RichIssueEditor } from '@/components/issues/rich-issue-editor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDetailedTimestamp } from '@/lib/datetime';
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

export type SharedDiscussionComment = {
    id: number;
    body: string;
    parent_id: number | null;
    created_at?: string;
    user: {
        id: number;
        name: string;
        avatar_path?: string | null;
    } | null;
    attachments?: IssueAttachment[];
    replies: SharedDiscussionComment[];
};

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function isRichTextEmpty(html: string): boolean {
    return (
        html
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim() === ''
    );
}

export function IssueDiscussionComment({
    comment,
    depth,
    authUserId,
    canComment,
    mentionOptions,
    issueId,
    onReply,
    onUpdate,
    onDelete,
}: {
    comment: SharedDiscussionComment;
    depth: number;
    authUserId: number;
    canComment: boolean;
    mentionOptions: { id: string; label: string }[];
    issueId: number;
    onReply: (parentId: number, body: string, files: File[]) => Promise<void>;
    onUpdate: (
        commentId: number,
        body: string,
        parentId?: number | null,
    ) => Promise<void>;
    onDelete: (commentId: number) => void;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const name = comment.user?.name ?? 'Unknown';
    const avatarSrc = comment.user?.avatar_path
        ? `/storage/${comment.user.avatar_path}`
        : null;
    const [editing, setEditing] = useState(false);
    const [editDraft, setEditDraft] = useState(comment.body || '<p></p>');
    const [savingEdit, setSavingEdit] = useState(false);
    const [replying, setReplying] = useState(false);
    const [replyDraft, setReplyDraft] = useState('<p></p>');
    const [replyFiles, setReplyFiles] = useState<File[]>([]);
    const [savingReply, setSavingReply] = useState(false);

    useEffect(() => {
        setEditDraft(comment.body || '<p></p>');
    }, [comment.body]);

    return (
        <div className="space-y-3">
            <div
                className="rounded-xl border bg-background p-3 shadow-sm"
                style={{ marginLeft: `${Math.min(depth, 3) * 16}px` }}
            >
                <div className="flex items-start gap-3">
                    <Avatar className="size-8 shrink-0">
                        {avatarSrc ? (
                            <AvatarImage src={avatarSrc} alt={name} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {getInitials(name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{name}</p>
                            <div className="flex items-center gap-2">
                                {comment.created_at ? (
                                    <p className="text-xs text-muted-foreground">
                                        {formatDetailedTimestamp(
                                            comment.created_at,
                                            {
                                                timeZone: auth.user.timezone,
                                            },
                                        )}
                                    </p>
                                ) : null}
                                {comment.user?.id === authUserId ? (
                                    <button
                                        type="button"
                                        className="inline-flex cursor-pointer items-center text-muted-foreground hover:text-destructive"
                                        onClick={() => onDelete(comment.id)}
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                ) : null}
                            </div>
                        </div>
                        {editing ? (
                            <div className="mt-3 space-y-3">
                                <RichIssueEditor
                                    value={editDraft}
                                    onChange={setEditDraft}
                                    placeholder="Update this comment..."
                                    attachments={[]}
                                    onAttachmentsChange={() => {}}
                                    mentionOptions={mentionOptions}
                                    uploadContext={{
                                        attachableType: 'issue',
                                        attachableId: issueId,
                                    }}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setEditing(false);
                                            setEditDraft(
                                                comment.body || '<p></p>',
                                            );
                                        }}
                                    >
                                        <X className="size-4" />
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={
                                            savingEdit ||
                                            isRichTextEmpty(editDraft)
                                        }
                                        onClick={async () => {
                                            setSavingEdit(true);

                                            try {
                                                await onUpdate(
                                                    comment.id,
                                                    editDraft,
                                                    comment.parent_id,
                                                );
                                                setEditing(false);
                                            } finally {
                                                setSavingEdit(false);
                                            }
                                        }}
                                    >
                                        {savingEdit ? 'Saving...' : 'Save'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <RichIssueContent
                                html={comment.body}
                                className="mt-2 text-sm"
                            />
                        )}
                        {comment.attachments?.filter(
                            (attachment) => !attachment.is_image,
                        ).length ? (
                            <IssueAttachmentsSection
                                attachments={comment.attachments.filter(
                                    (attachment) => !attachment.is_image,
                                )}
                                hideHeader
                                allowUpload={false}
                                className="mt-3 p-3"
                            />
                        ) : null}
                        <div className="mt-3 flex items-center gap-2">
                            {canComment ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setReplying((value) => !value)
                                    }
                                >
                                    <CornerDownRight className="size-4" />
                                    Reply
                                </Button>
                            ) : null}
                            {comment.user?.id === authUserId ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setEditing((value) => !value)
                                    }
                                >
                                    <Pencil className="size-4" />
                                    Edit
                                </Button>
                            ) : null}
                        </div>
                        {replying ? (
                            <div className="mt-3 space-y-3 rounded-xl border bg-muted/20 p-3">
                                <RichIssueEditor
                                    value={replyDraft}
                                    onChange={setReplyDraft}
                                    placeholder="Write a reply, checklist, follow-up, or decision..."
                                    attachments={replyFiles}
                                    onAttachmentsChange={setReplyFiles}
                                    mentionOptions={mentionOptions}
                                    uploadContext={{
                                        attachableType: 'issue',
                                        attachableId: issueId,
                                    }}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setReplying(false);
                                            setReplyDraft('<p></p>');
                                            setReplyFiles([]);
                                        }}
                                    >
                                        <X className="size-4" />
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={
                                            savingReply ||
                                            isRichTextEmpty(replyDraft)
                                        }
                                        onClick={async () => {
                                            setSavingReply(true);

                                            try {
                                                await onReply(
                                                    comment.id,
                                                    replyDraft,
                                                    replyFiles,
                                                );
                                                setReplying(false);
                                                setReplyDraft('<p></p>');
                                                setReplyFiles([]);
                                            } finally {
                                                setSavingReply(false);
                                            }
                                        }}
                                    >
                                        {savingReply ? 'Saving...' : 'Reply'}
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {comment.replies?.length > 0 ? (
                <div className="space-y-3">
                    {comment.replies.map((reply) => (
                        <IssueDiscussionComment
                            key={reply.id}
                            comment={reply}
                            depth={depth + 1}
                            authUserId={authUserId}
                            issueId={issueId}
                            canComment={canComment}
                            mentionOptions={mentionOptions}
                            onReply={onReply}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
