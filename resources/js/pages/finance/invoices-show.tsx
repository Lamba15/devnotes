import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Download,
    FileText,
    FolderKanban,
    Pencil,
    Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatDateOnly } from '@/lib/datetime';
import { formatCurrencyAmount } from '@/lib/format-currency';

export default function FinanceInvoiceShow({
    invoice,
}: {
    invoice: {
        id: number;
        reference: string;
        status: string;
        amount: string;
        currency: string | null;
        issued_at: string | null;
        due_at: string | null;
        paid_at: string | null;
        notes: string | null;
        project: {
            id: number;
            name: string;
            client?: { id: number; name: string } | null;
        };
    };
}) {
    const issuedOn = formatDateOnly(invoice.issued_at, {
        fallback: 'Not recorded',
    });
    const dueOn = formatDateOnly(invoice.due_at, {
        fallback: 'Not recorded',
    });
    const paidOn = formatDateOnly(invoice.paid_at, {
        fallback: 'Not paid',
    });
    const totalAmount = formatCurrencyAmount(invoice.amount, invoice.currency);

    return (
        <>
            <Head title={invoice.reference} />

            <div className="relative min-h-full overflow-hidden bg-[linear-gradient(180deg,#d7dff0_0%,#e6edf8_40%,#dae3f2_100%)] px-4 py-8 sm:px-6 lg:px-8 dark:bg-[linear-gradient(180deg,#171321_0%,#1d1828_45%,#15111d_100%)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-24 bg-[#9d6cca] dark:bg-[#70459b]" />
                    <div className="absolute top-0 left-[16%] h-28 w-[24rem] rounded-b-[5rem] bg-[#5f3488] sm:w-[32rem] dark:bg-[#4b286c]" />
                    <div className="absolute top-44 -left-16 size-28 rounded-full border-[18px] border-[#9d6cca]/80 dark:border-[#7f55aa]/70" />
                    <div className="absolute top-52 -right-12 size-36 rounded-full border-[22px] border-[#9d6cca]/70 dark:border-[#7f55aa]/60" />
                </div>

                <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-4 lg:gap-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.32em] text-[#5f3488] uppercase dark:text-[#d2b8ef]">
                                Finance document
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#2d2142] dark:text-[#f5ecff]">
                                Invoice detail
                            </h1>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                asChild
                                variant="outline"
                                className="border-[#7a58a4]/30 bg-white/80 text-[#44295f] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[#f5ecff] dark:hover:bg-white/10"
                            >
                                <Link href="/finance/invoices">
                                    <ArrowLeft className="mr-1.5 size-3.5" />
                                    Back
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="border-[#7a58a4]/30 bg-white/80 text-[#44295f] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[#f5ecff] dark:hover:bg-white/10"
                            >
                                <a href={`/finance/invoices/${invoice.id}/pdf`}>
                                    <Download className="mr-1.5 size-3.5" />
                                    PDF
                                </a>
                            </Button>
                            <Button
                                asChild
                                className="border-[#5f3488] bg-[#5f3488] text-white hover:bg-[#4f2a72] dark:border-[#c6a7e8] dark:bg-[#c6a7e8] dark:text-[#241833] dark:hover:bg-[#d8bef0]"
                            >
                                <Link
                                    href={`/finance/invoices/${invoice.id}/edit`}
                                >
                                    <Pencil className="mr-1.5 size-3.5" />
                                    Edit
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <section className="relative overflow-hidden rounded-[2.4rem] border border-[#8e6bb4]/20 bg-[#eef4fb] text-[#2d2142] shadow-[0_40px_120px_rgba(66,37,102,0.2)] dark:border-[#8e6bb4]/15 dark:bg-[#191421] dark:text-[#f5ecff]">
                        <div className="absolute inset-x-0 top-0 h-36 bg-[#9d6cca] dark:bg-[#70459b]" />
                        <div className="absolute top-0 left-[18%] h-40 w-[18rem] rounded-b-[4rem] bg-[#5f3488] sm:w-[27rem] dark:bg-[#4b286c]" />
                        <div className="absolute top-48 right-10 hidden h-12 w-24 -rotate-6 border-t-2 border-[#ab82d2] bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(171,130,210,0.65)_6px,rgba(171,130,210,0.65)_9px)] lg:block dark:border-[#9c73c5]" />

                        <div className="relative px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
                            <div className="flex flex-col gap-8">
                                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                                    <div className="space-y-5">
                                        <div className="flex flex-wrap items-start gap-4 text-white">
                                            <div className="flex size-14 items-center justify-center rounded-full border border-white/35 bg-white/10 text-lg font-semibold tracking-[0.2em] sm:size-16 sm:text-xl">
                                                NA
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold tracking-[0.18em] text-white/85 uppercase">
                                                    Nour Abo Elseoud
                                                </p>
                                                <p className="mt-1 max-w-lg text-sm text-white/70">
                                                    A document-led finance view
                                                    with the invoice treated
                                                    like an actual sheet, not a
                                                    dashboard card.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {Array.from({ length: 10 }).map(
                                                (_, index) => (
                                                    <span
                                                        key={index}
                                                        className="h-3 w-3 border border-[#7d58aa] [clip-path:polygon(18%_10%,100%_50%,18%_90%)] dark:border-[#ba97df]"
                                                    />
                                                ),
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[clamp(2.8rem,8vw,5.75rem)] font-light tracking-[0.16em] text-[#4e2b72] uppercase dark:text-[#ecdfff]">
                                                Invoice
                                            </p>
                                            <p className="max-w-2xl text-sm text-[#55446c] sm:text-base dark:text-[#d7c6ea]">
                                                {invoice.project.client?.name ??
                                                    'No client'}{' '}
                                                / {invoice.project.name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-start lg:justify-end">
                                        <div className="inline-flex flex-wrap items-center gap-x-6 gap-y-2 rounded-full bg-[#9d6cca] px-5 py-3 text-sm font-medium text-white shadow-[0_12px_30px_rgba(93,52,136,0.3)] dark:bg-[#7a4fa7]">
                                            <span>
                                                Invoice: {invoice.reference}
                                            </span>
                                            <span>Date: {issuedOn}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_22rem]">
                                    <div className="space-y-6">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Panel
                                                kicker="Invoice to"
                                                title={
                                                    invoice.project.client
                                                        ?.name ?? 'No client'
                                                }
                                                body={invoice.project.name}
                                            />
                                            <Panel
                                                kicker="Project"
                                                title={invoice.project.name}
                                                body={invoice.reference}
                                            />
                                        </div>

                                        <div className="rounded-[2rem] border border-[#8e6bb4]/15 bg-white/55 p-5 shadow-[0_20px_50px_rgba(84,53,124,0.08)] backdrop-blur-sm dark:border-white/8 dark:bg-white/5">
                                            <div className="overflow-x-auto">
                                                <div className="min-w-[40rem]">
                                                    <div className="grid grid-cols-[minmax(0,1.4fr)_7rem_7rem_8rem] gap-3 rounded-full bg-[#9d6cca] px-5 py-3 text-[11px] font-semibold tracking-[0.22em] text-white uppercase">
                                                        <span>Description</span>
                                                        <span className="text-center">
                                                            Status
                                                        </span>
                                                        <span className="text-center">
                                                            Client
                                                        </span>
                                                        <span className="text-right">
                                                            Amount
                                                        </span>
                                                    </div>

                                                    <div className="mt-5 grid gap-4">
                                                        <div className="grid grid-cols-[minmax(0,1.4fr)_7rem_7rem_8rem] items-start gap-3 px-3 py-1 text-sm text-[#38294d] dark:text-[#efe5ff]">
                                                            <div>
                                                                <p className="font-medium">
                                                                    {
                                                                        invoice
                                                                            .project
                                                                            .name
                                                                    }
                                                                </p>
                                                                <p className="mt-1 text-xs text-[#6b5c81] dark:text-[#bcadd2]">
                                                                    Invoice ref{' '}
                                                                    {
                                                                        invoice.reference
                                                                    }
                                                                </p>
                                                            </div>
                                                            <p className="text-center font-medium capitalize">
                                                                {invoice.status}
                                                            </p>
                                                            <p className="text-center font-medium">
                                                                {invoice.project
                                                                    .client
                                                                    ?.name ??
                                                                    '—'}
                                                            </p>
                                                            <p className="text-right font-semibold">
                                                                {totalAmount}
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

                                        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
                                            <div className="relative overflow-hidden rounded-[2rem] border border-[#8e6bb4]/15 bg-white/50 p-5 backdrop-blur-sm dark:border-white/8 dark:bg-white/5">
                                                <div className="absolute top-4 right-4 h-12 w-20 rotate-6 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(157,108,202,0.65)_6px,rgba(157,108,202,0.65)_9px)] opacity-70" />
                                                <div className="relative">
                                                    <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.26em] text-[#6a4a90] uppercase dark:text-[#d2b8ef]">
                                                        <FileText className="size-4" />
                                                        Notes
                                                    </div>
                                                    <p className="mt-4 text-sm leading-7 whitespace-pre-line text-[#4f4065] dark:text-[#d7c6ea]">
                                                        {invoice.notes ??
                                                            'No notes.'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="rounded-[2rem] border border-[#8e6bb4]/15 bg-[#f7f2fd] p-5 dark:border-white/8 dark:bg-[#221a30]">
                                                <p className="text-xs font-semibold tracking-[0.26em] text-[#6a4a90] uppercase dark:text-[#d2b8ef]">
                                                    Document link
                                                </p>
                                                <p className="mt-4 text-sm leading-7 break-all text-[#4f4065] dark:text-[#d7c6ea]">
                                                    /finance/invoices/
                                                    {invoice.id}/pdf
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <aside className="space-y-4">
                                        <div className="rounded-[2rem] bg-[#4f2d72] p-6 text-white shadow-[0_28px_60px_rgba(79,45,114,0.35)] dark:bg-[#5f3a88]">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-xs font-semibold tracking-[0.26em] text-white/70 uppercase">
                                                    Total
                                                </p>
                                                <StatusBadge
                                                    status={invoice.status}
                                                />
                                            </div>
                                            <p className="mt-6 text-[2.3rem] leading-none font-semibold tracking-[-0.05em] sm:text-[2.9rem]">
                                                {totalAmount}
                                            </p>
                                            <p className="mt-3 text-sm text-white/70">
                                                This amount leads the page the
                                                same way it leads a finished
                                                invoice sheet.
                                            </p>
                                        </div>

                                        <div className="rounded-[2rem] border border-[#8e6bb4]/15 bg-white/60 p-5 backdrop-blur-sm dark:border-white/8 dark:bg-white/5">
                                            <div className="space-y-4">
                                                <SideRow
                                                    icon={
                                                        <Calendar className="size-4" />
                                                    }
                                                    label="Issued on"
                                                    value={issuedOn}
                                                />
                                                <SideRow
                                                    icon={
                                                        <Calendar className="size-4" />
                                                    }
                                                    label="Due on"
                                                    value={dueOn}
                                                />
                                                <SideRow
                                                    icon={
                                                        invoice.paid_at ? (
                                                            <CheckCircle2 className="size-4" />
                                                        ) : (
                                                            <Calendar className="size-4" />
                                                        )
                                                    }
                                                    label="Paid on"
                                                    value={paidOn}
                                                />
                                                <SideRow
                                                    icon={
                                                        <Users className="size-4" />
                                                    }
                                                    label="Client"
                                                    value={
                                                        invoice.project.client
                                                            ?.name ?? '—'
                                                    }
                                                />
                                                <SideRow
                                                    icon={
                                                        <FolderKanban className="size-4" />
                                                    }
                                                    label="Currency"
                                                    value={
                                                        invoice.currency ?? '—'
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-[2rem] border border-[#8e6bb4]/15 bg-[#efe4fb] p-5 dark:border-white/8 dark:bg-[#241a31]">
                                            <p className="text-xs font-semibold tracking-[0.26em] text-[#6a4a90] uppercase dark:text-[#d2b8ef]">
                                                Signed by
                                            </p>
                                            <p className="mt-4 text-lg font-semibold text-[#4f2d72] dark:text-[#f5ecff]">
                                                Nour Abo Elseoud
                                            </p>
                                            <p className="mt-2 text-sm text-[#66557d] dark:text-[#cdbade]">
                                                Prepared for{' '}
                                                {invoice.project.client?.name ??
                                                    'the client'}{' '}
                                                and linked to the{' '}
                                                {invoice.project.name} project.
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

function Panel({
    kicker,
    title,
    body,
}: {
    kicker: string;
    title: string;
    body: string;
}) {
    return (
        <div className="rounded-[2rem] border border-[#8e6bb4]/15 bg-white/60 p-5 backdrop-blur-sm dark:border-white/8 dark:bg-white/5">
            <p className="text-xs font-semibold tracking-[0.26em] text-[#6a4a90] uppercase dark:text-[#d2b8ef]">
                {kicker}
            </p>
            <p className="mt-4 text-xl font-semibold text-[#352349] dark:text-[#f5ecff]">
                {title}
            </p>
            <p className="mt-1 text-sm text-[#66557d] dark:text-[#cdbade]">
                {body}
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
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-[#6a4a90] uppercase dark:text-[#d2b8ef]">
                {icon}
                {label}
            </div>
            <p className="mt-2 text-sm font-medium text-[#352349] dark:text-[#f5ecff]">
                {value}
            </p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        paid: 'border-white/20 bg-emerald-300/15 text-white',
        pending: 'border-white/20 bg-amber-300/15 text-white',
        overdue: 'border-white/20 bg-red-300/15 text-white',
        draft: 'border-white/20 bg-white/10 text-white',
    };

    return (
        <Badge
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.22em] uppercase ${colors[status] ?? colors.draft}`}
        >
            {status}
        </Badge>
    );
}

FinanceInvoiceShow.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;
