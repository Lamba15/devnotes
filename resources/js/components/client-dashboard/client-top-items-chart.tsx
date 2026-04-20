import { router } from '@inertiajs/react';
import {
    BarController,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    LinearScale,
    Tooltip as ChartTooltip,
} from 'chart.js';
import { useCallback, useMemo, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import { formatCurrencyAmount } from '@/lib/format-currency';

ChartJS.register(
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    ChartTooltip,
);

const defaultBarColors = [
    '#8b5cf6',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ec4899',
];

export type TopItem = {
    id: number;
    name: string;
    value: number;
};

export function ClientTopItemsChart({
    items,
    currency,
    emptyMessage = 'No data yet.',
    valueKind = 'currency',
    unitSingular,
    unitPlural,
    onItemClick,
    tooltipFooter = 'Click to view',
    colors = defaultBarColors,
}: {
    items: TopItem[];
    currency?: string | null;
    emptyMessage?: string;
    valueKind?: 'currency' | 'count';
    unitSingular?: string;
    unitPlural?: string;
    onItemClick: (item: TopItem) => void;
    tooltipFooter?: string;
    colors?: string[];
}) {
    const chartRef = useRef<ChartJS<'bar'>>(null);

    const handleClick = useCallback(
        (event: unknown) => {
            const chart = chartRef.current;

            if (!chart) {
                return;
            }

            const points = chart.getElementsAtEventForMode(
                event as Event,
                'nearest',
                { intersect: true },
                false,
            );

            if (points.length > 0) {
                const idx = points[0].index;
                const item = items[idx];

                if (item) {
                    onItemClick(item);
                }
            }
        },
        [items, onItemClick],
    );

    const chartData = useMemo(
        () => ({
            labels: items.map((c) => c.name),
            datasets: [
                {
                    data: items.map((c) => c.value),
                    backgroundColor: items.map(
                        (_, i) => colors[i % colors.length] + 'bb',
                    ),
                    borderColor: items.map(
                        (_, i) => colors[i % colors.length],
                    ),
                    borderWidth: 1.5,
                    borderRadius: 6,
                    hoverBackgroundColor: items.map(
                        (_, i) => colors[i % colors.length],
                    ),
                    barThickness: 28,
                },
            ],
        }),
        [items, colors],
    );

    const chartOptions = useMemo(
        () => ({
            indexAxis: 'y' as const,
            responsive: true,
            maintainAspectRatio: false,
            onClick: handleClick,
            onHover: (event: unknown) => {
                const chart = chartRef.current;

                if (!chart) {
                    return;
                }

                const points = chart.getElementsAtEventForMode(
                    event as Event,
                    'nearest',
                    { intersect: true },
                    false,
                );

                chart.canvas.style.cursor =
                    points.length > 0 ? 'pointer' : 'default';
            },
            scales: {
                x: {
                    grid: { color: 'rgba(160, 160, 160, 0.1)' },
                    ticks: {
                        color: 'rgba(160, 160, 160, 0.7)',
                        font: { size: 10 },
                        ...(valueKind === 'count'
                            ? { stepSize: 1 }
                            : {
                                  callback: (value: string | number) =>
                                      formatCurrencyAmount(
                                          Number(value),
                                          currency ?? null,
                                      ),
                              }),
                    },
                    border: { display: false },
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(200, 200, 200, 0.9)',
                        font: { size: 12, weight: 'bold' as const },
                    },
                    border: { display: false },
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
                    bodyFont: { size: 13, weight: 'bold' as const },
                    callbacks: {
                        label: (ctx: { parsed: { x: number | null } }) => {
                            const val = ctx.parsed.x ?? 0;

                            if (valueKind === 'currency') {
                                return `${formatCurrencyAmount(val, currency ?? null)}`;
                            }

                            const unit =
                                val === 1
                                    ? (unitSingular ?? '')
                                    : (unitPlural ?? unitSingular ?? '');

                            return unit ? `${val} ${unit}` : `${val}`;
                        },
                        footer: () => tooltipFooter,
                    },
                },
            },
            animation: {
                duration: 800,
                easing: 'easeInOutCubic' as const,
            },
        }),
        [
            handleClick,
            currency,
            valueKind,
            unitSingular,
            unitPlural,
            tooltipFooter,
        ],
    );

    if (items.length === 0) {
        return (
            <p className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
            </p>
        );
    }

    return (
        <div
            className="rounded-xl border border-border/60 bg-background/70 p-4"
            style={{ height: Math.max(items.length * 50 + 40, 180) }}
        >
            <Bar ref={chartRef} data={chartData} options={chartOptions} />
        </div>
    );
}

export function clientVisitTopItem(urlBuilder: (item: TopItem) => string) {
    return (item: TopItem) => {
        router.visit(urlBuilder(item));
    };
}
