import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, FileText, Globe, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { formatCurrencyAmount } from '@/lib/format-currency';

type InvoiceShowProps = {
    invoice: {
        id: number;
        reference: string;
        subtotal_amount: string;
        discount_total_amount: string;
        amount: string;
        currency: string | null;
        issued_at: string | null;
        notes: string | null;
        pdf_url: string;
        public_url: string;
        project: {
            id: number;
            name: string;
            client?: { id: number; name: string } | null;
        };
    };
};

export default function FinanceInvoiceShow({ invoice }: InvoiceShowProps) {
    return (
        <>
            <Head title={invoice.reference} />

            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            {invoice.project.client?.name ?? 'No client'} /{' '}
                            {invoice.project.name}
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {invoice.reference}
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline">
                            <Link href="/finance/invoices">
                                <ArrowLeft className="mr-1.5 size-4" />
                                Back
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <a
                                href={invoice.public_url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Globe className="mr-1.5 size-4" />
                                Public link
                            </a>
                        </Button>
                        <Button asChild variant="outline">
                            <a
                                href={invoice.pdf_url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <ExternalLink className="mr-1.5 size-4" />
                                Open PDF
                            </a>
                        </Button>
                        <Button asChild>
                            <Link href={`/finance/invoices/${invoice.id}/edit`}>
                                <Pencil className="mr-1.5 size-4" />
                                Edit
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">
                                    Totals
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Total
                                </p>
                                <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                                    <span className="text-2xl font-semibold text-foreground">
                                        {formatCurrencyAmount(
                                            invoice.amount,
                                            invoice.currency,
                                        )}
                                    </span>
                                    {Number(invoice.discount_total_amount) >
                                    0 ? (
                                        <span className="text-sm text-muted-foreground line-through">
                                            {formatCurrencyAmount(
                                                invoice.subtotal_amount,
                                                invoice.currency,
                                            )}
                                        </span>
                                    ) : null}
                                </div>
                                {Number(invoice.discount_total_amount) > 0 ? (
                                    <p className="text-sm font-semibold text-red-500">
                                        Save{' '}
                                        {formatCurrencyAmount(
                                            invoice.discount_total_amount,
                                            invoice.currency,
                                        )}
                                    </p>
                                ) : null}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">
                                    Document links
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <DocumentLink
                                    label="Internal PDF"
                                    href={invoice.pdf_url}
                                />
                                <DocumentLink
                                    label="Public verification"
                                    href={invoice.public_url}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">
                                    Notes
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm leading-6 whitespace-pre-line text-muted-foreground">
                                {invoice.notes?.trim() || 'No notes.'}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="overflow-hidden">
                        <CardHeader className="border-b pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <FileText className="size-4" />
                                Document preview
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <iframe
                                src={invoice.pdf_url}
                                title={`Invoice ${invoice.reference}`}
                                className="h-[calc(100vh-13rem)] min-h-[56rem] w-full bg-white"
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

function DocumentLink({ label, href }: { label: string; href: string }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </p>
            <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="block text-sm break-all text-primary hover:underline"
            >
                {href}
            </a>
        </div>
    );
}

FinanceInvoiceShow.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;
