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

ChartJS.register(
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    ChartTooltip,
);

export type MonthlyClosedIssue = {
    month: string;
    label: string;
    count: number;
};

export function ClosedIssuesChart({ data }: { data: MonthlyClosedIssue[] }) {
    const chartRef = useRef<ChartJS<'bar'>>(null);

    const chartData = useMemo(
        () => ({
            labels: data.map((d) => d.label),
            datasets: [
                {
                    label: 'Closed Issues',
                    data: data.map((d) => d.count),
                    backgroundColor: 'rgba(99, 102, 241, 0.65)',
                    borderColor: '#6366f1',
                    borderWidth: 1.5,
                    borderRadius: 4,
                    hoverBackgroundColor: 'rgba(99, 102, 241, 0.9)',
                },
            ],
        }),
        [data],
    );

    const chartOptions = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index' as const,
                intersect: false,
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
                        stepSize: 1,
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
                    callbacks: {
                        label: (ctx: { parsed: { y: number | null } }) => {
                            const val = ctx.parsed.y ?? 0;

                            return `${val} issue${val === 1 ? '' : 's'} closed`;
                        },
                    },
                },
            },
            animation: {
                duration: 800,
                easing: 'easeInOutCubic' as const,
            },
        }),
        [data],
    );

    if (data.length === 0) {
        return (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No closed issues yet.
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
            <div className="h-64">
                <Bar ref={chartRef} data={chartData} options={chartOptions} />
            </div>
        </div>
    );
}
