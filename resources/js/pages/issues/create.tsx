import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { IssueDetailsForm } from '@/components/issues/issue-details-form';
import type { IssueFormValues } from '@/components/issues/issue-details-form';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function IssuesCreate({
    client,
    project,
    return_to,
    assignee_options,
    status_options,
    priority_options,
    type_options,
}: {
    client: { id: number; name: string };
    project: { id: number; name: string };
    return_to?: { href: string; label: string } | null;
    assignee_options: Array<{ label: string; value: string }>;
    status_options: string[];
    priority_options: string[];
    type_options: string[];
}) {
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const fallbackIssuesUrl = `/clients/${client.id}/projects/${project.id}/issues`;
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

    const resolveClientReturnHref = () => {
        if (return_to?.href) {
            return return_to.href;
        }

        return null;
    };

    const goBack = () => {
        const returnHref = resolveClientReturnHref();

        if (returnHref) {
            router.visit(returnHref);

            return;
        }

        router.visit(fallbackIssuesUrl);
    };

    return (
        <>
            <Head title={`Create Issue`} />
            <CrudPage
                title={`Create Issue`}
                description={`${client.name} / ${project.name}`}
                onBack={goBack}
            >
                <div className="w-full max-w-[1400px] space-y-8">
                    <IssueDetailsForm
                        data={form.data}
                        errors={form.errors}
                        processing={form.processing}
                        submitLabel="Create issue"
                        cancelLabel={return_to?.label ?? 'Back'}
                        onCancel={goBack}
                        onChange={(name, value) => form.setData(name, value)}
                        assigneeOptions={assignee_options}
                        statusOptions={status_options}
                        priorityOptions={priority_options}
                        typeOptions={type_options}
                        descriptionFiles={attachmentFiles}
                        onDescriptionFilesChange={setAttachmentFiles}
                        onSubmit={() => {
                            const returnHref = resolveClientReturnHref();

                            form.transform((data) => ({
                                ...data,
                                attachments: attachmentFiles,
                                return_to: returnHref ?? '',
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
