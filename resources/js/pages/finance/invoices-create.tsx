import { Head, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import {
    createEmptyInvoiceItem,
    InvoiceFormEditor

} from '@/components/finance/invoice-form-editor';
import type {InvoiceFormData} from '@/components/finance/invoice-form-editor';
import { useBackNavigation } from '@/hooks/use-back-navigation';
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
    const goBack = useBackNavigation('/finance/invoices')!;

    const form = useForm<InvoiceFormData>({
        project_id: '',
        reference: '',
        status: 'draft',
        currency: 'EGP',
        issued_at: '',
        due_at: '',
        paid_at: '',
        notes: '',
        items: [createEmptyInvoiceItem()],
        discounts: [],
    });

    return (
        <>
            <Head title="Create Invoice" />
            <CrudPage
                title="Create Invoice"
                description="Create a project-linked invoice with real line items and stacked discounts."
            >
                <InvoiceFormEditor
                    title="Create invoice"
                    description="Build the invoice as a document. Totals, status, and payment dates all flow into the shared finance surfaces."
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Create invoice"
                    projects={projects}
                    onCancel={goBack}
                    onChange={(data) => form.setData(data)}
                    onSubmit={() => form.post('/finance/invoices')}
                />
            </CrudPage>
        </>
    );
}

FinanceInvoicesCreate.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
