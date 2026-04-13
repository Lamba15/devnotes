import { EditorContent, ReactRenderer, useEditor } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Image as ImageIcon,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Paperclip,
    CheckSquare2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
    forwardRef,
    useEffect,
    useId,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { cn } from '@/lib/utils';

type MentionOption = { id: string; label: string };

type MentionListHandle = {
    onKeyDown: (event: KeyboardEvent) => boolean;
};

const MentionList = forwardRef<
    MentionListHandle,
    {
        items: MentionOption[];
        command: (item: MentionOption) => void;
    }
>(({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        setSelectedIndex(0);
    }, [items]);

    const selectItem = (index: number) => {
        const item = items[index];

        if (item) {
            command(item);
        }
    };

    useImperativeHandle(ref, () => ({
        onKeyDown: (event: KeyboardEvent) => {
            if (items.length === 0) {
                return false;
            }

            if (event.key === 'ArrowUp') {
                setSelectedIndex(
                    (selectedIndex + items.length - 1) % items.length,
                );
                return true;
            }

            if (event.key === 'ArrowDown') {
                setSelectedIndex((selectedIndex + 1) % items.length);
                return true;
            }

            if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault();
                selectItem(selectedIndex);
                return true;
            }

            return false;
        },
    }));

    if (items.length === 0) {
        return null;
    }

    return (
        <div className="overflow-hidden rounded-xl border bg-popover p-1 shadow-lg">
            {items.map((item, index) => (
                <button
                    key={item.id}
                    type="button"
                    className={cn(
                        'flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-muted',
                        index === selectedIndex && 'bg-muted',
                    )}
                    onMouseDown={(event) => {
                        event.preventDefault();
                        selectItem(index);
                    }}
                >
                    @{item.label}
                </button>
            ))}
        </div>
    );
});

MentionList.displayName = 'MentionList';

export function RichIssueEditor({
    value,
    onChange,
    placeholder,
    attachments,
    onAttachmentsChange,
    className,
    mentionOptions = [],
    uploadContext,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    attachments: File[];
    onAttachmentsChange: (files: File[]) => void;
    className?: string;
    mentionOptions?: MentionOption[];
    uploadContext?: { attachableType: string; attachableId: number };
}) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const attachmentsRef = useRef<File[]>(attachments);
    attachmentsRef.current = attachments;
    const [isDragging, setIsDragging] = useState(false);
    const [previews, setPreviews] = useState<
        Array<{ file: File; url: string | null }>
    >([]);
    const [uploadingCount, setUploadingCount] = useState(0);
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            Link.configure({ openOnClick: false, autolink: true }),
            Mention.configure({
                HTMLAttributes: {
                    class: 'rounded bg-primary/10 px-1 py-0.5 text-primary',
                },
                renderText({ node }) {
                    return `@${node.attrs.label ?? node.attrs.id}`;
                },
                suggestion: {
                    items: ({ query }) =>
                        mentionOptions
                            .filter((option) =>
                                option.label
                                    .toLowerCase()
                                    .startsWith(query.toLowerCase()),
                            )
                            .slice(0, 5),
                    render: () => {
                        let component: ReactRenderer<MentionListHandle> | null =
                            null;
                        let popup: TippyInstance[] | null = null;

                        return {
                            onStart: (props) => {
                                component = new ReactRenderer(MentionList, {
                                    props: {
                                        items: props.items,
                                        command: props.command,
                                    },
                                    editor: props.editor,
                                });

                                if (!props.clientRect) {
                                    return;
                                }

                                popup = tippy('body', {
                                    getReferenceClientRect: props.clientRect,
                                    appendTo: () => document.body,
                                    content: component.element,
                                    showOnCreate: true,
                                    interactive: true,
                                    trigger: 'manual',
                                    placement: 'bottom-start',
                                });
                            },
                            onUpdate(props) {
                                component?.updateProps({
                                    items: props.items,
                                    command: props.command,
                                });

                                if (!props.clientRect) {
                                    return;
                                }

                                popup?.[0]?.setProps({
                                    getReferenceClientRect: props.clientRect,
                                });
                            },
                            onKeyDown(props) {
                                if (props.event.key === 'Escape') {
                                    popup?.[0]?.hide();

                                    return true;
                                }

                                return (
                                    component?.ref?.onKeyDown(props.event) ??
                                    false
                                );
                            },
                            onExit() {
                                popup?.[0]?.destroy();
                                component?.destroy();
                            },
                        };
                    },
                },
            }),
            Placeholder.configure({ placeholder }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Image,
        ],
        content: value,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'min-h-32 px-4 py-3 outline-none prose prose-sm max-w-none [&_a]:!text-primary dark:prose-invert',
            },
        },
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
    });

    useEffect(() => {
        if (!editor) {
            return;
        }

        if (editor.getHTML() !== value) {
            editor.commands.setContent(value || '<p></p>', {
                emitUpdate: false,
            });
        }
    }, [editor, value]);

    useEffect(() => {
        const nextPreviews = attachments.map((file) => ({
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
    }, [attachments]);

    const uploadImageFile = async (file: File): Promise<string | null> => {
        if (!uploadContext) {
            return null;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('attachable_type', uploadContext.attachableType);
        formData.append('attachable_id', String(uploadContext.attachableId));

        const csrf =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') ?? '';

        try {
            const response = await fetch('/attachments', {
                method: 'POST',
                body: formData,
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf,
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            const imageAttachment = (data.attachments ?? []).find(
                (a: { is_image?: boolean }) => a.is_image,
            );

            return imageAttachment?.url ?? null;
        } catch {
            return null;
        }
    };

    const handleFiles = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        const imageFiles = fileArray.filter((f) => f.type.startsWith('image/'));
        const nonImageFiles = fileArray.filter(
            (f) => !f.type.startsWith('image/'),
        );

        if (nonImageFiles.length > 0) {
            onAttachmentsChange([...attachmentsRef.current, ...nonImageFiles]);
        }

        if (imageFiles.length > 0 && uploadContext && editor) {
            setUploadingCount((c) => c + imageFiles.length);

            try {
                for (const file of imageFiles) {
                    const url = await uploadImageFile(file);

                    if (url) {
                        editor
                            .chain()
                            .focus()
                            .setImage({ src: url, alt: file.name })
                            .run();
                    } else {
                        onAttachmentsChange([...attachmentsRef.current, file]);
                    }
                }
            } finally {
                setUploadingCount((c) => c - imageFiles.length);
            }
        } else if (imageFiles.length > 0) {
            onAttachmentsChange([...attachmentsRef.current, ...imageFiles]);
        }
    };

    if (!editor) {
        return null;
    }

    return (
        <div
            className={cn(
                'overflow-hidden rounded-2xl border bg-card shadow-sm',
                isDragging && 'border-primary bg-primary/5',
                className,
            )}
            onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);

                if (event.dataTransfer.files.length > 0) {
                    handleFiles(event.dataTransfer.files);
                }
            }}
        >
            <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
                <ToolbarButton
                    pressed={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    <Bold className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    pressed={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <Italic className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    pressed={editor.isActive('bulletList')}
                    onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                    }
                >
                    <List className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    pressed={editor.isActive('orderedList')}
                    onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                    }
                >
                    <ListOrdered className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    pressed={editor.isActive('taskList')}
                    onClick={() =>
                        editor.chain().focus().toggleTaskList().run()
                    }
                >
                    <CheckSquare2 className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => {
                        const previousUrl = editor.getAttributes('link').href;
                        const url = window.prompt(
                            'Enter link URL',
                            previousUrl || 'https://',
                        );

                        if (url === null) {
                            return;
                        }

                        if (url === '') {
                            editor.chain().focus().unsetLink().run();
                            return;
                        }

                        editor
                            .chain()
                            .focus()
                            .extendMarkRange('link')
                            .setLink({ href: url })
                            .run();
                    }}
                >
                    <LinkIcon className="size-4" />
                </ToolbarButton>
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

                        handleFiles(event.target.files);
                        event.target.value = '';
                    }}
                />
                <ToolbarButton onClick={() => inputRef.current?.click()}>
                    <Paperclip className="size-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => inputRef.current?.click()}>
                    <ImageIcon className="size-4" />
                </ToolbarButton>
                {attachments.length > 0 ? (
                    <div className="ml-2 flex min-w-0 flex-1 flex-wrap gap-1.5">
                        {previews.map((preview, index) => (
                            <div
                                key={`${preview.file.name}-${index}`}
                                className="inline-flex max-w-full items-center gap-2 rounded-full border bg-background px-2 py-1 text-xs"
                            >
                                <Paperclip className="size-3 text-muted-foreground" />
                                <span className="max-w-36 truncate">
                                    {preview.file.name}
                                </span>
                                <button
                                    type="button"
                                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                                    onClick={() =>
                                        onAttachmentsChange(
                                            attachments.filter(
                                                (_, fileIndex) =>
                                                    fileIndex !== index,
                                            ),
                                        )
                                    }
                                >
                                    x
                                </button>
                            </div>
                        ))}
                    </div>
                ) : null}
                {uploadingCount > 0 ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                        Uploading image{uploadingCount > 1 ? 's' : ''}...
                    </span>
                ) : null}
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}

function ToolbarButton({
    children,
    onClick,
    pressed = false,
}: {
    children: ReactNode;
    onClick: () => void;
    pressed?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-background hover:text-foreground',
                pressed && 'bg-background text-foreground shadow-sm',
            )}
        >
            {children}
        </button>
    );
}
