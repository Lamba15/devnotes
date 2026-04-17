import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { IssueDetailsForm } from '@/components/issues/issue-details-form';
import type { IssueFormValues } from '@/components/issues/issue-details-form';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';
import type { AssigneeOption } from '@/types/issue';

export default function IssuesCreate({
    client,
    project,
    return_to,
    assignee_options,
    default_assignee_ids,
    status_options,
    priority_options,
    type_options,
}: {
    client: { id: number; name: string };
    project: { id: number; name: string };
    return_to?: { href: string; label: string } | null;
    assignee_options: AssigneeOption[];
    default_assignee_ids: number[];
    status_options: string[];
    priority_options: string[];
    type_options: string[];
}) {
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const fallbackIssuesUrl = `/clients/${client.id}/projects/${project.id}/issues`;
    const breadcrumbBack = useBackNavigation(fallbackIssuesUrl);

    const goBack = return_to?.href
        ? () => router.visit(return_to.href)
        : breadcrumbBack;

    const form = useForm<IssueFormValues>({
        title: '',
        description: '<p></p>',
        assignee_ids: default_assignee_ids ?? [],
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
            >
                <div className="w-full max-w-[1400px] space-y-8">
                    <IssueDetailsForm
                        data={form.data}
                        errors={form.errors}
                        processing={form.processing}
                        submitLabel="Create issue"
                        cancelLabel={return_to?.label ?? 'Back'}
                        onCancel={goBack}
                        onChange={(name, value) =>
                            form.setData(
                                name as keyof IssueFormValues,
                                value as never,
                            )
                        }
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
                                return_to: return_to?.href ?? '',
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
