import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    FolderKanban,
    Pencil,
    Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { formatCurrencyAmount } from '@/lib/format-currency';

export default function FinanceInvoiceShow({
    invoice,
}: {
    invoice: {
        id: number;
        reference: string;
        status: string;
        amount: string;
        currency: string | null;
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
                                <Button asChild variant="outline">
                                    <Link href="/finance/invoices">
                                        <ArrowLeft className="mr-1.5 size-3.5" />
                                        Back
                                    </Link>
                                </Button>
                                <Button asChild>
                                    <Link href={`/finance/invoices/${invoice.id}/edit`}>
                                        <Pencil className="mr-1.5 size-3.5" />
                                        Edit
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                <div className="mt-1">
                                    {(() => {
                                        const colors: Record<string, string> = {
                                            paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                                            pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                                            overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                                            draft: 'bg-muted text-muted-foreground',
                                        };

                                        return (
                                            <Badge variant="outline" className={`capitalize ${colors[invoice.status] ?? ''}`}>
                                                {invoice.status}
                                            </Badge>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                                <p className="mt-1 text-lg font-semibold text-foreground">
                                    {formatCurrencyAmount(invoice.amount, invoice.currency)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Issued at</p>
                                <p className="mt-1 flex items-center gap-1 text-sm text-foreground">
                                    <Calendar className="size-3.5 text-muted-foreground" />
                                    {invoice.issued_at ?? 'Not recorded'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Due at</p>
                                <p className="mt-1 flex items-center gap-1 text-sm text-foreground">
                                    <Calendar className="size-3.5 text-muted-foreground" />
                                    {invoice.due_at ?? 'Not recorded'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Paid at</p>
                                <p className="mt-1 flex items-center gap-1 text-sm text-foreground">
                                    {invoice.paid_at ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <Calendar className="size-3.5 text-muted-foreground" />}
                                    {invoice.paid_at ?? 'Not paid'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Project</p>
                                <p className="mt-1 flex items-center gap-1 text-sm text-foreground">
                                    <FolderKanban className="size-3.5 text-violet-500" />
                                    {invoice.project.name}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Client</p>
                                <p className="mt-1 flex items-center gap-1 text-sm text-foreground">
                                    <Users className="size-3.5 text-blue-500" />
                                    {invoice.project.client?.name ?? '—'}
                                </p>
                            </div>
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
