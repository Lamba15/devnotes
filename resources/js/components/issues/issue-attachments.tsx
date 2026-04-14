import { router } from '@inertiajs/react';
import {
    Download,
    FileText,
    Image as ImageIcon,
    Paperclip,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type IssueAttachment = {
    id?: number;
    file_name: string;
    file_path?: string | null;
    mime_type: string;
    file_size: number;
    url?: string | null;
    is_image?: boolean;
};

type PersistedProps = {
    attachments: IssueAttachment[];
    canManage?: boolean;
    attachableType?: 'issue' | 'issue_comment';
    attachableId?: number;
    className?: string;
    onChange?: () => void | Promise<void>;
    hideHeader?: boolean;
    allowUpload?: boolean;
};

type PickerProps = {
    files: File[];
    onChange: (files: File[]) => void;
    className?: string;
};

type PreviewAttachment = {
    file: File;
    url: string | null;
};

export function isImageAttachment(attachment: IssueAttachment): boolean {
    return attachment.is_image ?? attachment.mime_type.startsWith('image/');
}

export function formatFileSize(fileSize: number): string {
    if (fileSize < 1024) {
        return `${fileSize} B`;
    }

    if (fileSize < 1024 * 1024) {
        return `${(fileSize / 1024).toFixed(1)} KB`;
    }

    return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

export function IssueAttachmentPicker({
    files,
    onChange,
    className,
}: PickerProps) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [previews, setPreviews] = useState<PreviewAttachment[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const appendFiles = (nextFiles: FileList | File[]) => {
        onChange([...files, ...Array.from(nextFiles)]);
    };

    useEffect(() => {
        const nextPreviews = files.map((file) => ({
            file,
            url: file.type.startsWith('image/')
                ? URL.createObjectURL(file)
                : null,
        }));

        setPreviews(nextPreviews);

        return () => {
            nextPreviews.forEach((preview) => {
                if (preview.url) {
                    URL.revokeObjectURL(preview.url);
                }
            });
        };
    }, [files]);

    return (
        <section
            className={cn(
                'space-y-4 rounded-xl border bg-card p-4 shadow-sm',
                className,
            )}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold">Attachments</h2>
                    <p className="text-sm text-muted-foreground">
                        Images will preview like ticket media. Files stay in a
                        cleaner download list.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        id={inputId}
                        ref={inputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                            if (!event.target.files) {
                                return;
                            }

                            appendFiles(event.target.files);
                            event.target.value = '';
                        }}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => inputRef.current?.click()}
                    >
                        <Upload className="mr-1.5 size-4" />
                        Add images or files
                    </Button>
                </div>
            </div>
            <label
                htmlFor={inputId}
                onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);

                    if (event.dataTransfer.files.length === 0) {
                        return;
                    }

                    appendFiles(event.dataTransfer.files);
                }}
                className={cn(
                    'flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors',
                    isDragging
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border/70 bg-muted/20 hover:bg-muted/40',
                )}
            >
                <Upload className="mb-2 size-5" />
                <p className="text-sm font-medium">Drop images or files here</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Or click to browse and attach up to 10 files.
                </p>
            </label>
            <p className="text-xs text-muted-foreground">
                Selected: {files.length}
            </p>
            <AttachmentContent
                attachments={previews.map((preview) => ({
                    file_name: preview.file.name,
                    mime_type: preview.file.type || 'application/octet-stream',
                    file_size: preview.file.size,
                    url: preview.url,
                    is_image: preview.file.type.startsWith('image/'),
                }))}
                emptyText="No attachments selected yet."
                onDelete={(index) =>
                    onChange(
                        files.filter((_, fileIndex) => fileIndex !== index),
                    )
                }
                deleteLabel="Remove selection"
            />
        </section>
    );
}

export function IssueAttachmentsSection({
    attachments,
    canManage = false,
    attachableType = 'issue',
    attachableId,
    className,
    onChange,
    hideHeader = false,
    allowUpload = true,
}: PersistedProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const uploadFiles = (files: File[]) => {
        if (!attachableId || files.length === 0) {
            return;
        }

        setUploading(true);

        const formData = new FormData();

        files.forEach((file) => {
            formData.append('files[]', file);
        });

        formData.append('attachable_type', attachableType);
        formData.append('attachable_id', String(attachableId));

        router.post('/attachments', formData, {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
                setUploading(false);
                void onChange?.();
            },
        });
    };

    return (
        <section
            className={cn(
                'space-y-4 rounded-xl border bg-card p-4 shadow-sm',
                className,
            )}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {!hideHeader ? (
                    <div>
                        <h2 className="text-base font-semibold">Attachments</h2>
                        <p className="text-sm text-muted-foreground">
                            Images are preview-first. Files stay compact and
                            download-focused.
                        </p>
                    </div>
                ) : (
                    <div />
                )}
                {canManage && attachableId && allowUpload ? (
                    <>
                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                                if (
                                    !event.target.files ||
                                    event.target.files.length === 0
                                ) {
                                    return;
                                }

                                uploadFiles(Array.from(event.target.files));
                                event.target.value = '';
                            }}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            disabled={uploading}
                            onClick={() => inputRef.current?.click()}
                        >
                            <Upload className="mr-1.5 size-4" />
                            {uploading ? 'Uploading...' : 'Add images or files'}
                        </Button>
                    </>
                ) : null}
            </div>
            {canManage && attachableId && allowUpload ? (
                <div
                    onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setIsDragging(false);

                        if (event.dataTransfer.files.length === 0) {
                            return;
                        }

                        uploadFiles(Array.from(event.dataTransfer.files));
                    }}
                    className={cn(
                        'rounded-xl border border-dashed px-4 py-7 text-center transition-colors',
                        isDragging
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border/70 bg-muted/20',
                    )}
                >
                    <Upload className="mx-auto mb-2 size-5" />
                    <p className="text-sm font-medium">Drop files here</p>
                </div>
            ) : null}
            <AttachmentContent
                attachments={attachments}
                emptyText="No attachments on this ticket yet."
                onDelete={
                    canManage
                        ? (index) => {
                              const attachment = attachments[index];

                              if (!attachment?.id) {
                                  return;
                              }

                              router.delete(`/attachments/${attachment.id}`, {
                                  preserveScroll: true,
                                  preserveState: true,
                                  onSuccess: () => {
                                      void onChange?.();
                                  },
                              });
                          }
                        : undefined
                }
                deleteLabel="Remove attachment"
            />
        </section>
    );
}

function AttachmentContent({
    attachments,
    emptyText,
    onDelete,
    deleteLabel,
}: {
    attachments: IssueAttachment[];
    emptyText: string;
    onDelete?: (index: number) => void;
    deleteLabel: string;
}) {
    const images = attachments.filter(isImageAttachment);
    const files = attachments.filter(
        (attachment) => !isImageAttachment(attachment),
    );

    if (attachments.length === 0) {
        return (
            <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                {emptyText}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {images.length > 0 ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <ImageIcon className="size-4 text-blue-500" />
                        Images
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {images.length}
                        </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {images.map((attachment) => {
                            const index = attachments.indexOf(attachment);
                            const src =
                                attachment.url ||
                                (attachment.file_path
                                    ? `/storage/${attachment.file_path}`
                                    : '');

                            return (
                                <div
                                    key={`${attachment.id ?? attachment.file_name}-${index}`}
                                    className="overflow-hidden rounded-xl border bg-muted/20"
                                >
                                    <a
                                        href={src || '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block aspect-[4/3] bg-muted"
                                    >
                                        {src ? (
                                            <img
                                                src={src}
                                                alt={attachment.file_name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-muted-foreground">
                                                <ImageIcon className="size-6" />
                                            </div>
                                        )}
                                    </a>
                                    <div className="flex items-start gap-2 p-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {attachment.file_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatFileSize(
                                                    attachment.file_size,
                                                )}
                                            </p>
                                        </div>
                                        <AttachmentActions
                                            attachment={attachment}
                                            index={index}
                                            onDelete={onDelete}
                                            deleteLabel={deleteLabel}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}
            {files.length > 0 ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Paperclip className="size-4 text-muted-foreground" />
                        Files
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {files.length}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {files.map((attachment) => {
                            const index = attachments.indexOf(attachment);

                            return (
                                <div
                                    key={`${attachment.id ?? attachment.file_name}-${index}`}
                                    className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                                >
                                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                                        <FileText className="size-4 text-muted-foreground" />
                                    </div>
                                    {attachment.url || attachment.file_path ? (
                                        <a
                                            href={
                                                attachment.url ||
                                                `/storage/${attachment.file_path}`
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                            className="min-w-0 flex-1 text-foreground hover:underline"
                                        >
                                            <p className="truncate text-sm font-medium">
                                                {attachment.file_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {attachment.mime_type || 'File'}{' '}
                                                •{' '}
                                                {formatFileSize(
                                                    attachment.file_size,
                                                )}
                                            </p>
                                        </a>
                                    ) : (
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {attachment.file_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {attachment.mime_type || 'File'}{' '}
                                                •{' '}
                                                {formatFileSize(
                                                    attachment.file_size,
                                                )}
                                            </p>
                                        </div>
                                    )}
                                    <AttachmentActions
                                        attachment={attachment}
                                        index={index}
                                        onDelete={onDelete}
                                        deleteLabel={deleteLabel}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function AttachmentActions({
    attachment,
    index,
    onDelete,
    deleteLabel,
}: {
    attachment: IssueAttachment;
    index: number;
    onDelete?: (index: number) => void;
    deleteLabel: string;
}) {
    const src =
        attachment.url ||
        (attachment.file_path ? `/storage/${attachment.file_path}` : '');

    return (
        <div className="flex items-center gap-1">
            {src ? (
                <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    title="Open attachment"
                >
                    <Download className="size-4" />
                </a>
            ) : null}
            {onDelete ? (
                <button
                    type="button"
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-destructive"
                    title={deleteLabel}
                    onClick={() => onDelete(index)}
                >
                    {attachment.id ? (
                        <Trash2 className="size-4" />
                    ) : (
                        <X className="size-4" />
                    )}
                </button>
            ) : null}
        </div>
    );
}
