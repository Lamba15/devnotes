import { Link, router } from '@inertiajs/react';
import {
    ArcElement,
    Chart as ChartJS,
    DoughnutController,
    Legend,
    Tooltip as ChartTooltip,
} from 'chart.js';
import { useRef } from 'react';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, DoughnutController, ChartTooltip, Legend);

export type Segment = {
    label: string;
    value: number;
    color: string;
    href?: string;
};

export function DistributionChart({
    segments,
    label,
}: {
    segments: Segment[];
    label?: string;
}) {
    const chartRef = useRef<ChartJS<'doughnut'>>(null);
    const filtered = segments.filter((s) => s.value > 0);

    if (filtered.length === 0) {
        return (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No data yet
            </div>
        );
    }

    const total = filtered.reduce((sum, s) => sum + s.value, 0);

    const data = {
        labels: filtered.map((s) => s.label),
        datasets: [
            {
                data: filtered.map((s) => s.value),
                backgroundColor: filtered.map((s) => s.color + 'cc'),
                borderColor: filtered.map((s) => s.color),
                borderWidth: 1.5,
                hoverOffset: 6,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        onClick: (event: unknown) => {
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
                const segment = filtered[points[0].index];

                if (segment?.href) {
                    router.visit(segment.href);
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
                { intersect: true },
                false,
            );

            const hoveredSegment = points.length > 0 ? filtered[points[0].index] : null;

            chart.canvas.style.cursor = hoveredSegment?.href ? 'pointer' : 'default';
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                titleColor: 'rgba(160, 160, 160, 0.9)',
                bodyColor: '#e4e4e7',
                borderColor: 'rgba(63, 63, 70, 0.6)',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
                bodyFont: { size: 12, weight: 'bold' as const },
                callbacks: {
                    label: (ctx: { label: string; parsed: number }) => {
                        const pct = Math.round((ctx.parsed / total) * 100);

                        return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
                    },
                },
            },
        },
        animation: {
            duration: 600,
            easing: 'easeInOutCubic' as const,
        },
    };

    return (
        <div className="flex items-center gap-5">
            <div className="relative h-36 w-36 shrink-0">
                <Doughnut ref={chartRef} data={data} options={options} />
                {label ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold tabular-nums">
                            {total}
                        </span>
                    </div>
                ) : null}
            </div>
            <div className="min-w-0 space-y-1.5">
                {filtered.map((s) => {
                    const row = (
                        <>
                            <span
                                className="block h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: s.color }}
                            />
                            <span className="truncate text-sm text-muted-foreground">
                                {s.label}
                            </span>
                            <span className="ml-auto shrink-0 text-sm font-medium tabular-nums">
                                {s.value}
                            </span>
                        </>
                    );

                    if (s.href) {
                        return (
                            <Link
                                key={s.label}
                                href={s.href}
                                className="-mx-1 flex items-center gap-2.5 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/40"
                            >
                                {row}
                            </Link>
                        );
                    }

                    return (
                        <div key={s.label} className="flex items-center gap-2.5">
                            {row}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
