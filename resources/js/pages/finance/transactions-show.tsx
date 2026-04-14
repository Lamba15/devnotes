import { Head, Link } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowLeft,
    ArrowUpRight,
    Calendar,
    Clock3,
    Download,
    FolderKanban,
    Pencil,
    Tag,
    Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatDateOnly, formatDetailedTimestamp } from '@/lib/datetime';
import { formatCurrencyAmount } from '@/lib/format-currency';

export default function FinanceTransactionShow({
    transaction,
}: {
    transaction: {
        id: number;
        description: string;
        amount: string;
        currency: string | null;
        occurred_date: string | null;
        category: string | null;
        created_at: string | null;
        project: {
            id: number;
            name: string;
            client?: { id: number; name: string } | null;
        };
    };
}) {
    const amount = Number(transaction.amount);
    const isPositive = amount >= 0;
    const directionLabel = isPositive ? 'Income' : 'Expense';
    const amountLabel = formatCurrencyAmount(amount, transaction.currency, {
        absolute: true,
    });

    return (
        <>
            <Head title={transaction.description} />

            <div className="relative min-h-full overflow-hidden bg-[linear-gradient(180deg,#dce5f3_0%,#eaf1fb_42%,#dde7f5_100%)] px-4 py-8 sm:px-6 lg:px-8 dark:bg-[linear-gradient(180deg,#15111d_0%,#1a1522_48%,#120f18_100%)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-24 bg-[#8f63bb] dark:bg-[#6b468f]" />
                    <div className="absolute top-0 left-[14%] h-28 w-[22rem] rounded-b-[5rem] bg-[#4b2c6c] sm:w-[30rem] dark:bg-[#3e2559]" />
                    <div className="absolute top-56 -left-10 size-24 rounded-full border-[16px] border-[#8f63bb]/75 dark:border-[#7c59a5]/65" />
                    <div className="absolute top-44 -right-12 size-36 rounded-full border-[22px] border-[#8f63bb]/65 dark:border-[#7c59a5]/55" />
                </div>

                <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-4 lg:gap-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.32em] text-[#4f2d72] uppercase dark:text-[#ceb5ea]">
                                Finance record
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#2a1e40] dark:text-[#f6efff]">
                                Transaction detail
                            </h1>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                asChild
                                variant="outline"
                                className="border-[#7a58a4]/30 bg-white/80 text-[#44295f] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[#f6efff] dark:hover:bg-white/10"
                            >
                                <Link href="/finance/transactions">
                                    <ArrowLeft className="mr-1.5 size-3.5" />
                                    Back
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="border-[#7a58a4]/30 bg-white/80 text-[#44295f] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[#f6efff] dark:hover:bg-white/10"
                            >
                                <a
                                    href={`/finance/transactions/${transaction.id}/pdf`}
                                >
                                    <Download className="mr-1.5 size-3.5" />
                                    PDF
                                </a>
                            </Button>
                            <Button
                                asChild
                                className="border-[#4b2c6c] bg-[#4b2c6c] text-white hover:bg-[#3f255c] dark:border-[#c6a7e8] dark:bg-[#c6a7e8] dark:text-[#241833] dark:hover:bg-[#d8bef0]"
                            >
                                <Link
                                    href={`/finance/transactions/${transaction.id}/edit`}
                                >
                                    <Pencil className="mr-1.5 size-3.5" />
                                    Edit
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <section className="relative overflow-hidden rounded-[2.4rem] border border-[#8e6bb4]/20 bg-[#eef4fb] text-[#2a1e40] shadow-[0_40px_120px_rgba(57,32,88,0.2)] dark:border-[#8e6bb4]/15 dark:bg-[#18131f] dark:text-[#f6efff]">
                        <div className="absolute inset-x-0 top-0 h-36 bg-[#8f63bb] dark:bg-[#6b468f]" />
                        <div className="absolute top-0 left-[16%] h-40 w-[17rem] rounded-b-[4rem] bg-[#4b2c6c] sm:w-[26rem] dark:bg-[#3e2559]" />
                        <div className="absolute top-48 right-10 hidden h-12 w-24 -rotate-6 border-t-2 border-[#9b76c4] bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(155,118,196,0.65)_6px,rgba(155,118,196,0.65)_9px)] lg:block dark:border-[#8a65b0]" />

                        <div className="relative px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
                            <div className="space-y-8">
                                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                                    <div className="space-y-5">
                                        <div className="flex flex-wrap items-start gap-4 text-white">
                                            <div className="flex size-14 items-center justify-center rounded-full border border-white/35 bg-white/10 text-lg font-semibold tracking-[0.2em] sm:size-16 sm:text-xl">
                                                TX
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold tracking-[0.18em] text-white/85 uppercase">
                                                    Ledger document
                                                </p>
                                                <p className="mt-1 max-w-lg text-sm text-white/70">
                                                    A sharper transaction sheet
                                                    with the amount, direction,
                                                    and paper structure carrying
                                                    the page.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {Array.from({ length: 11 }).map(
                                                (_, index) => (
                                                    <span
                                                        key={index}
                                                        className="h-3 w-3 border border-[#6e49a0] [clip-path:polygon(18%_10%,100%_50%,18%_90%)] dark:border-[#b38ddd]"
                                                    />
                                                ),
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[clamp(2.2rem,7vw,4.75rem)] font-light tracking-[0.14em] text-[#40255f] uppercase dark:text-[#ecdfff]">
                                                Transaction
                                            </p>
                                            <h2 className="max-w-4xl text-2xl leading-tight font-semibold tracking-[-0.03em] text-[#2a1e40] sm:text-3xl lg:text-[3.1rem] dark:text-[#fff9ff]">
                                                {transaction.description}
                                            </h2>
                                            <p className="max-w-2xl text-sm text-[#55446c] sm:text-base dark:text-[#d7c6ea]">
                                                {transaction.project.client
                                                    ?.name ?? 'No client'}{' '}
                                                / {transaction.project.name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-start lg:justify-end">
                                        <div className="inline-flex flex-wrap items-center gap-x-6 gap-y-2 rounded-full bg-[#8f63bb] px-5 py-3 text-sm font-medium text-white shadow-[0_12px_30px_rgba(75,44,108,0.3)] dark:bg-[#724c98]">
                                            <span>
                                                Record: TX-{transaction.id}
                                            </span>
                                            <span>
                                                Occurred:{' '}
                                                {formatDateOnly(
                                                    transaction.occurred_date,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_22rem]">
                                    <div className="space-y-6">
                                        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
                                            <div className="rounded-[2rem] border border-[#8e6bb4]/15 bg-white/60 p-5 backdrop-blur-sm dark:border-white/8 dark:bg-white/5">
                                                <p className="text-xs font-semibold tracking-[0.26em] text-[#64458a] uppercase dark:text-[#ceb5ea]">
                                                    Counterparty
                                                </p>
                                                <p className="mt-4 text-xl font-semibold text-[#342547] dark:text-[#fff9ff]">
                                                    {transaction.project.client
                                                        ?.name ?? 'No client'}
                                                </p>
                                                <p className="mt-1 text-sm text-[#66557d] dark:text-[#cdbade]">
                                                    {transaction.project.name}
                                                </p>
                                            </div>

                                            <div
                                                className={`rounded-[2rem] p-5 text-white shadow-[0_26px_60px_rgba(55,31,84,0.22)] ${
                                                    isPositive
                                                        ? 'bg-[linear-gradient(135deg,#1f855f_0%,#28a178_100%)]'
                                                        : 'bg-[linear-gradient(135deg,#8e2d55_0%,#bd4f6e_100%)]'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-xs font-semibold tracking-[0.26em] text-white/75 uppercase">
                                                        Amount
                                                    </p>
                                                    {isPositive ? (
                                                        <ArrowUpRight className="size-5" />
                                                    ) : (
                                                        <ArrowDownRight className="size-5" />
                                                    )}
                                                </div>
                                                <p className="mt-5 text-[2rem] leading-none font-semibold tracking-[-0.05em]">
                                                    {amountLabel}
                                                </p>
                                                <p className="mt-3 text-sm text-white/75">
                                                    {isPositive
                                                        ? 'Cash moving into the project.'
                                                        : 'Cash moving out of the project.'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="rounded-[2rem] border border-[#8e6bb4]/15 bg-white/55 p-5 shadow-[0_20px_50px_rgba(84,53,124,0.08)] backdrop-blur-sm dark:border-white/8 dark:bg-white/5">
                                            <div className="overflow-x-auto">
                                                <div className="min-w-[42rem]">
                                                    <div className="grid grid-cols-[minmax(0,1.5fr)_8rem_9rem_8rem] gap-3 rounded-full bg-[#8f63bb] px-5 py-3 text-[11px] font-semibold tracking-[0.22em] text-white uppercase">
                                                        <span>Description</span>
                                                        <span className="text-center">
                                                            Category
                                                        </span>
                                                        <span className="text-center">
                                                            Direction
                                                        </span>
                                                        <span className="text-right">
                                                            Amount
                                                        </span>
                                                    </div>

                                                    <div className="mt-5 grid gap-4">
                                                        <div className="grid grid-cols-[minmax(0,1.5fr)_8rem_9rem_8rem] items-start gap-3 px-3 py-1 text-sm text-[#38294d] dark:text-[#efe5ff]">
                                                            <div>
                                                                <p className="font-medium">
                                                                    {
                                                                        transaction.description
                                                                    }
                                                                </p>
                                                                <p className="mt-1 text-xs text-[#6b5c81] dark:text-[#bcadd2]">
                                                                    Occurred{' '}
                                                                    {formatDateOnly(
                                                                        transaction.occurred_date,
                                                                        {
                                                                            fallback:
                                                                                'Not recorded',
                                                                        },
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <p className="text-center font-medium">
                                                                {transaction.category ??
                                                                    '—'}
                                                            </p>
                                                            <p className="text-center font-medium">
                                                                {directionLabel}
                                                            </p>
                                                            <p className="text-right font-semibold">
                                                                {amountLabel}
                                                            </p>
                                                        </div>

                                                        {Array.from({
                                                            length: 5,
                                                        }).map((_, index) => (
                                                            <div
                                                                key={index}
                                                                className="h-10 border-b border-[#7d58aa]/25 dark:border-white/10"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-3">
                                            <MetaCard
                                                icon={
                                                    <Calendar className="size-4" />
                                                }
                                                label="Occurred on"
                                                value={formatDateOnly(
                                                    transaction.occurred_date,
                                                    {
                                                        fallback:
                                                            'Not recorded',
                                                    },
                                                )}
                                            />
                                            <MetaCard
                                                icon={
                                                    <Clock3 className="size-4" />
                                                }
                                                label="Recorded at"
                                                value={formatDetailedTimestamp(
                                                    transaction.created_at,
                                                    {
                                                        fallback:
                                                            'Not recorded',
                                                    },
                                                )}
                                            />
                                            <MetaCard
                                                icon={
                                                    <Tag className="size-4" />
                                                }
                                                label="Category"
                                                value={
                                                    transaction.category ??
                                                    'Uncategorized'
                                                }
                                            />
                                        </div>
                                    </div>

                                    <aside className="space-y-4">
                                        <div className="rounded-[2rem] bg-[#4b2c6c] p-6 text-white shadow-[0_28px_60px_rgba(75,44,108,0.35)] dark:bg-[#5e3a84]">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-xs font-semibold tracking-[0.26em] text-white/70 uppercase">
                                                    Direction
                                                </p>
                                                <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-white uppercase">
                                                    {directionLabel}
                                                </Badge>
                                            </div>
                                            <p className="mt-6 text-[2.3rem] leading-none font-semibold tracking-[-0.05em] sm:text-[2.9rem]">
                                                {amountLabel}
                                            </p>
                                            <p className="mt-3 text-sm text-white/70">
                                                The transaction amount is
                                                treated as the visual anchor
                                                instead of a field lost in a
                                                list.
                                            </p>
                                        </div>

                                        <div className="rounded-[2rem] border border-[#8e6bb4]/15 bg-white/60 p-5 backdrop-blur-sm dark:border-white/8 dark:bg-white/5">
                                            <div className="space-y-4">
                                                <SideRow
                                                    icon={
                                                        <FolderKanban className="size-4" />
                                                    }
                                                    label="Project"
                                                    value={
                                                        transaction.project.name
                                                    }
                                                />
                                                <SideRow
                                                    icon={
                                                        <Users className="size-4" />
                                                    }
                                                    label="Client"
                                                    value={
                                                        transaction.project
                                                            .client?.name ?? '—'
                                                    }
                                                />
                                                <SideRow
                                                    icon={
                                                        <Tag className="size-4" />
                                                    }
                                                    label="Currency"
                                                    value={
                                                        transaction.currency ??
                                                        '—'
                                                    }
                                                />
                                                <SideRow
                                                    icon={
                                                        <Clock3 className="size-4" />
                                                    }
                                                    label="Created"
                                                    value={formatDetailedTimestamp(
                                                        transaction.created_at,
                                                        {
                                                            fallback:
                                                                'Not recorded',
                                                        },
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-[2rem] border border-[#8e6bb4]/15 bg-[#efe4fb] p-5 dark:border-white/8 dark:bg-[#241a31]">
                                            <p className="text-xs font-semibold tracking-[0.26em] text-[#64458a] uppercase dark:text-[#ceb5ea]">
                                                Reference
                                            </p>
                                            <p className="mt-4 text-lg font-semibold text-[#4b2c6c] dark:text-[#f6efff]">
                                                TX-{transaction.id}
                                            </p>
                                            <p className="mt-2 text-sm leading-7 text-[#66557d] dark:text-[#cdbade]">
                                                Stored under{' '}
                                                {transaction.project.name} and
                                                tied to{' '}
                                                {transaction.project.client
                                                    ?.name ??
                                                    'the current client'}
                                                .
                                            </p>
                                        </div>
                                    </aside>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}

function MetaCard({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-[2rem] border border-[#8e6bb4]/15 bg-white/60 p-5 backdrop-blur-sm dark:border-white/8 dark:bg-white/5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.26em] text-[#64458a] uppercase dark:text-[#ceb5ea]">
                {icon}
                {label}
            </div>
            <p className="mt-4 text-base font-medium text-[#342547] dark:text-[#fff9ff]">
                {value}
            </p>
        </div>
    );
}

function SideRow({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="border-b border-[#7d58aa]/15 pb-4 last:border-b-0 last:pb-0 dark:border-white/8">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-[#64458a] uppercase dark:text-[#ceb5ea]">
                {icon}
                {label}
            </div>
            <p className="mt-2 text-sm font-medium text-[#342547] dark:text-[#fff9ff]">
                {value}
            </p>
        </div>
    );
}

FinanceTransactionShow.layout = (page: ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
