import { Head, router, useForm } from '@inertiajs/react';
import { Camera, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import AppLayout from '@/layouts/app-layout';

type SkillRow = {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
};

export default function CmsSkillsPage({ skills }: { skills: SkillRow[] }) {
    const createForm = useForm({ name: '' });
    const renameForm = useForm({ name: '' });
    const [editingSkill, setEditingSkill] = useState<SkillRow | null>(null);
    const [deletingSkill, setDeletingSkill] = useState<SkillRow | null>(null);
    const iconInputRef = useRef<HTMLInputElement>(null);
    const iconSkillRef = useRef<SkillRow | null>(null);

    const submitCreate = () => {
        createForm.post('/cms/skills', {
            preserveScroll: true,
            onSuccess: () => createForm.reset(),
        });
    };

    const openRename = (skill: SkillRow) => {
        renameForm.setData('name', skill.name);
        renameForm.clearErrors();
        setEditingSkill(skill);
    };

    const submitRename = () => {
        if (!editingSkill) {
            return;
        }

        renameForm.put(`/cms/skills/${editingSkill.id}`, {
            preserveScroll: true,
            onSuccess: () => setEditingSkill(null),
        });
    };

    const handleIconUpload = (file: File) => {
        const skill = iconSkillRef.current;

        if (!skill) {
            return;
        }

        const formData = new FormData();
        formData.append('icon', file);
        router.post(`/cms/skills/${skill.id}/icon`, formData as any, {
            preserveScroll: true,
            forceFormData: true,
        });
    };

    const confirmDelete = () => {
        if (!deletingSkill) {
            return;
        }

        router.delete(`/cms/skills/${deletingSkill.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingSkill(null),
        });
    };

    const columns: DataTableColumn<SkillRow>[] = [
        {
            key: 'name',
            header: 'Skill',
            render: (skill) => (
                <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                        {skill.icon ? (
                            <AvatarImage
                                src={`/storage/${skill.icon}`}
                                alt={skill.name}
                            />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                            {skill.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{skill.name}</span>
                </div>
            ),
        },
        {
            key: 'slug',
            header: 'Slug',
            render: (skill) => (
                <span className="text-muted-foreground">{skill.slug}</span>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: (skill) => (
                <div className="flex justify-end gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Upload icon"
                        onClick={() => {
                            iconSkillRef.current = skill;
                            iconInputRef.current?.click();
                        }}
                    >
                        <Camera className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Rename"
                        onClick={() => openRename(skill)}
                    >
                        <Pencil className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => setDeletingSkill(skill)}
                    >
                        <Trash2 className="size-4 text-destructive" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title="CMS Skills" />
            <CrudPage
                title="Skills"
                description="Manage the skills shown on projects and the public portfolio."
            >
                <form
                    className="flex max-w-md items-start gap-2"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submitCreate();
                    }}
                >
                    <div className="grid flex-1 gap-1">
                        <Input
                            value={createForm.data.name}
                            placeholder="New skill name"
                            onChange={(event) =>
                                createForm.setData('name', event.target.value)
                            }
                        />
                        <InputError message={createForm.errors.name} />
                    </div>
                    <Button type="submit" disabled={createForm.processing}>
                        <Plus className="mr-1.5 size-4" />
                        Add skill
                    </Button>
                </form>

                <DataTable
                    columns={columns}
                    rows={skills}
                    emptyText="No skills yet."
                />

                <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) {
                            handleIconUpload(file);
                        }

                        event.target.value = '';
                    }}
                />

                <Dialog
                    open={editingSkill !== null}
                    onOpenChange={(open) => !open && setEditingSkill(null)}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Rename skill</DialogTitle>
                            <DialogDescription>
                                Renaming updates the skill everywhere it is
                                used. The slug stays the same.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            className="grid gap-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                submitRename();
                            }}
                        >
                            <div className="grid gap-1">
                                <Input
                                    value={renameForm.data.name}
                                    placeholder="Skill name"
                                    onChange={(event) =>
                                        renameForm.setData(
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError message={renameForm.errors.name} />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    disabled={renameForm.processing}
                                >
                                    Save name
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={deletingSkill !== null}
                    onOpenChange={(open) => !open && setDeletingSkill(null)}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete skill?</DialogTitle>
                            <DialogDescription>
                                This will permanently remove "
                                {deletingSkill?.name}" and detach it from all
                                projects.
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

CmsSkillsPage.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
