import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import AppLayout from '@/layouts/app-layout';

export default function FinanceInvoicesCreate({
    projects,
}: {
    projects: Array<{
        id: number;
        name: string;
        client: { id: number; name: string };
    }>;
}) {
    const form = useForm({
        project_id: '',
        reference: '',
        status: '',
        amount: '',
        issued_at: '',
        due_at: '',
        paid_at: '',
        notes: '',
    });

    const sections: DynamicFormSection[] = [
        {
            name: 'invoice',
            title: 'Create invoice',
            description:
                'Create a project-linked invoice with a clear billing state and reference.',
            fields: [
                {
                    name: 'project_id',
                    label: 'Project',
                    type: 'select',
                    placeholder: 'Select project',
                    options: projects.map((project) => ({
                        label: `${project.client.name} / ${project.name}`,
                        value: project.id,
                    })),
                    wide: true,
                },
                {
                    name: 'reference',
                    label: 'Reference',
                    type: 'text',
                    placeholder: 'Invoice reference',
                },
                {
                    name: 'status',
                    label: 'Status',
                    type: 'text',
                    placeholder: 'draft, sent, paid...',
                },
                {
                    name: 'amount',
                    label: 'Amount',
                    type: 'text',
                    placeholder: '0.00',
                },
                {
                    name: 'issued_at',
                    label: 'Issued at',
                    type: 'text',
                    placeholder: 'YYYY-MM-DD',
                },
                {
                    name: 'due_at',
                    label: 'Due at',
                    type: 'text',
                    placeholder: 'YYYY-MM-DD',
                },
                {
                    name: 'paid_at',
                    label: 'Paid at',
                    type: 'text',
                    placeholder: 'YYYY-MM-DD',
                },
                {
                    name: 'notes',
                    label: 'Notes',
                    type: 'textarea',
                    placeholder: 'Optional notes',
                    wide: true,
                },
            ],
        },
    ];

    return (
        <>
            <Head title="Create Invoice" />
            <CrudPage
                title="Create Invoice"
                description="Create a project-linked invoice."
            >
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Create invoice"
                    cancelLabel="Back to invoices"
                    onCancel={() => router.visit('/finance/invoices')}
                    onChange={(name, value) =>
                        form.setData(
                            name as
                                | 'project_id'
                                | 'reference'
                                | 'status'
                                | 'amount'
                                | 'issued_at'
                                | 'due_at'
                                | 'paid_at'
                                | 'notes',
                            value,
                        )
                    }
                    onSubmit={() => form.post('/finance/invoices')}
                />
            </CrudPage>
        </>
    );
}

FinanceInvoicesCreate.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
