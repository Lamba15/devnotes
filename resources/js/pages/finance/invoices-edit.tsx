import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import {
    InvoiceFormEditor,
    type InvoiceFormData,
} from '@/components/finance/invoice-form-editor';
import AppLayout from '@/layouts/app-layout';

export default function FinanceInvoicesEdit({
    invoice,
    projects,
}: {
    invoice: InvoiceFormData & {
        id: number;
        subtotal_amount: string;
        discount_total_amount: string;
        amount: string;
    };
    projects: Array<{
        id: number;
        name: string;
        client: { id: number; name: string };
    }>;
}) {
    const form = useForm<InvoiceFormData>({
        project_id: String(invoice.project_id),
        reference: invoice.reference,
        currency: invoice.currency,
        issued_at: invoice.issued_at,
        notes: invoice.notes,
        items: invoice.items,
        discounts: invoice.discounts,
    });

    return (
        <>
            <Head title="Edit Invoice" />
            <CrudPage
                title="Edit Invoice"
                description="Update the invoice document, its items, and its stacked discounts."
            >
                <InvoiceFormEditor
                    title="Edit invoice"
                    description="Changes here regenerate the canonical PDF document and the public verification file."
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Save invoice"
                    projects={projects}
                    onCancel={() =>
                        router.visit(`/finance/invoices/${invoice.id}`)
                    }
                    onChange={(data) => form.setData(data)}
                    onSubmit={() => form.put(`/finance/invoices/${invoice.id}`)}
                />
            </CrudPage>
        </>
    );
}

FinanceInvoicesEdit.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
