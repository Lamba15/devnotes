import { Head, router, useForm } from '@inertiajs/react';
import { Camera, X } from 'lucide-react';
import { useRef } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ProjectsEdit({
    client,
    project,
    statuses,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    project: {
        id: number;
        name: string;
        description: string | null;
        status_id: number;
        budget: string | null;
        currency: string | null;
        image_path: string | null;
    };
    statuses: Array<{ id: number; name: string; slug: string }>;
}) {
    const form = useForm({
        name: project.name ?? '',
        description: project.description ?? '',
        status_id: project.status_id ? String(project.status_id) : '',
        budget: project.budget ?? '',
        currency: project.currency ?? 'USD',
    });
    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        router.post(`/clients/${client.id}/projects/${project.id}/image`, formData as any, {
            preserveScroll: true,
            forceFormData: true,
        });
    };

    const handleImageRemove = () => {
        router.delete(`/clients/${client.id}/projects/${project.id}/image`, {
            preserveScroll: true,
        });
    };

    const sections: DynamicFormSection[] = [
        {
            name: 'project',
            title: 'Edit project',
            description:
                'Update this project using the same dedicated edit flow as the rest of the system.',
            fields: [
                {
                    name: 'name',
                    label: 'Name',
                    type: 'text',
                    placeholder: 'Project name',
                    wide: true,
                },
                {
                    name: 'description',
                    label: 'Description',
                    type: 'textarea',
                    placeholder: 'Optional description',
                    wide: true,
                },
                {
                    name: 'status_id',
                    label: 'Status',
                    type: 'select',
                    placeholder: 'Select status',
                    options: statuses.map((status) => ({
                        label: status.name,
                        value: status.id,
                    })),
                },
                {
                    name: 'budget',
                    label: 'Budget',
                    type: 'text',
                    placeholder: 'e.g. 5000',
                },
                {
                    name: 'currency',
                    label: 'Currency',
                    type: 'select',
                    options: [
                        { label: 'USD', value: 'USD' },
                        { label: 'EUR', value: 'EUR' },
                        { label: 'GBP', value: 'GBP' },
                        { label: 'EGP', value: 'EGP' },
                        { label: 'SAR', value: 'SAR' },
                        { label: 'AED', value: 'AED' },
                    ],
                },
            ],
        },
    ];

    return (
        <>
            <Head title={`Edit ${project.name}`} />
            <CrudPage
                title={`Edit ${project.name}`}
                description="Edit the project on its own page."
            >
                <section className="mb-6 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                    <div className="space-y-2">
                        <h3 className="text-base font-semibold">Project logo</h3>
                        <p className="text-sm leading-6 text-muted-foreground">
                            Upload a logo or mark for this project.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 rounded-xl border p-5">
                        <Avatar className="size-16">
                            {project.image_path ? (
                                <AvatarImage
                                    src={`/storage/${project.image_path}`}
                                    alt={project.name}
                                />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                                {(project.name ?? '')
                                    .split(' ')
                                    .map((part) => part[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex gap-2">
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];

                                    if (file) {
                                        handleImageUpload(file);
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => imageInputRef.current?.click()}
                            >
                                <Camera className="mr-1.5 size-3.5" />
                                {project.image_path ? 'Change logo' : 'Upload logo'}
                            </Button>
                            {project.image_path ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleImageRemove}
                                >
                                    <X className="mr-1.5 size-3.5" />
                                    Remove
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </section>
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Save project"
                    cancelLabel="Back to projects"
                    onCancel={() =>
                        router.visit(`/clients/${client.id}/projects`)
                    }
                    onChange={(name, value) =>
                        form.setData(
                            name as keyof typeof form.data,
                            value,
                        )
                    }
                    onSubmit={() =>
                        form.put(`/clients/${client.id}/projects/${project.id}`)
                    }
                />
            </CrudPage>
        </>
    );
}

ProjectsEdit.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
