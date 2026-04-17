import { Head, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import { ProjectGitReposEditor } from '@/components/projects/project-git-repos-editor';
import type { ProjectGitRepoRow } from '@/components/projects/project-git-repos-editor';
import { ProjectLinksEditor } from '@/components/projects/project-links-editor';
import type { ProjectLinkRow } from '@/components/projects/project-links-editor';
import { ProjectSkillPicker } from '@/components/projects/project-skill-picker';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ProjectsCreate({
    client,
    statuses,
    skills,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    statuses: Array<{ id: number; name: string; slug: string }>;
    skills: Array<{ id: number; name: string }>;
}) {
    const goBack = useBackNavigation(`/clients/${client.id}/projects`);
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
        name: '',
        description: '',
        markdown_description: '',
        hosting: '',
        status_id: '',
        budget: '',
        currency: 'USD',
        skills: [],
        links: [],
        git_repos: [],
    });

    const sections: DynamicFormSection[] = [
        {
            name: 'project',
            title: 'Create project',
            description:
                'Projects live inside the client workspace and should start with a clear status and scope.',
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
            <Head title={`${client.name} Create Project`} />
            <CrudPage
                title={`Create ${client.name} Project`}
                description="Create a new project inside this client workspace."
            >
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Create project"
                    cancelLabel="Back to projects"
                    onCancel={goBack}
                    onChange={(name, value) =>
                        form.setData(
                            name as keyof typeof form.data,
                            value as any,
                        )
                    }
                    onSubmit={() => form.post(`/clients/${client.id}/projects`)}
                />
            </CrudPage>
        </>
    );
}

ProjectsCreate.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
