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
        currency: 'USD',
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
                    type: 'select',
                    options: [
                        { label: 'Draft', value: 'draft' },
                        { label: 'Pending', value: 'pending' },
                        { label: 'Paid', value: 'paid' },
                        { label: 'Overdue', value: 'overdue' },
                    ],
                },
                {
                    name: 'amount',
                    label: 'Amount',
                    type: 'text',
                    placeholder: '0.00',
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
                {
                    name: 'issued_at',
                    label: 'Issued at',
                    type: 'date',
                },
                {
                    name: 'due_at',
                    label: 'Due at',
                    type: 'date',
                },
                {
                    name: 'paid_at',
                    label: 'Paid at',
                    type: 'date',
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
                            name as keyof typeof form.data,
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
