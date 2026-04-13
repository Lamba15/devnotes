import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { IssueAttachmentsSection } from '@/components/issues/issue-attachments';
import { IssueDetailsForm } from '@/components/issues/issue-details-form';
import type { IssueFormValues } from '@/components/issues/issue-details-form';
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
    const form = useForm<IssueFormValues>({
        title: issue.title ?? '',
        description: issue.description ?? '<p></p>',
        assignee_id: issue.assignee_id ? String(issue.assignee_id) : '',
        status: issue.status,
        priority: issue.priority,
        type: issue.type,
        due_date: issue.due_date ?? '',
        estimated_hours: issue.estimated_hours ?? '',
        label: issue.label ?? '',
    });

    return (
        <>
            <Head title={`Edit ${issue.title}`} />
            <CrudPage
                title={`Edit ${issue.title}`}
                description={`${client.name} / ${project.name}`}
                onBack={() =>
                    router.visit(
                        `/clients/${client.id}/projects/${project.id}/issues/${issue.id}`,
                    )
                }
            >
                <div className="w-full max-w-[1400px] space-y-8">
                    <IssueDetailsForm
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
                        onChange={(name, value) => form.setData(name, value)}
                        assigneeOptions={assignee_options}
                        statusOptions={status_options}
                        priorityOptions={priority_options}
                        typeOptions={type_options}
                        descriptionFiles={attachmentFiles}
                        onDescriptionFilesChange={setAttachmentFiles}
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
                </div>
            </CrudPage>
        </>
    );
}

IssuesEdit.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
