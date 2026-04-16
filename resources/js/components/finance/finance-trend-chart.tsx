import {
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip as ChartTooltip,
} from 'chart.js';
import { ZoomOut } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Button } from '@/components/ui/button';
import { formatCurrencyAmount } from '@/lib/format-currency';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    ChartTooltip,
    Legend,
);

export type MonthlyPoint = {
    period: string;
    label: string;
    year: number;
    quarter: number;
    period_invoiced: number;
    period_paid: number;
    cumulative_invoiced: number;
    cumulative_paid: number;
    running_account: number;
};

export type AggregatedPoint = {
    key: string;
    label: string;
    period_invoiced: number;
    period_paid: number;
    cumulative_invoiced: number;
    cumulative_paid: number;
    running_account: number;
};

export type Timeline = {
    default_granularity: 'month' | 'quarter' | 'year';
    points: MonthlyPoint[];
};

export function aggregatePoints(
    points: MonthlyPoint[],
    granularity: 'month' | 'quarter' | 'year',
): AggregatedPoint[] {
    if (granularity === 'month') {
        return points.map((p) => ({
            key: p.period,
            label: p.label,
            period_invoiced: p.period_invoiced,
            period_paid: p.period_paid,
            cumulative_invoiced: p.cumulative_invoiced,
            cumulative_paid: p.cumulative_paid,
            running_account: p.running_account,
        }));
    }

    const grouped = new Map<
        string,
        {
            key: string;
            label: string;
            invoiced: number;
            paid: number;
            cum_invoiced: number;
            cum_paid: number;
        }
    >();

    for (const p of points) {
        const key =
            granularity === 'quarter'
                ? `${p.year}-Q${p.quarter}`
                : `${p.year}`;
        const label =
            granularity === 'quarter'
                ? `Q${p.quarter} ${p.year}`
                : `${p.year}`;

        const existing = grouped.get(key);

        if (existing) {
            existing.invoiced += p.period_invoiced;
            existing.paid += p.period_paid;
            existing.cum_invoiced = p.cumulative_invoiced;
            existing.cum_paid = p.cumulative_paid;
        } else {
            grouped.set(key, {
                key,
                label,
                invoiced: p.period_invoiced,
                paid: p.period_paid,
                cum_invoiced: p.cumulative_invoiced,
                cum_paid: p.cumulative_paid,
            });
        }
    }

    return [...grouped.values()].map((g) => ({
        key: g.key,
        label: g.label,
        period_invoiced: Math.round(g.invoiced * 100) / 100,
        period_paid: Math.round(g.paid * 100) / 100,
        cumulative_invoiced: Math.round(g.cum_invoiced * 100) / 100,
        cumulative_paid: Math.round(g.cum_paid * 100) / 100,
        running_account:
            Math.round((g.cum_paid - g.cum_invoiced) * 100) / 100,
    }));
}

type ZoomState =
    | { level: 'year' | 'quarter' | 'month'; filter: null }
    | { level: 'quarter'; filter: { year: number } }
    | { level: 'month'; filter: { year: number; quarter: number } };

export function formatCompactCurrency(
    value: number,
    currency: string | null,
): string {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    const sym = currency ?? '';

    if (abs >= 1_000_000) {
        return `${sign}${(abs / 1_000_000).toFixed(1)}M ${sym}`.trim();
    }

    if (abs >= 1_000) {
        return `${sign}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K ${sym}`.trim();
    }

    return `${sign}${Math.round(abs)} ${sym}`.trim();
}

export function FinanceTrendChart({
    timeline,
    currency,
    viewerPerspective,
    onMonthClick,
    periodCards = true,
}: {
    timeline: Timeline;
    currency: string | null;
    viewerPerspective: 'platform_owner' | 'client_user';
    onMonthClick?: (period: string, label: string) => void;
    periodCards?: boolean;
}) {
    const chartRef = useRef<ChartJS<'line'>>(null);
    const [zoom, setZoom] = useState<ZoomState>({
        level: timeline.default_granularity,
        filter: null,
    });

    const filteredPoints = useMemo(() => {
        if (!zoom.filter) {
            return timeline.points;
        }

        if ('quarter' in zoom.filter) {
            return timeline.points.filter(
                (p) =>
                    p.year === zoom.filter!.year &&
                    p.quarter ===
                        (zoom.filter as { year: number; quarter: number })
                            .quarter,
            );
        }

        return timeline.points.filter((p) => p.year === zoom.filter!.year);
    }, [timeline.points, zoom.filter]);

    const displayPoints = useMemo(
        () => aggregatePoints(filteredPoints, zoom.level),
        [filteredPoints, zoom.level],
    );

    const invoicedLabel =
        viewerPerspective === 'platform_owner' ? 'Invoiced' : 'Your invoices';
    const paidLabel =
        viewerPerspective === 'platform_owner' ? 'Paid' : 'Your payments';

    const isZoomed = zoom.filter !== null;

    const handleChartClick = useCallback(
        (
            _event: React.MouseEvent<HTMLCanvasElement>,
            elements: Array<{ index: number }>,
        ) => {
            const idx = elements[0]?.index;

            if (idx === undefined) {
                return;
            }

            const clicked = displayPoints[idx];

            if (!clicked) {
                return;
            }

            if (zoom.level === 'year') {
                setZoom({
                    level: 'quarter',
                    filter: { year: parseInt(clicked.key, 10) },
                });
            } else if (zoom.level === 'quarter') {
                const match = clicked.key.match(/^(\d+)-Q(\d)$/);

                if (match) {
                    setZoom({
                        level: 'month',
                        filter: {
                            year: parseInt(match[1], 10),
                            quarter: parseInt(match[2], 10),
                        },
                    });
                }
            } else if (zoom.level === 'month' && onMonthClick) {
                onMonthClick(clicked.key, clicked.label);
            }
        },
        [displayPoints, zoom.level, onMonthClick],
    );

    const handleZoomOut = () => {
        if (zoom.level === 'month' && zoom.filter) {
            if (timeline.default_granularity === 'year') {
                setZoom({
                    level: 'quarter',
                    filter: {
                        year: (zoom.filter as { year: number }).year,
                    },
                });
            } else {
                setZoom({
                    level: timeline.default_granularity,
                    filter: null,
                });
            }
        } else {
            setZoom({ level: timeline.default_granularity, filter: null });
        }
    };

    const zoomLabel = zoom.filter
        ? 'quarter' in zoom.filter &&
          typeof (zoom.filter as { quarter?: number }).quarter === 'number'
            ? `Q${(zoom.filter as { year: number; quarter: number }).quarter} ${zoom.filter.year}`
            : `${zoom.filter.year}`
        : null;

    const chartData = useMemo(
        () => ({
            labels: displayPoints.map((p) => p.label),
            datasets: [
                {
                    label: invoicedLabel,
                    data: displayPoints.map((p) => p.period_invoiced),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointRadius: displayPoints.length <= 18 ? 4 : 2,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#8b5cf6',
                    pointHoverBackgroundColor: '#8b5cf6',
                    pointHoverBorderColor: '#8b5cf6',
                },
                {
                    label: paidLabel,
                    data: displayPoints.map((p) => p.period_paid),
                    borderColor: '#0d9488',
                    backgroundColor: 'rgba(13, 148, 136, 0.15)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointRadius: displayPoints.length <= 18 ? 4 : 2,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#0d9488',
                    pointBorderColor: '#0d9488',
                    pointHoverBackgroundColor: '#0d9488',
                    pointHoverBorderColor: '#0d9488',
                },
            ],
        }),
        [displayPoints, invoicedLabel, paidLabel],
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
                    handleChartClick(
                        event as React.MouseEvent<HTMLCanvasElement>,
                        [{ index: points[0].index }],
                    );
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
                    points.length > 0 &&
                    (zoom.level !== 'month' || onMonthClick)
                        ? 'pointer'
                        : 'default';
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(160, 160, 160, 0.7)',
                        font: { size: 11 },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: displayPoints.length <= 6 ? 20 : 8,
                    },
                    border: { display: false },
                },
                y: {
                    grid: {
                        color: 'rgba(160, 160, 160, 0.15)',
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
                    },
                },
            },
            animation: {
                duration: 800,
                easing: 'easeInOutCubic' as const,
            },
        }),
        [
            displayPoints.length,
            currency,
            handleChartClick,
            zoom.level,
            onMonthClick,
        ],
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <LegendSwatch label={invoicedLabel} color="#8b5cf6" />
                    <LegendSwatch label={paidLabel} color="#0d9488" />
                </div>
                {isZoomed ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleZoomOut}
                        className="h-7 gap-1.5 text-xs text-muted-foreground"
                    >
                        <ZoomOut className="size-3.5" />
                        Back to {zoomLabel ? `${zoomLabel}` : 'overview'}
                    </Button>
                ) : zoom.level !== 'month' ? (
                    <span className="text-[11px] text-muted-foreground/60">
                        Click a point to zoom in
                    </span>
                ) : null}
            </div>

            <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                <div className="h-72">
                    <Line
                        ref={chartRef}
                        data={chartData}
                        options={chartOptions}
                    />
                </div>
            </div>

            {periodCards ? (
                <div className="grid gap-3 md:grid-cols-3">
                    {displayPoints.slice(-3).map((point) => (
                        <div
                            key={point.key}
                            className="rounded-xl border border-border/60 bg-background/70 p-3"
                        >
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {point.label}
                            </p>
                            <div className="mt-3 space-y-2 text-sm">
                                <InlineMetric
                                    label={
                                        viewerPerspective === 'platform_owner'
                                            ? 'Invoiced'
                                            : 'Invoiced to you'
                                    }
                                    amount={point.period_invoiced}
                                    currency={currency}
                                />
                                <InlineMetric
                                    label={
                                        viewerPerspective === 'platform_owner'
                                            ? 'Paid'
                                            : 'You paid'
                                    }
                                    amount={point.period_paid}
                                    currency={currency}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
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
            <span className="font-medium tabular-nums">
                {formatCurrencyAmount(amount, currency)}
            </span>
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
