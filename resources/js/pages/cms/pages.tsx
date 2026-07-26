import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';

type SectionRow = {
    id: number;
    key: string;
    title: string;
    body_markdown: string | null;
    metadata: Record<string, unknown> | null;
    sort_order: number;
    is_published: boolean;
};

type SectionFormData = {
    key: string;
    title: string;
    body_markdown: string;
    metadata: string;
    sort_order: string;
    is_published: boolean;
};

const emptyForm: SectionFormData = {
    key: '',
    title: '',
    body_markdown: '',
    metadata: '',
    sort_order: '0',
    is_published: false,
};

export default function CmsPagesPage({ sections }: { sections: SectionRow[] }) {
    const form = useForm<SectionFormData>({ ...emptyForm });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<SectionRow | null>(
        null,
    );
    const [deletingSection, setDeletingSection] = useState<SectionRow | null>(
        null,
    );

    const openCreate = () => {
        setEditingSection(null);
        form.reset();
        form.clearErrors();
        setDialogOpen(true);
    };

    const openEdit = (section: SectionRow) => {
        setEditingSection(section);
        form.setData({
            key: section.key,
            title: section.title,
            body_markdown: section.body_markdown ?? '',
            metadata: section.metadata
                ? JSON.stringify(section.metadata, null, 2)
                : '',
            sort_order: String(section.sort_order ?? 0),
            is_published: section.is_published,
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const submit = () => {
        if (editingSection) {
            form.put(`/cms/pages/${editingSection.id}`, {
                preserveScroll: true,
                onSuccess: () => setDialogOpen(false),
            });
        } else {
            form.post('/cms/pages', {
                preserveScroll: true,
                onSuccess: () => setDialogOpen(false),
            });
        }
    };

    const confirmDelete = () => {
        if (!deletingSection) {
            return;
        }

        router.delete(`/cms/pages/${deletingSection.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingSection(null),
        });
    };

    const columns: DataTableColumn<SectionRow>[] = [
        {
            key: 'key',
            header: 'Key',
            render: (section) => (
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {section.key}
                </code>
            ),
        },
        {
            key: 'title',
            header: 'Title',
            render: (section) => (
                <span className="font-medium">{section.title}</span>
            ),
        },
        {
            key: 'state',
            header: 'State',
            render: (section) =>
                section.is_published ? (
                    <Badge variant="secondary">Published</Badge>
                ) : (
                    <Badge variant="outline">Draft</Badge>
                ),
        },
        {
            key: 'sort_order',
            header: 'Order',
            render: (section) => (
                <span className="text-muted-foreground">
                    {section.sort_order}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: (section) => (
                <div className="flex justify-end gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() => openEdit(section)}
                    >
                        <Pencil className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => setDeletingSection(section)}
                    >
                        <Trash2 className="size-4 text-destructive" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title="CMS Pages" />
            <CrudPage
                title="Content sections"
                description="Manage the keyed content sections that back the public site (about, services, education, Dwell case studies, …)."
                actions={
                    <Button onClick={openCreate}>
                        <Plus className="mr-1.5 size-4" />
                        New section
                    </Button>
                }
            >
                <DataTable
                    columns={columns}
                    rows={sections}
                    emptyText="No content sections yet."
                />

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingSection
                                    ? `Edit ${editingSection.title}`
                                    : 'New content section'}
                            </DialogTitle>
                            <DialogDescription>
                                Sections are looked up by their key. Dots are
                                allowed for namespacing (e.g. dwell.ai).
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            className="grid gap-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                submit();
                            }}
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="section-key">Key</Label>
                                    <Input
                                        id="section-key"
                                        value={form.data.key}
                                        placeholder="about, services, dwell.crm, …"
                                        onChange={(event) =>
                                            form.setData(
                                                'key',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={form.errors.key} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="section-title">Title</Label>
                                    <Input
                                        id="section-title"
                                        value={form.data.title}
                                        placeholder="Section title"
                                        onChange={(event) =>
                                            form.setData(
                                                'title',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={form.errors.title} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="section-body">
                                    Body (markdown)
                                </Label>
                                <Textarea
                                    id="section-body"
                                    className="min-h-40"
                                    value={form.data.body_markdown}
                                    placeholder="Markdown content for this section."
                                    onChange={(event) =>
                                        form.setData(
                                            'body_markdown',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.body_markdown}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="section-metadata">
                                    Metadata (JSON, optional)
                                </Label>
                                <Textarea
                                    id="section-metadata"
                                    className="min-h-24 font-mono text-xs"
                                    value={form.data.metadata}
                                    placeholder='{"live_url":"https://…","tags":["erp"]}'
                                    onChange={(event) =>
                                        form.setData(
                                            'metadata',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError message={form.errors.metadata} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="section-sort">
                                        Sort order
                                    </Label>
                                    <Input
                                        id="section-sort"
                                        value={form.data.sort_order}
                                        placeholder="0"
                                        onChange={(event) =>
                                            form.setData(
                                                'sort_order',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={form.errors.sort_order}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Published</Label>
                                    <label className="flex items-center gap-2 pt-1 text-sm text-foreground">
                                        <Checkbox
                                            checked={form.data.is_published}
                                            onCheckedChange={(checked) =>
                                                form.setData(
                                                    'is_published',
                                                    checked === true,
                                                )
                                            }
                                        />
                                        Visible on the public site
                                    </label>
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline" type="button">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                >
                                    {editingSection
                                        ? 'Save section'
                                        : 'Create section'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={deletingSection !== null}
                    onOpenChange={(open) => !open && setDeletingSection(null)}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete section?</DialogTitle>
                            <DialogDescription>
                                This will permanently remove the "
                                {deletingSection?.key}" section.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                variant="destructive"
                                onClick={confirmDelete}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CrudPage>
        </>
    );
}

CmsPagesPage.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
