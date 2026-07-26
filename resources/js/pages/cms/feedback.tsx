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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';

type FeedbackRow = {
    id: number;
    name: string;
    role: string | null;
    quote: string;
    source: string;
    rating: number | null;
    project_id: number | null;
    project: { id: number; name: string } | null;
    sort_order: number;
    is_published: boolean;
};

type FeedbackFormData = {
    name: string;
    role: string;
    quote: string;
    source: string;
    rating: string;
    project_id: string;
    sort_order: string;
    is_published: boolean;
};

const emptyForm: FeedbackFormData = {
    name: '',
    role: '',
    quote: '',
    source: 'direct',
    rating: '',
    project_id: '',
    sort_order: '0',
    is_published: false,
};

export default function CmsFeedbackPage({
    feedback,
    projects,
}: {
    feedback: FeedbackRow[];
    projects: Array<{ id: number; name: string }>;
}) {
    const form = useForm<FeedbackFormData>({ ...emptyForm });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingFeedback, setEditingFeedback] = useState<FeedbackRow | null>(
        null,
    );
    const [deletingFeedback, setDeletingFeedback] =
        useState<FeedbackRow | null>(null);

    const openCreate = () => {
        setEditingFeedback(null);
        form.reset();
        form.clearErrors();
        setDialogOpen(true);
    };

    const openEdit = (row: FeedbackRow) => {
        setEditingFeedback(row);
        form.setData({
            name: row.name,
            role: row.role ?? '',
            quote: row.quote,
            source: row.source,
            rating: row.rating ? String(row.rating) : '',
            project_id: row.project_id ? String(row.project_id) : '',
            sort_order: String(row.sort_order ?? 0),
            is_published: row.is_published,
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const submit = () => {
        if (editingFeedback) {
            form.put(`/cms/feedback/${editingFeedback.id}`, {
                preserveScroll: true,
                onSuccess: () => setDialogOpen(false),
            });
        } else {
            form.post('/cms/feedback', {
                preserveScroll: true,
                onSuccess: () => setDialogOpen(false),
            });
        }
    };

    const confirmDelete = () => {
        if (!deletingFeedback) {
            return;
        }

        router.delete(`/cms/feedback/${deletingFeedback.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingFeedback(null),
        });
    };

    const columns: DataTableColumn<FeedbackRow>[] = [
        {
            key: 'name',
            header: 'Client',
            render: (row) => (
                <div>
                    <span className="font-medium">{row.name}</span>
                    {row.role ? (
                        <span className="block text-xs text-muted-foreground">
                            {row.role}
                        </span>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'quote',
            header: 'Quote',
            render: (row) => (
                <span className="line-clamp-2 max-w-md text-sm text-muted-foreground">
                    {row.quote}
                </span>
            ),
        },
        {
            key: 'source',
            header: 'Source',
            render: (row) => (
                <Badge variant="outline" className="capitalize">
                    {row.source}
                </Badge>
            ),
        },
        {
            key: 'rating',
            header: 'Rating',
            render: (row) => (
                <span className="text-muted-foreground">
                    {row.rating ? `${row.rating}/5` : '—'}
                </span>
            ),
        },
        {
            key: 'project',
            header: 'Project',
            render: (row) =>
                row.project ? (
                    <span className="text-sm">{row.project.name}</span>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            key: 'state',
            header: 'State',
            render: (row) =>
                row.is_published ? (
                    <Badge variant="secondary">Published</Badge>
                ) : (
                    <Badge variant="outline">Draft</Badge>
                ),
        },
        {
            key: 'sort_order',
            header: 'Order',
            render: (row) => (
                <span className="text-muted-foreground">{row.sort_order}</span>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: (row) => (
                <div className="flex justify-end gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() => openEdit(row)}
                    >
                        <Pencil className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => setDeletingFeedback(row)}
                    >
                        <Trash2 className="size-4 text-destructive" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title="CMS Feedback" />
            <CrudPage
                title="Feedback"
                description="Manage the testimonials and client feedback shown on the public portfolio."
                actions={
                    <Button onClick={openCreate}>
                        <Plus className="mr-1.5 size-4" />
                        New feedback
                    </Button>
                }
            >
                <DataTable
                    columns={columns}
                    rows={feedback}
                    emptyText="No feedback yet."
                />

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingFeedback
                                    ? `Edit feedback from ${editingFeedback.name}`
                                    : 'New feedback'}
                            </DialogTitle>
                            <DialogDescription>
                                Published feedback appears on the public
                                portfolio API.
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
                                    <Label htmlFor="feedback-name">Name</Label>
                                    <Input
                                        id="feedback-name"
                                        value={form.data.name}
                                        placeholder="Fuad"
                                        onChange={(event) =>
                                            form.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={form.errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="feedback-role">
                                        Role / context (optional)
                                    </Label>
                                    <Input
                                        id="feedback-role"
                                        value={form.data.role}
                                        placeholder="CEO, Tropical"
                                        onChange={(event) =>
                                            form.setData(
                                                'role',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={form.errors.role} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="feedback-quote">Quote</Label>
                                <Textarea
                                    id="feedback-quote"
                                    className="min-h-32"
                                    value={form.data.quote}
                                    placeholder="What the client said."
                                    onChange={(event) =>
                                        form.setData(
                                            'quote',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError message={form.errors.quote} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="feedback-source">
                                        Source
                                    </Label>
                                    <SearchableSelect
                                        id="feedback-source"
                                        value={form.data.source}
                                        isClearable={false}
                                        isSearchable={false}
                                        onValueChange={(value) =>
                                            form.setData('source', value)
                                        }
                                        options={[
                                            {
                                                value: 'direct',
                                                label: 'Direct',
                                            },
                                            {
                                                value: 'upwork',
                                                label: 'Upwork',
                                            },
                                        ]}
                                    />
                                    <InputError message={form.errors.source} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="feedback-rating">
                                        Rating (optional)
                                    </Label>
                                    <SearchableSelect
                                        id="feedback-rating"
                                        value={form.data.rating}
                                        isClearable
                                        isSearchable={false}
                                        placeholder="No rating"
                                        onValueChange={(value) =>
                                            form.setData('rating', value)
                                        }
                                        options={[1, 2, 3, 4, 5].map(
                                            (value) => ({
                                                value: String(value),
                                                label: `${value}/5`,
                                            }),
                                        )}
                                    />
                                    <InputError message={form.errors.rating} />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="feedback-project">
                                        Linked project (optional)
                                    </Label>
                                    <SearchableSelect
                                        id="feedback-project"
                                        value={form.data.project_id}
                                        isClearable
                                        placeholder="No project"
                                        onValueChange={(value) =>
                                            form.setData('project_id', value)
                                        }
                                        options={projects.map((project) => ({
                                            value: String(project.id),
                                            label: project.name,
                                        }))}
                                    />
                                    <InputError
                                        message={form.errors.project_id}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="feedback-sort">
                                        Sort order
                                    </Label>
                                    <Input
                                        id="feedback-sort"
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
                                    {editingFeedback
                                        ? 'Save feedback'
                                        : 'Create feedback'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={deletingFeedback !== null}
                    onOpenChange={(open) => !open && setDeletingFeedback(null)}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete feedback?</DialogTitle>
                            <DialogDescription>
                                This will permanently remove the feedback from "
                                {deletingFeedback?.name}".
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

CmsFeedbackPage.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
