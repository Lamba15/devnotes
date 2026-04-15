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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type MoneySummary = {
    amount: number;
    currency: string | null;
    mixed_currencies: boolean;
};

type TimelinePoint = {
    period: string;
    label: string;
    monthly_invoiced: number;
    monthly_paid: number;
    cumulative_invoiced: number;
    cumulative_paid: number;
    running_account: number;
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
    timeline: TimelinePoint[];
};

type ClientFinanceAnalysisProps = {
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
                                describeOverallBalance(overallBalance)
                            ) : (
                                <>This client spans multiple currencies.</>
                            )}
                        </CardTitle>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                            {hasSingleCurrency
                                ? explainBalance(overallBalance)
                                : 'No FX conversion is applied. The per-currency sections below show exactly what the client owes you, what you owe the client, and how invoices and payments evolved over time.'}
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
                    />
                ))}
            </div>
        </section>
    );
}

function CurrencyBreakdownSection({
    analysis,
}: {
    analysis: CurrencyAnalysis;
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
                        {describeCurrencyBalance(analysis)}
                    </p>
                </div>
                <div className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {analysis.label}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AmountMetricCard
                    title="Client owes you"
                    amount={analysis.client_owes_you}
                    currency={analysis.currency}
                    tone="danger"
                />
                <AmountMetricCard
                    title="You owe client"
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
                <TimelineChartCard analysis={analysis} />
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Invoice status breakdown
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
                                label="Positive payments received"
                                amount={analysis.received_total}
                                currency={analysis.currency}
                            />
                            <InlineMetric
                                label="Refunds / money back"
                                amount={analysis.refund_total}
                                currency={analysis.currency}
                            />
                            <InlineMetric
                                label="Open invoice exposure"
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

function TimelineChartCard({ analysis }: { analysis: CurrencyAnalysis }) {
    return (
        <Card>
            <CardHeader className="space-y-2">
                <CardTitle className="text-base">
                    Billed vs paid over time
                </CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                    Cumulative invoice totals and cumulative net payments across
                    the last {analysis.timeline.length} month
                    {analysis.timeline.length === 1 ? '' : 's'} with recorded
                    activity.
                </p>
            </CardHeader>
            <CardContent>
                {analysis.timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Not enough dated records to chart this relationship yet.
                    </p>
                ) : (
                    <FinanceTrendChart
                        timeline={analysis.timeline}
                        currency={analysis.currency}
                    />
                )}
            </CardContent>
        </Card>
    );
}

function FinanceTrendChart({
    timeline,
    currency,
}: {
    timeline: TimelinePoint[];
    currency: string | null;
}) {
    const width = 760;
    const height = 260;
    const left = 18;
    const right = 18;
    const top = 12;
    const bottom = 34;
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;

    const values = timeline.flatMap((point) => [
        point.cumulative_invoiced,
        point.cumulative_paid,
    ]);
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 0);
    const rangePadding = Math.max((maxValue - minValue) * 0.12, 1);
    const scaledMin = minValue - rangePadding;
    const scaledMax = maxValue + rangePadding;
    const scaleX = (index: number) =>
        left +
        (timeline.length === 1
            ? chartWidth / 2
            : (index / (timeline.length - 1)) * chartWidth);
    const scaleY = (value: number) =>
        top +
        chartHeight -
        ((value - scaledMin) / (scaledMax - scaledMin || 1)) * chartHeight;
    const baselineY = scaleY(0);

    const invoicedPath = timeline
        .map(
            (point, index) =>
                `${index === 0 ? 'M' : 'L'} ${scaleX(index)} ${scaleY(point.cumulative_invoiced)}`,
        )
        .join(' ');
    const paidPath = timeline
        .map(
            (point, index) =>
                `${index === 0 ? 'M' : 'L'} ${scaleX(index)} ${scaleY(point.cumulative_paid)}`,
        )
        .join(' ');

    const yTicks = [0, 0.33, 0.66, 1].map(
        (ratio) => scaledMin + (scaledMax - scaledMin) * ratio,
    );
    const xLabels = pickTimelineLabels(timeline);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <LegendSwatch label="Invoiced" color="#8b5cf6" />
                <LegendSwatch label="Paid" color="#0f766e" />
                <LegendSwatch label="Zero line" color="#94a3b8" />
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/70 p-3">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="h-64 w-full min-w-[42rem]"
                    role="img"
                    aria-label="Cumulative invoiced and paid amounts over time"
                >
                    {yTicks.map((tick) => (
                        <g key={tick}>
                            <line
                                x1={left}
                                x2={width - right}
                                y1={scaleY(tick)}
                                y2={scaleY(tick)}
                                stroke="currentColor"
                                strokeWidth="1"
                                className="text-border/70"
                            />
                            <text
                                x={left + 4}
                                y={scaleY(tick) - 6}
                                className="fill-muted-foreground text-[10px]"
                            >
                                {formatCompactMoney(tick, currency)}
                            </text>
                        </g>
                    ))}

                    <line
                        x1={left}
                        x2={width - right}
                        y1={baselineY}
                        y2={baselineY}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        strokeWidth="1.5"
                    />

                    <path
                        d={invoicedPath}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d={paidPath}
                        fill="none"
                        stroke="#0f766e"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {timeline.map((point, index) => (
                        <g key={point.period}>
                            <circle
                                cx={scaleX(index)}
                                cy={scaleY(point.cumulative_invoiced)}
                                r="4"
                                fill="#8b5cf6"
                            />
                            <circle
                                cx={scaleX(index)}
                                cy={scaleY(point.cumulative_paid)}
                                r="4"
                                fill="#0f766e"
                            />
                        </g>
                    ))}

                    {xLabels.map((label) => (
                        <text
                            key={label.period}
                            x={scaleX(label.index)}
                            y={height - 10}
                            textAnchor="middle"
                            className="fill-muted-foreground text-[10px]"
                        >
                            {label.label}
                        </text>
                    ))}
                </svg>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                {timeline.slice(-3).map((point) => (
                    <div
                        key={point.period}
                        className="rounded-xl border border-border/60 bg-background/70 p-3"
                    >
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            {point.label}
                        </p>
                        <div className="mt-3 space-y-2 text-sm">
                            <InlineMetric
                                label="Invoiced"
                                amount={point.monthly_invoiced}
                                currency={currency}
                            />
                            <InlineMetric
                                label="Paid"
                                amount={point.monthly_paid}
                                currency={currency}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
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

function LegendSwatch({ label, color }: { label: string; color: string }) {
    return (
        <span className="inline-flex items-center gap-2">
            <span
                className="block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
            />
            {label}
        </span>
    );
}

function describeOverallBalance(summary: MoneySummary) {
    if (summary.amount < 0) {
        return 'This client currently owes you more than they have paid.';
    }

    if (summary.amount > 0) {
        return 'You currently owe this client value back or future delivery.';
    }

    return 'This client is currently settled against recorded invoices and payments.';
}

function explainBalance(summary: MoneySummary) {
    if (summary.amount < 0) {
        return 'Invoices exceed recorded payments, so the open balance sits on the client side. Use the per-currency sections below to see how that gap formed over time.';
    }

    if (summary.amount > 0) {
        return 'Recorded payments exceed invoiced value, so the balance currently sits on your side. This usually means deposit-heavy work, credit carried forward, or refunds still to be invoiced.';
    }

    return 'Recorded payments and invoiced value currently cancel out. The detailed sections still show payment timing, invoice status, and trend history.';
}

function describeCurrencyBalance(analysis: CurrencyAnalysis) {
    if (analysis.client_owes_you > 0) {
        return `In ${analysis.label}, this client owes you more than they have paid so far. The gap between billed work and cash movement is shown below.`;
    }

    if (analysis.you_owe_client > 0) {
        return `In ${analysis.label}, you currently owe the client more value than you have billed. This usually means deposits, prepaid work, or money returned to the client.`;
    }

    return `In ${analysis.label}, recorded invoices and net payments are currently balanced.`;
}

function formatCompactMoney(amount: number, currency: string | null) {
    const value = Math.abs(amount);

    if (value >= 1000) {
        return `${amount < 0 ? '-' : ''}${Math.round(value / 100) / 10}${currency ? ` ${currency}` : ''}`;
    }

    return `${amount < 0 ? '-' : ''}${Math.round(value)}${currency ? ` ${currency}` : ''}`;
}

function pickTimelineLabels(timeline: TimelinePoint[]) {
    if (timeline.length <= 3) {
        return timeline.map((point, index) => ({
            period: point.period,
            label: point.label,
            index,
        }));
    }

    const middleIndex = Math.floor((timeline.length - 1) / 2);

    return [
        { period: timeline[0].period, label: timeline[0].label, index: 0 },
        {
            period: timeline[middleIndex].period,
            label: timeline[middleIndex].label,
            index: middleIndex,
        },
        {
            period: timeline[timeline.length - 1].period,
            label: timeline[timeline.length - 1].label,
            index: timeline.length - 1,
        },
    ];
}
