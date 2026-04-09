import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import AppLayout from '@/layouts/app-layout';

export default function FinanceInvoicesEdit({
    invoice,
    projects,
}: {
    invoice: {
        id: number;
        project_id: number;
        reference: string;
        status: string;
        amount: string;
        issued_at: string | null;
        due_at: string | null;
        paid_at: string | null;
        notes: string | null;
    };
    projects: Array<{
        id: number;
        name: string;
        client: { id: number; name: string };
    }>;
}) {
    const form = useForm({
        project_id: String(invoice.project_id),
        reference: invoice.reference ?? '',
        status: invoice.status ?? '',
        amount: String(invoice.amount ?? ''),
        issued_at: invoice.issued_at ?? '',
        due_at: invoice.due_at ?? '',
        paid_at: invoice.paid_at ?? '',
        notes: invoice.notes ?? '',
    });

    const sections: DynamicFormSection[] = [
        {
            name: 'invoice',
            title: 'Edit invoice',
            description: 'Update this invoice using a dedicated edit page.',
            fields: [
                {
                    name: 'project_id',
                    label: 'Project',
                    type: 'select',
                    wide: true,
                    options: projects.map((project) => ({
                        label: `${project.client.name} / ${project.name}`,
                        value: project.id,
                    })),
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
            <Head title="Edit Invoice" />
            <CrudPage
                title="Edit Invoice"
                description="Update the invoice using a dedicated edit page."
            >
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Save invoice"
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
                    onSubmit={() => form.put(`/finance/invoices/${invoice.id}`)}
                />
            </CrudPage>
        </>
    );
}

FinanceInvoicesEdit.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
