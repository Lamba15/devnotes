import { Head, router, useForm } from '@inertiajs/react';
import { Camera, X } from 'lucide-react';
import { useRef } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import { ProjectGitReposEditor } from '@/components/projects/project-git-repos-editor';
import type { ProjectGitRepoRow } from '@/components/projects/project-git-repos-editor';
import { ProjectLinksEditor } from '@/components/projects/project-links-editor';
import type { ProjectLinkRow } from '@/components/projects/project-links-editor';
import { ProjectSkillPicker } from '@/components/projects/project-skill-picker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ProjectsEdit({
    client,
    project,
    statuses,
    skills,
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
        markdown_description: string | null;
        hosting: string | null;
        status_id: number;
        budget: string | null;
        currency: string | null;
        image_path: string | null;
        skills: Array<{ id: number; name: string }>;
        links: ProjectLinkRow[];
        git_repos: ProjectGitRepoRow[];
    };
    statuses: Array<{ id: number; name: string; slug: string }>;
    skills: Array<{ id: number; name: string }>;
}) {
    const form = useForm<{
        name: string;
        description: string;
        markdown_description: string;
        hosting: string;
        status_id: string;
        budget: string;
        currency: string;
        skills: Array<number | string>;
        links: ProjectLinkRow[];
        git_repos: ProjectGitRepoRow[];
    }>({
        name: project.name ?? '',
        description: project.description ?? '',
        markdown_description: project.markdown_description ?? '',
        hosting: project.hosting ?? '',
        status_id: project.status_id ? String(project.status_id) : '',
        budget: project.budget ?? '',
        currency: project.currency ?? 'USD',
        skills: project.skills?.map((skill) => skill.id) ?? [],
        links: project.links ?? [],
        git_repos: project.git_repos ?? [],
    });
    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        router.post(
            `/clients/${client.id}/projects/${project.id}/image`,
            formData as any,
            {
                preserveScroll: true,
                forceFormData: true,
            },
        );
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
                    label: 'Short description',
                    type: 'textarea',
                    placeholder: 'One-liner summary',
                    wide: true,
                },
                {
                    name: 'markdown_description',
                    label: 'Long description (markdown)',
                    type: 'textarea',
                    placeholder:
                        'Detailed markdown description, docs, decisions, etc.',
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
                    name: 'hosting',
                    label: 'Hosting',
                    type: 'text',
                    placeholder: 'Hostinger, AWS, Vercel, …',
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
        {
            name: 'skills',
            title: 'Skills',
            description:
                'Pick existing skills or type a new one — new skills are created on save.',
            fields: [
                {
                    name: 'skills',
                    label: 'Project skills',
                    type: 'custom',
                    wide: true,
                    render: ({ value, onChange }) => (
                        <ProjectSkillPicker
                            value={Array.isArray(value) ? value : []}
                            onChange={onChange}
                            options={skills}
                        />
                    ),
                },
            ],
        },
        {
            name: 'links',
            title: 'Links',
            description: 'External URLs related to this project.',
            fields: [
                {
                    name: 'links',
                    label: 'Project links',
                    type: 'custom',
                    wide: true,
                    render: ({ value, onChange }) => (
                        <ProjectLinksEditor
                            value={Array.isArray(value) ? value : []}
                            onChange={onChange}
                        />
                    ),
                },
            ],
        },
        {
            name: 'git_repos',
            title: 'Git repositories',
            description: 'Source-code repositories for this project.',
            fields: [
                {
                    name: 'git_repos',
                    label: 'Repositories',
                    type: 'custom',
                    wide: true,
                    render: ({ value, onChange }) => (
                        <ProjectGitReposEditor
                            value={Array.isArray(value) ? value : []}
                            onChange={onChange}
                        />
                    ),
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
                        <h3 className="text-base font-semibold">
                            Project logo
                        </h3>
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
                                {project.image_path
                                    ? 'Change logo'
                                    : 'Upload logo'}
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
                            value as any,
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
