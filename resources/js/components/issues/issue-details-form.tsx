import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormField } from '@/components/crud/dynamic-form';
import { IssueAssigneePicker } from '@/components/issues/issue-assignee-picker';
import { RichIssueEditor } from '@/components/issues/rich-issue-editor';
import type { AssigneeOption } from '@/types/issue';

type MentionOption = { id: string; label: string };

export type IssueFormValues = {
    title: string;
    description: string;
    assignee_ids: number[];
    status: string;
    priority: string;
    type: string;
    due_date: string;
    estimated_hours: string;
    label: string;
};

export function IssueDetailsForm({
    data,
    errors,
    processing,
    submitLabel,
    cancelLabel,
    onCancel,
    onChange,
    onSubmit,
    assigneeOptions,
    statusOptions,
    priorityOptions,
    typeOptions,
    descriptionFiles,
    onDescriptionFilesChange,
    mentionOptions = [],
    uploadContext,
}: {
    data: IssueFormValues;
    errors: Record<string, string | undefined>;
    processing?: boolean;
    submitLabel: string;
    cancelLabel?: string;
    onCancel?: () => void;
    onChange: <K extends keyof IssueFormValues>(
        name: K,
        value: IssueFormValues[K],
    ) => void;
    onSubmit: () => void;
    assigneeOptions: AssigneeOption[];
    statusOptions: string[];
    priorityOptions: string[];
    typeOptions: string[];
    descriptionFiles: File[];
    onDescriptionFilesChange: (files: File[]) => void;
    mentionOptions?: MentionOption[];
    uploadContext?: { attachableType: string; attachableId: number };
}) {
    const fields: DynamicFormField[] = [
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
            type: 'custom',
            wide: true,
            render: ({ value, onChange: handleChange, error }) => (
                <div className="space-y-2">
                    <RichIssueEditor
                        value={value}
                        onChange={handleChange}
                        placeholder="Write the description, important integration notes, checklist, and context here..."
                        attachments={descriptionFiles}
                        onAttachmentsChange={onDescriptionFilesChange}
                        mentionOptions={mentionOptions}
                        uploadContext={uploadContext}
                    />
                    {error ? (
                        <p className="text-sm text-destructive">{error}</p>
                    ) : null}
                </div>
            ),
        },
        {
            name: 'assignee_ids',
            label: 'Assignees',
            type: 'custom',
            render: ({ error }) => (
                <div className="space-y-2">
                    <IssueAssigneePicker
                        options={assigneeOptions}
                        value={data.assignee_ids}
                        onChange={(ids) => onChange('assignee_ids', ids)}
                        placeholder="Assign to…"
                    />
                    {error ? (
                        <p className="text-sm text-destructive">{error}</p>
                    ) : null}
                </div>
            ),
        },
        {
            name: 'status',
            label: 'Status',
            type: 'select',
            clearable: false,
            creatable: true,
            options: statusOptions.map((status) => ({
                label: status,
                value: status,
            })),
        },
        {
            name: 'priority',
            label: 'Priority',
            type: 'select',
            clearable: false,
            creatable: true,
            options: priorityOptions.map((priority) => ({
                label: priority,
                value: priority,
            })),
        },
        {
            name: 'type',
            label: 'Type',
            type: 'select',
            clearable: false,
            creatable: true,
            options: typeOptions.map((type) => ({ label: type, value: type })),
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
    ];

    return (
        <DynamicForm
            fields={fields}
            data={data}
            errors={errors}
            processing={processing}
            submitLabel={submitLabel}
            cancelLabel={cancelLabel}
            onCancel={onCancel}
            onChange={(name, value) =>
                onChange(
                    name as keyof IssueFormValues,
                    value as IssueFormValues[keyof IssueFormValues],
                )
            }
            onSubmit={onSubmit}
        />
    );
}
