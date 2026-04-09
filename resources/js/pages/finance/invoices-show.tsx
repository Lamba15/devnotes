import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';

export default function FinanceInvoiceShow({
    invoice,
}: {
    invoice: {
        id: number;
        reference: string;
        status: string;
        amount: string;
        issued_at: string | null;
        due_at: string | null;
        paid_at: string | null;
        notes: string | null;
        project: {
            id: number;
            name: string;
            client?: { id: number; name: string } | null;
        };
    };
}) {
    return (
        <>
            <Head title={invoice.reference} />
            <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-4xl space-y-6">
                    <Card className="shadow-none">
                        <CardHeader className="flex-row items-start justify-between space-y-0">
                            <div className="space-y-1">
                                <CardTitle>{invoice.reference}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {invoice.project.client?.name} / {invoice.project.name}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href="/finance/invoices">
                                    <Button variant="outline">Back</Button>
                                </Link>
                                <Link href={`/finance/invoices/${invoice.id}/edit`}>
                                    <Button>Edit invoice</Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <DetailField label="Status" value={invoice.status} />
                            <DetailField label="Amount" value={invoice.amount} />
                            <DetailField
                                label="Issued at"
                                value={invoice.issued_at ?? 'Not recorded'}
                            />
                            <DetailField
                                label="Due at"
                                value={invoice.due_at ?? 'Not recorded'}
                            />
                            <DetailField
                                label="Paid at"
                                value={invoice.paid_at ?? 'Not paid'}
                            />
                            <DetailField
                                label="Project"
                                value={invoice.project.name}
                            />
                            <DetailField
                                label="Client"
                                value={invoice.project.client?.name ?? '—'}
                            />
                            <DetailField
                                label="Notes"
                                value={invoice.notes ?? 'No notes.'}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

function DetailField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                {value}
            </p>
        </div>
    );
}

FinanceInvoiceShow.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
