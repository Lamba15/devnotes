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

ChartJS.register(
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    ChartTooltip,
);

export const projectStatusColors = [
    '#8b5cf6',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
];

export type ProjectStatusDatum = { name: string; slug: string; count: number };

export function ClientProjectStatusChart({
    statuses,
    onStatusClick,
}: {
    statuses: ProjectStatusDatum[];
    onStatusClick: (status: ProjectStatusDatum) => void;
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
                const status = statuses[idx];

                if (status) {
                    onStatusClick(status);
                }
            }
        },
        [statuses, onStatusClick],
    );

    const chartData = useMemo(
        () => ({
            labels: statuses.map((s) => s.name),
            datasets: [
                {
                    data: statuses.map((s) => s.count),
                    backgroundColor: statuses.map(
                        (_, i) =>
                            projectStatusColors[
                                i % projectStatusColors.length
                            ] + 'bb',
                    ),
                    borderColor: statuses.map(
                        (_, i) =>
                            projectStatusColors[i % projectStatusColors.length],
                    ),
                    borderWidth: 1.5,
                    borderRadius: 6,
                    hoverBackgroundColor: statuses.map(
                        (_, i) =>
                            projectStatusColors[i % projectStatusColors.length],
                    ),
                    barThickness: 28,
                },
            ],
        }),
        [statuses],
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
                        stepSize: 1,
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

                            return `${val} project${val === 1 ? '' : 's'}`;
                        },
                        footer: () => 'Click to filter projects',
                    },
                },
            },
            animation: {
                duration: 800,
                easing: 'easeInOutCubic' as const,
            },
        }),
        [handleClick],
    );

    if (statuses.length === 0) {
        return (
            <p className="py-6 text-center text-sm text-muted-foreground">
                No projects yet.
            </p>
        );
    }

    return (
        <div
            className="rounded-xl border border-border/60 bg-background/70 p-4"
            style={{
                height: Math.max(statuses.length * 50 + 40, 180),
            }}
        >
            <Bar ref={chartRef} data={chartData} options={chartOptions} />
        </div>
    );
}

export function clientProjectStatusClickHandler(
    projectsUrl: string,
): (status: ProjectStatusDatum) => void {
    return (status) => {
        router.get(projectsUrl, {
            'status[]': status.slug,
        });
    };
}
