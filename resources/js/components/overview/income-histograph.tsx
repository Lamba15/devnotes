import { router } from '@inertiajs/react';
import {
    BarController,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    LinearScale,
    Tooltip as ChartTooltip,
} from 'chart.js';
import { useMemo, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import { formatCompactCurrency } from '@/components/finance/finance-trend-chart';
import { formatCurrencyAmount } from '@/lib/format-currency';

ChartJS.register(
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    ChartTooltip,
);

export type MonthlyIncome = {
    month: string;
    label: string;
    income: number;
    expense: number;
    net: number;
};

export function IncomeHistograph({
    data,
    currency,
    seriesLabel = 'Income',
    emptyText = 'No transactions recorded yet.',
    onMonthClick,
    footerHint,
}: {
    data: MonthlyIncome[];
    currency: string | null;
    seriesLabel?: string;
    emptyText?: string;
    onMonthClick?: ((month: MonthlyIncome) => void) | null;
    footerHint?: string;
}) {
    const chartRef = useRef<ChartJS<'bar'>>(null);
    const isInteractive = onMonthClick !== null;

    const chartData = useMemo(
        () => ({
            labels: data.map((d) => d.label),
            datasets: [
                {
                    label: seriesLabel,
                    data: data.map((d) => d.income),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1.5,
                    borderRadius: 4,
                    hoverBackgroundColor: 'rgba(16, 185, 129, 0.9)',
                },
            ],
        }),
        [data, seriesLabel],
    );

    const chartOptions = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index' as const,
                intersect: false,
            },
            onClick: (event: unknown) => {
                const chart = chartRef.current;

                if (!chart) {
                    return;
                }

                const points = chart.getElementsAtEventForMode(
                    event as Event,
                    'nearest',
                    { intersect: false },
                    false,
                );

                if (points.length > 0) {
                    const idx = points[0].index;
                    const clicked = data[idx];

                    if (clicked) {
                        if (typeof onMonthClick === 'function') {
                            onMonthClick(clicked);

                            return;
                        }

                        if (!isInteractive) {
                            return;
                        }

                        const [year, month] = clicked.month.split('-');
                        const dateFrom = `${year}-${month}-01`;
                        const lastDay = new Date(
                            Number(year),
                            Number(month),
                            0,
                        ).getDate();
                        const dateTo = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

                        router.get(
                            '/finance/transactions',
                            { date_from: dateFrom, date_to: dateTo },
                            { preserveState: false, preserveScroll: false },
                        );
                    }
                }
            },
            onHover: (event: unknown) => {
                const chart = chartRef.current;

                if (!chart) {
                    return;
                }

                const points = chart.getElementsAtEventForMode(
                    event as Event,
                    'nearest',
                    { intersect: false },
                    false,
                );
                const canvas = chart.canvas;

                canvas.style.cursor =
                    isInteractive && points.length > 0 ? 'pointer' : 'default';
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(160, 160, 160, 0.7)',
                        font: { size: 11 },
                        maxRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: data.length <= 12 ? 20 : 14,
                    },
                    border: { display: false },
                },
                y: {
                    grid: {
                        color: 'rgba(160, 160, 160, 0.12)',
                    },
                    ticks: {
                        color: 'rgba(160, 160, 160, 0.7)',
                        font: { size: 11 },
                        callback: (value: string | number) =>
                            formatCompactCurrency(Number(value), currency),
                    },
                    border: { display: false },
                    beginAtZero: true,
                },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    titleColor: 'rgba(160, 160, 160, 0.9)',
                    bodyColor: '#e4e4e7',
                    borderColor: 'rgba(63, 63, 70, 0.6)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { size: 11 },
                    bodyFont: { size: 13, weight: 'bold' as const },
                    usePointStyle: true,
                    pointStyleWidth: 8,
                    callbacks: {
                        label: (ctx: {
                            dataset: { label?: string };
                            parsed: { y: number | null };
                        }) =>
                            `${ctx.dataset.label}: ${formatCurrencyAmount(ctx.parsed.y ?? 0, currency)}`,
                        footer: () =>
                            isInteractive
                                ? (footerHint ?? 'Click to view transactions')
                                : '',
                    },
                },
            },
            animation: {
                duration: 800,
                easing: 'easeInOutCubic' as const,
            },
        }),
        [currency, data, footerHint, isInteractive, onMonthClick],
    );

    if (data.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                {emptyText}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                        <span className="block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        {seriesLabel}
                    </span>
                </div>
                {isInteractive ? (
                    <span className="text-[11px] text-muted-foreground/60">
                        {footerHint ?? 'Click a month to view transactions'}
                    </span>
                ) : null}
            </div>

            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <div className="h-80">
                    <Bar
                        ref={chartRef}
                        data={chartData}
                        options={chartOptions}
                    />
                </div>
            </div>
        </div>
    );
}
