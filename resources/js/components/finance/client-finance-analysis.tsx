import {
    AlertCircle,
    BarChart3,
    CreditCard,
    Landmark,
    Scale,
    Wallet,
} from 'lucide-react';
import { FinanceAmount } from '@/components/finance/finance-amount';
import { FinanceStatusBadge } from '@/components/finance/finance-status-badge';
import { FinanceTrendChart } from '@/components/finance/finance-trend-chart';
import type { Timeline } from '@/components/finance/finance-trend-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';


type MoneySummary = {
    amount: number;
    currency: string | null;
    mixed_currencies: boolean;
};

type CurrencyAnalysis = {
    currency: string | null;
    label: string;
    running_account: number;
    client_owes_you: number;
    you_owe_client: number;
    transaction_total: number;
    invoice_total: number;
    received_total: number;
    refund_total: number;
    open_invoice_total: number;
    invoice_statuses: Record<string, { count: number; amount: number }>;
    timeline: Timeline;
};

type ClientFinanceAnalysisProps = {
    viewerPerspective: 'platform_owner' | 'client_user';
    onMonthClick?: (period: string, label: string) => void;
    analysis: {
        overall: {
            project_count: number;
            transaction_count: number;
            invoice_count: number;
            currencies: string[];
            running_account: MoneySummary;
            relationship_volume: MoneySummary;
            transaction_volume: MoneySummary;
        };
        by_currency: CurrencyAnalysis[];
    };
};

export function ClientFinanceAnalysis({
    analysis,
    viewerPerspective,
    onMonthClick,
}: ClientFinanceAnalysisProps) {
    const overallBalance = analysis.overall.running_account;
    const hasSingleCurrency = !overallBalance.mixed_currencies;

    return (
        <section className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <Card className="border-violet-200/60 bg-gradient-to-br from-violet-50 via-background to-background dark:border-violet-900/40 dark:from-violet-950/20">
                    <CardHeader className="space-y-3">
                        <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                            <Scale className="size-4" />
                            <span className="text-sm font-semibold">
                                Relationship balance
                            </span>
                        </div>
                        <CardTitle className="text-2xl leading-tight">
                            {hasSingleCurrency ? (
                                describeOverallBalance(
                                    overallBalance,
                                    viewerPerspective,
                                )
                            ) : (
                                <>This client spans multiple currencies.</>
                            )}
                        </CardTitle>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                            {hasSingleCurrency
                                ? explainBalance(
                                      overallBalance,
                                      viewerPerspective,
                                  )
                                : describeMixedCurrencyBalance(
                                      viewerPerspective,
                                  )}
                        </p>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-3">
                        <MetricTile
                            label="Accessible projects"
                            value={String(analysis.overall.project_count)}
                            icon={Landmark}
                        />
                        <MetricTile
                            label="Transactions"
                            value={String(analysis.overall.transaction_count)}
                            icon={Wallet}
                        />
                        <MetricTile
                            label="Invoices"
                            value={String(analysis.overall.invoice_count)}
                            icon={CreditCard}
                        />
                    </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2">
                    <SummaryMoneyCard
                        title="Lifetime invoiced"
                        summary={analysis.overall.relationship_volume}
                        icon={CreditCard}
                    />
                    <SummaryMoneyCard
                        title="Net cash movement"
                        summary={analysis.overall.transaction_volume}
                        icon={Wallet}
                    />
                </div>
            </div>

            {analysis.by_currency.length === 0 ? (
                <Card>
                    <CardContent className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
                        <AlertCircle className="size-4" />
                        No finance records yet for this client.
                    </CardContent>
                </Card>
            ) : null}

            <div className="space-y-6">
                {analysis.by_currency.map((currencyAnalysis) => (
                    <CurrencyBreakdownSection
                        key={currencyAnalysis.label}
                        analysis={currencyAnalysis}
                        viewerPerspective={viewerPerspective}
                        onMonthClick={onMonthClick}
                    />
                ))}
            </div>
        </section>
    );
}

function CurrencyBreakdownSection({
    analysis,
    viewerPerspective,
    onMonthClick,
}: {
    analysis: CurrencyAnalysis;
    viewerPerspective: 'platform_owner' | 'client_user';
    onMonthClick?: (period: string, label: string) => void;
}) {
    return (
        <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="size-4 text-violet-500" />
                        <h2 className="text-lg font-semibold text-foreground">
                            {analysis.label} analysis
                        </h2>
                    </div>
                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                        {describeCurrencyBalance(analysis, viewerPerspective)}
                    </p>
                </div>
                <div className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {analysis.label}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AmountMetricCard
                    title={
                        viewerPerspective === 'platform_owner'
                            ? 'Client owes you'
                            : 'You owe'
                    }
                    amount={analysis.client_owes_you}
                    currency={analysis.currency}
                    tone="danger"
                />
                <AmountMetricCard
                    title={
                        viewerPerspective === 'platform_owner'
                            ? 'You owe client'
                            : 'Your credit with us'
                    }
                    amount={analysis.you_owe_client}
                    currency={analysis.currency}
                    tone="success"
                />
                <AmountMetricCard
                    title="Lifetime invoiced"
                    amount={analysis.invoice_total}
                    currency={analysis.currency}
                />
                <AmountMetricCard
                    title="Net paid"
                    amount={analysis.transaction_total}
                    currency={analysis.currency}
                />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
                <TimelineChartCard
                    analysis={analysis}
                    viewerPerspective={viewerPerspective}
                    onMonthClick={onMonthClick}
                />
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            {viewerPerspective === 'platform_owner'
                                ? 'Invoice status breakdown'
                                : 'Your invoice status breakdown'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <StatusRow
                            status="draft"
                            count={analysis.invoice_statuses.draft?.count ?? 0}
                            amount={
                                analysis.invoice_statuses.draft?.amount ?? 0
                            }
                            currency={analysis.currency}
                        />
                        <StatusRow
                            status="pending"
                            count={
                                analysis.invoice_statuses.pending?.count ?? 0
                            }
                            amount={
                                analysis.invoice_statuses.pending?.amount ?? 0
                            }
                            currency={analysis.currency}
                        />
                        <StatusRow
                            status="paid"
                            count={analysis.invoice_statuses.paid?.count ?? 0}
                            amount={analysis.invoice_statuses.paid?.amount ?? 0}
                            currency={analysis.currency}
                        />
                        <StatusRow
                            status="overdue"
                            count={
                                analysis.invoice_statuses.overdue?.count ?? 0
                            }
                            amount={
                                analysis.invoice_statuses.overdue?.amount ?? 0
                            }
                            currency={analysis.currency}
                        />

                        <div className="grid gap-3 border-t border-border/60 pt-4 text-sm">
                            <InlineMetric
                                label={
                                    viewerPerspective === 'platform_owner'
                                        ? 'Positive payments received'
                                        : 'Payments you made'
                                }
                                amount={analysis.received_total}
                                currency={analysis.currency}
                            />
                            <InlineMetric
                                label={
                                    viewerPerspective === 'platform_owner'
                                        ? 'Refunds / money back'
                                        : 'Money returned to you'
                                }
                                amount={analysis.refund_total}
                                currency={analysis.currency}
                            />
                            <InlineMetric
                                label={
                                    viewerPerspective === 'platform_owner'
                                        ? 'Open invoice exposure'
                                        : 'Open invoiced balance'
                                }
                                amount={analysis.open_invoice_total}
                                currency={analysis.currency}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function TimelineChartCard({
    analysis,
    viewerPerspective,
    onMonthClick,
}: {
    analysis: CurrencyAnalysis;
    viewerPerspective: 'platform_owner' | 'client_user';
    onMonthClick?: (period: string, label: string) => void;
}) {
    const { timeline } = analysis;

    if (timeline.points.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {viewerPerspective === 'platform_owner'
                            ? 'Billed vs paid over time'
                            : 'Your billed vs paid history'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Not enough dated records to chart this relationship yet.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="space-y-2">
                <CardTitle className="text-base">
                    {viewerPerspective === 'platform_owner'
                        ? 'Billed vs paid over time'
                        : 'Your billed vs paid history'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <FinanceTrendChart
                    timeline={timeline}
                    currency={analysis.currency}
                    viewerPerspective={viewerPerspective}
                    onMonthClick={onMonthClick}
                />
            </CardContent>
        </Card>
    );
}

function SummaryMoneyCard({
    title,
    summary,
    icon: Icon,
}: {
    title: string;
    summary: MoneySummary;
    icon: typeof CreditCard;
}) {
    return (
        <Card>
            <CardContent className="space-y-3 pt-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="size-4" />
                    <span className="text-sm font-medium">{title}</span>
                </div>
                {summary.mixed_currencies ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                        Mixed currencies. See the per-currency sections below
                        for exact totals.
                    </p>
                ) : (
                    <FinanceAmount
                        amount={summary.amount}
                        currency={summary.currency}
                        className="text-xl"
                    />
                )}
            </CardContent>
        </Card>
    );
}

function AmountMetricCard({
    title,
    amount,
    currency,
    tone = 'default',
}: {
    title: string;
    amount: number;
    currency: string | null;
    tone?: 'default' | 'danger' | 'success';
}) {
    return (
        <Card
            className={cn(
                tone === 'danger' && 'border-red-200/70 dark:border-red-900/40',
                tone === 'success' &&
                    'border-emerald-200/70 dark:border-emerald-900/40',
            )}
        >
            <CardContent className="space-y-3 pt-6">
                <p className="text-sm font-medium text-muted-foreground">
                    {title}
                </p>
                <FinanceAmount
                    amount={amount}
                    currency={currency}
                    className="text-xl"
                />
            </CardContent>
        </Card>
    );
}

function MetricTile({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string;
    icon: typeof Landmark;
}) {
    return (
        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4" />
                <span className="text-sm">{label}</span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-foreground">
                {value}
            </p>
        </div>
    );
}

function StatusRow({
    status,
    count,
    amount,
    currency,
}: {
    status: string;
    count: number;
    amount: number;
    currency: string | null;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/70 p-3">
            <div className="space-y-1">
                <FinanceStatusBadge status={status} />
                <p className="text-xs text-muted-foreground">
                    {count} invoice{count === 1 ? '' : 's'}
                </p>
            </div>
            <FinanceAmount amount={amount} currency={currency} />
        </div>
    );
}

function InlineMetric({
    label,
    amount,
    currency,
}: {
    label: string;
    amount: number;
    currency: string | null;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <FinanceAmount amount={amount} currency={currency} />
        </div>
    );
}

function describeOverallBalance(
    summary: MoneySummary,
    viewerPerspective: 'platform_owner' | 'client_user',
) {
    if (summary.amount < 0) {
        if (viewerPerspective === 'client_user') {
            return 'You currently owe more than you have paid.';
        }

        return 'This client currently owes you more than they have paid.';
    }

    if (summary.amount > 0) {
        if (viewerPerspective === 'client_user') {
            return 'You currently have credit with us for future delivery or value.';
        }

        return 'You currently owe this client value back or future delivery.';
    }

    return viewerPerspective === 'platform_owner'
        ? 'This client is currently settled against recorded invoices and payments.'
        : 'Your account is currently settled against recorded invoices and payments.';
}

function explainBalance(
    summary: MoneySummary,
    viewerPerspective: 'platform_owner' | 'client_user',
) {
    if (summary.amount < 0) {
        if (viewerPerspective === 'client_user') {
            return 'Recorded invoices currently exceed your net payments, so there is still an open balance on your side. Use the per-currency sections below to see how that gap formed over time.';
        }

        return 'Invoices exceed recorded payments, so the open balance sits on the client side. Use the per-currency sections below to see how that gap formed over time.';
    }

    if (summary.amount > 0) {
        if (viewerPerspective === 'client_user') {
            return 'Your recorded payments currently exceed invoiced value, so you have credit on the account. This usually means deposit-heavy work, prepaid work, or value still to be delivered.';
        }

        return 'Recorded payments exceed invoiced value, so the balance currently sits on your side. This usually means deposit-heavy work, credit carried forward, or refunds still to be invoiced.';
    }

    return viewerPerspective === 'platform_owner'
        ? 'Recorded payments and invoiced value currently cancel out. The detailed sections still show payment timing, invoice status, and trend history.'
        : 'Recorded payments and invoiced value currently cancel out. The detailed sections still show payment timing, invoice status, and trend history.';
}

function describeMixedCurrencyBalance(
    viewerPerspective: 'platform_owner' | 'client_user',
) {
    return viewerPerspective === 'platform_owner'
        ? 'No FX conversion is applied. The per-currency sections below show exactly what the client owes you, what you owe the client, and how invoices and payments evolved over time.'
        : 'No FX conversion is applied. The per-currency sections below show exactly what you owe, what credit you have with us, and how invoices and payments evolved over time.';
}

function describeCurrencyBalance(
    analysis: CurrencyAnalysis,
    viewerPerspective: 'platform_owner' | 'client_user',
) {
    if (analysis.client_owes_you > 0) {
        if (viewerPerspective === 'client_user') {
            return `In ${analysis.label}, your invoiced balance is still ahead of your payments so far. The gap between billed work and cash movement is shown below.`;
        }

        return `In ${analysis.label}, this client owes you more than they have paid so far. The gap between billed work and cash movement is shown below.`;
    }

    if (analysis.you_owe_client > 0) {
        if (viewerPerspective === 'client_user') {
            return `In ${analysis.label}, you currently have credit on the account because payments are ahead of billed value.`;
        }

        return `In ${analysis.label}, you currently owe the client more value than you have billed. This usually means deposits, prepaid work, or money returned to the client.`;
    }

    return viewerPerspective === 'platform_owner'
        ? `In ${analysis.label}, recorded invoices and net payments are currently balanced.`
        : `In ${analysis.label}, your recorded invoices and net payments are currently balanced.`;
}

