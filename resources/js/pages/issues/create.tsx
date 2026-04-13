import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { IssueDetailsForm } from '@/components/issues/issue-details-form';
import type { IssueFormValues } from '@/components/issues/issue-details-form';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function IssuesCreate({
    client,
    project,
    assignee_options,
    status_options,
    priority_options,
    type_options,
}: {
    client: { id: number; name: string };
    project: { id: number; name: string };
    assignee_options: Array<{ label: string; value: string }>;
    status_options: string[];
    priority_options: string[];
    type_options: string[];
}) {
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const form = useForm<IssueFormValues>({
        title: '',
        description: '<p></p>',
        assignee_id: '',
        status: 'todo',
        priority: 'medium',
        type: 'task',
        due_date: '',
        estimated_hours: '',
        label: '',
    });

    return (
        <>
            <Head title={`Create Issue`} />
            <CrudPage
                title={`Create Issue`}
                description={`${client.name} / ${project.name}`}
                onBack={() =>
                    router.visit(
                        `/clients/${client.id}/projects/${project.id}/issues`,
                    )
                }
            >
                <div className="w-full max-w-[1400px] space-y-8">
                    <IssueDetailsForm
                        data={form.data}
                        errors={form.errors}
                        processing={form.processing}
                        submitLabel="Create issue"
                        cancelLabel="Back to issues"
                        onCancel={() =>
                            router.visit(
                                `/clients/${client.id}/projects/${project.id}/issues`,
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
                                attachments: attachmentFiles,
                            }));

                            form.post(
                                `/clients/${client.id}/projects/${project.id}/issues`,
                                {
                                    forceFormData: true,
                                },
                            );
                        }}
                    />
                </div>
            </CrudPage>
        </>
    );
}

IssuesCreate.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
