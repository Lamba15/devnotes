import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import {
    IssueAttachmentPicker,
    IssueAttachmentsSection,
} from '@/components/issues/issue-attachments';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function IssuesEdit({
    client,
    project,
    issue,
    assignee_options,
    status_options,
    priority_options,
    type_options,
}: {
    client: { id: number; name: string };
    project: { id: number; name: string };
    issue: {
        id: number;
        title: string;
        description: string | null;
        status: string;
        priority: string;
        type: string;
        assignee_id: number | null;
        assignee: { id: number; name: string } | null;
        due_date: string | null;
        estimated_hours: string | null;
        label: string | null;
        attachments: Array<{
            id: number;
            file_name: string;
            file_path?: string | null;
            mime_type: string;
            file_size: number;
            url?: string | null;
            is_image?: boolean;
        }>;
    };
    assignee_options: Array<{ label: string; value: string }>;
    status_options: string[];
    priority_options: string[];
    type_options: string[];
}) {
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const form = useForm({
        title: issue.title ?? '',
        description: issue.description ?? '',
        assignee_id: issue.assignee_id ? String(issue.assignee_id) : '',
        status: issue.status,
        priority: issue.priority,
        type: issue.type,
        due_date: issue.due_date ?? '',
        estimated_hours: issue.estimated_hours ?? '',
        label: issue.label ?? '',
    });

    const sections: DynamicFormSection[] = [
        {
            name: 'issue',
            title: 'Edit issue',
            description: 'Update the issue on its own page.',
            fields: [
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
                    type: 'textarea',
                    placeholder: 'Optional description',
                    wide: true,
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
                    options: type_options.map((type) => ({
                        label: type,
                        value: type,
                    })),
                },
                {
                    name: 'due_date',
                    label: 'Due date',
                    type: 'date',
                },
                {
                    name: 'estimated_hours',
                    label: 'Estimated hours',
                    type: 'text',
                    placeholder: 'e.g. 4',
                },
                {
                    name: 'label',
                    label: 'Label',
                    type: 'text',
                    placeholder: 'e.g. frontend, backend, urgent',
                },
            ],
        },
    ];

    return (
        <>
            <Head title={`Edit ${issue.title}`} />
            <CrudPage
                title={`Edit ${issue.title}`}
                description={`${client.name} / ${project.name}`}
            >
                <div className="space-y-6">
                    <DynamicForm
                        sections={sections}
                        data={form.data}
                        errors={form.errors}
                        processing={form.processing}
                        submitLabel="Save issue"
                        cancelLabel="Back to issue"
                        onCancel={() =>
                            router.visit(
                                `/clients/${client.id}/projects/${project.id}/issues/${issue.id}`,
                            )
                        }
                        onChange={(name, value) =>
                            form.setData(name as keyof typeof form.data, value)
                        }
                        onSubmit={() => {
                            form.transform((data) => ({
                                ...data,
                                _method: 'put',
                                attachments: attachmentFiles,
                            }));

                            form.post(
                                `/clients/${client.id}/projects/${project.id}/issues/${issue.id}`,
                                {
                                    forceFormData: true,
                                },
                            );
                        }}
                    />
                    <IssueAttachmentsSection
                        attachments={issue.attachments}
                        canManage
                        attachableType="issue"
                        attachableId={issue.id}
                    />
                    <IssueAttachmentPicker
                        files={attachmentFiles}
                        onChange={setAttachmentFiles}
                    />
                </div>
            </CrudPage>
        </>
    );
}

IssuesEdit.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
