import { Head, Link } from '@inertiajs/react';
import { ExternalLink, FileText, Globe, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { FinanceAmount } from '@/components/finance/finance-amount';
import {
    FinanceCardSection,
    FinanceDocumentLink,
    FinanceMetaRow,
    FinancePreviewCard,
} from '@/components/finance/finance-detail-primitives';
import { FinanceStatusBadge } from '@/components/finance/finance-status-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatDateOnly, formatDetailedTimestamp } from '@/lib/datetime';
import { formatCurrencyAmount } from '@/lib/format-currency';

type InvoiceShowProps = {
    invoice: {
        id: number;
        reference: string;
        status: string;
        subtotal_amount: string;
        discount_total_amount: string;
        amount: string;
        currency: string | null;
        issued_at: string | null;
        due_at: string | null;
        paid_at: string | null;
        created_at: string | null;
        public_pdf_generated_at: string | null;
        notes: string | null;
        pdf_url: string;
        public_url: string;
        project: {
            id: number;
            name: string;
            client?: { id: number; name: string } | null;
        };
        items: Array<{
            id: number;
            description: string;
            hours: string | null;
            rate: string | null;
            base_amount: string;
            amount: string;
            discounts: Array<{
                id: number;
                label: string;
                type: string;
                value: string;
                amount: string;
            }>;
        }>;
        invoice_discounts: Array<{
            id: number;
            label: string;
            type: string;
            value: string;
            amount: string;
        }>;
    };
};

export default function FinanceInvoiceShow({ invoice }: InvoiceShowProps) {
    return (
        <>
            <Head title={invoice.reference} />

            <CrudPage
                title={invoice.reference}
                titleMeta={<FinanceStatusBadge status={invoice.status} />}
                description={`${invoice.project.client?.name ?? 'No client'} / ${invoice.project.name}`}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
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
                }
                onBack={() =>
                    window.history.length > 1
                        ? window.history.back()
                        : window.location.assign('/finance/invoices')
                }
            >
                <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
                    <div className="space-y-4">
                        <FinanceCardSection
                            title="Totals"
                            contentClassName="space-y-3 text-sm"
                        >
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Total
                                </p>
                                <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
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
                            </div>
                            <FinanceMetaRow
                                label="Subtotal"
                                value={formatCurrencyAmount(
                                    invoice.subtotal_amount,
                                    invoice.currency,
                                )}
                            />
                            <FinanceMetaRow
                                label="Discounts"
                                value={`-${formatCurrencyAmount(invoice.discount_total_amount, invoice.currency)}`}
                                valueClassName="text-red-500"
                            />
                        </FinanceCardSection>

                        <FinanceCardSection
                            title="Dates and state"
                            contentClassName="space-y-3"
                        >
                            <FinanceMetaRow
                                label="Status"
                                value={
                                    <FinanceStatusBadge
                                        status={invoice.status}
                                    />
                                }
                            />
                            <FinanceMetaRow
                                label="Issued"
                                value={formatDateOnly(invoice.issued_at)}
                            />
                            <FinanceMetaRow
                                label="Due"
                                value={formatDateOnly(invoice.due_at)}
                            />
                            <FinanceMetaRow
                                label="Paid"
                                value={formatDateOnly(invoice.paid_at)}
                            />
                            <FinanceMetaRow
                                label="Created"
                                value={formatDetailedTimestamp(
                                    invoice.created_at,
                                )}
                            />
                            <FinanceMetaRow
                                label="PDF generated"
                                value={formatDetailedTimestamp(
                                    invoice.public_pdf_generated_at,
                                )}
                            />
                        </FinanceCardSection>

                        <FinanceCardSection
                            title="Document links"
                            contentClassName="space-y-3 text-sm"
                        >
                            <FinanceDocumentLink
                                label="Internal PDF"
                                href={invoice.pdf_url}
                            />
                            <FinanceDocumentLink
                                label="Public verification"
                                href={invoice.public_url}
                            />
                        </FinanceCardSection>

                        <FinanceCardSection
                            title="Notes"
                            contentClassName="text-sm leading-6 whitespace-pre-line text-muted-foreground"
                        >
                            {invoice.notes?.trim() || 'No notes.'}
                        </FinanceCardSection>
                    </div>

                    <div className="space-y-4">
                        <FinanceCardSection
                            title="Invoice structure"
                            description="The authenticated detail view now exposes the same itemized structure that drives the document and totals."
                            contentClassName="space-y-6"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-border/60 text-xs tracking-wide text-muted-foreground uppercase">
                                        <tr>
                                            <th className="pr-4 pb-3">
                                                Description
                                            </th>
                                            <th className="pr-4 pb-3">Hours</th>
                                            <th className="pr-4 pb-3">Rate</th>
                                            <th className="pr-4 pb-3">Base</th>
                                            <th className="pb-3 text-right">
                                                Final
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoice.items.map((item) => (
                                            <ItemRows
                                                key={item.id}
                                                item={item}
                                                currency={invoice.currency}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-foreground">
                                    Invoice-level discounts
                                </h3>
                                {invoice.invoice_discounts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No invoice-level discounts.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {invoice.invoice_discounts.map(
                                            (discount) => (
                                                <FinanceMetaRow
                                                    key={discount.id}
                                                    label={`${discount.label} (${formatDiscountValue(discount, invoice.currency)})`}
                                                    value={`-${formatCurrencyAmount(discount.amount, invoice.currency)}`}
                                                    valueClassName="text-red-500"
                                                />
                                            ),
                                        )}
                                    </div>
                                )}
                            </div>
                        </FinanceCardSection>

                        <FinancePreviewCard
                            title="Document preview"
                            icon={FileText}
                            src={invoice.pdf_url}
                            iframeTitle={`Invoice ${invoice.reference}`}
                        />
                    </div>
                </div>
            </CrudPage>
        </>
    );
}

function ItemRows({
    item,
    currency,
}: {
    item: InvoiceShowProps['invoice']['items'][number];
    currency: string | null;
}) {
    return (
        <>
            <tr className="border-b border-border/50 align-top">
                <td className="py-4 pr-4">
                    <p className="font-medium text-foreground">
                        {item.description}
                    </p>
                </td>
                <td className="py-4 pr-4 text-muted-foreground">
                    {item.hours ?? '—'}
                </td>
                <td className="py-4 pr-4 text-muted-foreground">
                    {item.rate !== null
                        ? formatCurrencyAmount(item.rate, currency)
                        : '—'}
                </td>
                <td className="py-4 pr-4 text-muted-foreground">
                    {formatCurrencyAmount(item.base_amount, currency)}
                </td>
                <td className="py-4 text-right">
                    <FinanceAmount amount={item.amount} currency={currency} />
                </td>
            </tr>
            {item.discounts.map((discount) => (
                <tr key={discount.id} className="border-b border-border/30">
                    <td className="py-3 pr-4 pl-6 text-sm text-muted-foreground">
                        {discount.label}
                    </td>
                    <td
                        colSpan={3}
                        className="py-3 pr-4 text-sm text-muted-foreground"
                    >
                        {formatDiscountValue(discount, currency)}
                    </td>
                    <td className="py-3 text-right text-sm font-medium text-red-500">
                        -{formatCurrencyAmount(discount.amount, currency)}
                    </td>
                </tr>
            ))}
        </>
    );
}

function formatDiscountValue(
    discount: { type: string; value: string },
    currency: string | null,
) {
    if (discount.type === 'percent') {
        return `${discount.value}%`;
    }

    return formatCurrencyAmount(discount.value, currency);
}

FinanceInvoiceShow.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;
