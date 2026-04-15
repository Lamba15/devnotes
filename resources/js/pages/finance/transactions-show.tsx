import { Head, Link } from '@inertiajs/react';
import { ExternalLink, FileText, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { FinanceAmount } from '@/components/finance/finance-amount';
import {
    FinanceCardSection,
    FinanceDocumentLink,
    FinanceMetaRow,
    FinancePreviewCard,
} from '@/components/finance/finance-detail-primitives';
import { FinanceProjectLabel } from '@/components/finance/finance-project-label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatDateOnly, formatDetailedTimestamp } from '@/lib/datetime';

type TransactionShowProps = {
    transaction: {
        id: number;
        description: string;
        amount: string;
        currency: string | null;
        occurred_date: string | null;
        category: string | null;
        created_at: string | null;
        pdf_url: string;
        project: {
            id: number;
            name: string;
            client?: { id: number; name: string } | null;
        };
    };
};

export default function FinanceTransactionShow({
    transaction,
}: TransactionShowProps) {
    const amount = Number(transaction.amount);
    const direction = amount >= 0 ? 'Income' : 'Expense';

    return (
        <>
            <Head title={transaction.description} />

            <CrudPage
                title={transaction.description}
                titleMeta={
                    <Badge
                        variant="outline"
                        className="rounded-full px-2.5 py-1"
                    >
                        {direction}
                    </Badge>
                }
                description={`${transaction.project.client?.name ?? 'No client'} / ${transaction.project.name}`}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline">
                            <a
                                href={transaction.pdf_url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <ExternalLink className="mr-1.5 size-4" />
                                Open PDF
                            </a>
                        </Button>
                        <Button asChild>
                            <Link
                                href={`/finance/transactions/${transaction.id}/edit`}
                            >
                                <Pencil className="mr-1.5 size-4" />
                                Edit
                            </Link>
                        </Button>
                    </div>
                }
                onBack={() =>
                    window.history.length > 1
                        ? window.history.back()
                        : window.location.assign('/finance/transactions')
                }
            >
                <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
                    <div className="space-y-4">
                        <FinanceCardSection
                            title="Amount"
                            contentClassName="space-y-4"
                        >
                            <div className="space-y-2">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Direction
                                </p>
                                <FinanceAmount
                                    amount={transaction.amount}
                                    currency={transaction.currency}
                                    variant="transaction"
                                    className="text-base"
                                />
                            </div>
                            <FinanceMetaRow label="Type" value={direction} />
                            <FinanceMetaRow
                                label="Currency"
                                value={transaction.currency ?? '—'}
                            />
                        </FinanceCardSection>

                        <FinanceCardSection
                            title="Record details"
                            contentClassName="space-y-3"
                        >
                            <FinanceMetaRow
                                label="Occurred"
                                value={formatDateOnly(
                                    transaction.occurred_date,
                                )}
                            />
                            <FinanceMetaRow
                                label="Created"
                                value={formatDetailedTimestamp(
                                    transaction.created_at,
                                )}
                            />
                            <FinanceMetaRow
                                label="Category"
                                value={transaction.category ?? 'Uncategorized'}
                            />
                            <FinanceMetaRow
                                label="Record"
                                value={`TX-${transaction.id}`}
                            />
                        </FinanceCardSection>

                        <FinanceCardSection
                            title="Document links"
                            contentClassName="space-y-3 text-sm"
                        >
                            <FinanceDocumentLink
                                label="Internal PDF"
                                href={transaction.pdf_url}
                            />
                        </FinanceCardSection>
                    </div>

                    <div className="space-y-4">
                        <FinanceCardSection
                            title="Transaction snapshot"
                            description="Transactions now use the same structured finance detail treatment as invoices while keeping transaction-specific content concise."
                            contentClassName="space-y-6"
                        >
                            <div className="space-y-2">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Project
                                </p>
                                <FinanceProjectLabel
                                    stacked
                                    project={transaction.project}
                                />
                            </div>

                            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem_12rem]">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            Description
                                        </p>
                                        <p className="font-medium text-foreground">
                                            {transaction.description}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            Category
                                        </p>
                                        <p className="font-medium text-foreground">
                                            {transaction.category ?? '—'}
                                        </p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            Amount
                                        </p>
                                        <FinanceAmount
                                            amount={transaction.amount}
                                            currency={transaction.currency}
                                            variant="transaction"
                                        />
                                    </div>
                                </div>
                            </div>
                        </FinanceCardSection>

                        <FinancePreviewCard
                            title="Document preview"
                            icon={FileText}
                            src={transaction.pdf_url}
                            iframeTitle={`Transaction ${transaction.id}`}
                        />
                    </div>
                </div>
            </CrudPage>
        </>
    );
}

FinanceTransactionShow.layout = (page: ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
