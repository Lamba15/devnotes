import { Head, Link, router } from '@inertiajs/react';
import {
    Banknote,
    CalendarDays,
    Camera,
    CreditCard,
    FileText,
    GitBranch,
    LayoutGrid,
    LinkIcon,
    List,
    Pencil,
    Percent,
    Plus,
    Receipt,
    Search,
    Server,
    Ticket,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ActionDropdownItem } from '@/components/crud/action-dropdown';
import type { DataTableColumn } from '@/components/crud/data-table';
import { DataTable } from '@/components/crud/data-table';
import { ClientFinanceAnalysis } from '@/components/finance/client-finance-analysis';
import { FinanceAmount } from '@/components/finance/finance-amount';
import { FinanceStatusBadge } from '@/components/finance/finance-status-badge';
import { TransactionCalendar } from '@/components/finance/transaction-calendar';
import SecretsCard from '@/components/secrets/secrets-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';
import { formatDateOnly } from '@/lib/datetime';
import { formatCurrencyAmount } from '@/lib/format-currency';

type TransactionRow = {
    id: number;
    description: string;
    amount: string;
    currency: string | null;
    occurred_date: string | null;
    category: string | null;
};

type InvoiceRow = {
    id: number;
    reference: string;
    status: string;
    amount: string;
    currency: string | null;
    issued_at: string | null;
    due_at: string | null;
};

type SortState = { sortBy: string; sortDirection: 'asc' | 'desc' };

function sortRows<T extends Record<string, unknown>>(
    rows: T[],
    sort: SortState,
): T[] {
    return [...rows].sort((a, b) => {
        const aVal = a[sort.sortBy];
        const bVal = b[sort.sortBy];
        const dir = sort.sortDirection === 'asc' ? 1 : -1;

        if (aVal == null && bVal == null) {
return 0;
}

        if (aVal == null) {
return dir;
}

        if (bVal == null) {
return -dir;
}

        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return (aVal - bVal) * dir;
        }

        return String(aVal).localeCompare(String(bVal)) * dir;
    });
}

export default function ProjectShow({
    client,
    project,
    secrets,
    summary,
    finance,
    transactions,
    invoices,
    client_relationship_volume,
    viewer_perspective,
    can_manage_project,
    can_manage_secrets,
    can_view_finance,
}: {
    client: { id: number; name: string };
    project: {
        id: number;
        name: string;
        description: string | null;
        markdown_description: string | null;
        hosting: string | null;
        status?: { id: number; name: string; slug: string } | null;
        budget?: string | null;
        currency?: string | null;
        image_path?: string | null;
        skills: Array<{ id: number; name: string }>;
        links: Array<{ id: number; label: string | null; url: string }>;
        git_repos: Array<{
            id: number;
            name: string;
            repo_url: string;
            wakatime_badge_url: string | null;
        }>;
    };
    secrets: Array<{
        id: number;
        label: string;
        description: string | null;
        updated_at: string | null;
    }>;
    summary: {
        issues_count: number;
        boards_count: number;
        transactions_count: number | null;
        invoices_count: number | null;
    };
     
    finance: any;
    transactions: TransactionRow[];
    invoices: InvoiceRow[];
    client_relationship_volume: {
        total: number;
        project: number;
        percentage: number | null;
    } | null;
    viewer_perspective: 'platform_owner' | 'client_user' | null;
    can_manage_project: boolean;
    can_manage_secrets: boolean;
    can_view_finance: boolean;
}) {
    // ── Drill-down modal ─────────────────────────────────────────
    const [drillMonth, setDrillMonth] = useState<{
        period: string;
        label: string;
    } | null>(null);

    const drillData = useMemo(() => {
        if (!drillMonth) {
            return { txs: [] as TransactionRow[], invs: [] as InvoiceRow[] };
        }

        return {
            txs: transactions.filter(
                (tx) =>
                    tx.occurred_date?.startsWith(drillMonth.period) ?? false,
            ),
            invs: invoices.filter(
                (inv) =>
                    inv.issued_at?.startsWith(drillMonth.period) ?? false,
            ),
        };
    }, [drillMonth, transactions, invoices]);

    // ── Transactions state ───────────────────────────────────────
    const [txSearch, setTxSearch] = useState('');
    const [txSort, setTxSort] = useState<SortState>({
        sortBy: 'occurred_date',
        sortDirection: 'desc',
    });
    const [selectedTxIds, setSelectedTxIds] = useState<
        Array<string | number>
    >([]);
    const [txView, setTxView] = useState<'table' | 'calendar'>('table');
    const [deleteTxIds, setDeleteTxIds] = useState<Array<
        string | number
    > | null>(null);

    const filteredTransactions = useMemo(() => {
        const q = txSearch.toLowerCase().trim();
        const filtered = q
            ? transactions.filter(
                  (t) =>
                      t.description.toLowerCase().includes(q) ||
                      (t.category?.toLowerCase().includes(q) ?? false) ||
                      (t.currency?.toLowerCase().includes(q) ?? false),
              )
            : transactions;

        return sortRows(filtered, txSort);
    }, [transactions, txSearch, txSort]);

    const handleTxSortChange = (sortKey: string) => {
        setTxSort((prev) =>
            prev.sortBy === sortKey
                ? {
                      sortBy: sortKey,
                      sortDirection:
                          prev.sortDirection === 'asc' ? 'desc' : 'asc',
                  }
                : { sortBy: sortKey, sortDirection: 'asc' },
        );
    };

    const confirmDeleteTx = async () => {
        if (!deleteTxIds) {
return;
}

        for (const id of deleteTxIds) {
            await router.delete(`/finance/transactions/${id}`, {
                preserveScroll: true,
                preserveState: true,
            });
        }

        setSelectedTxIds((c) => c.filter((id) => !deleteTxIds.includes(id)));
        setDeleteTxIds(null);
    };

    const txBulkActions: ActionDropdownItem[] = [
        {
            label: 'Open PDF',
            disabled: selectedTxIds.length !== 1,
            disabledReason:
                selectedTxIds.length > 1
                    ? 'Select only 1 transaction.'
                    : undefined,
            onClick: () => {
                if (selectedTxIds.length === 1) {
                    window.location.assign(
                        `/finance/transactions/${selectedTxIds[0]}/pdf`,
                    );
                }
            },
        },
        {
            label: 'Edit',
            disabled: selectedTxIds.length !== 1,
            disabledReason:
                selectedTxIds.length > 1
                    ? 'Select only 1 transaction.'
                    : undefined,
            onClick: () => {
                if (selectedTxIds.length === 1) {
                    router.visit(
                        `/finance/transactions/${selectedTxIds[0]}/edit`,
                    );
                }
            },
        },
        {
            label: 'Delete',
            destructive: true,
            onClick: () => {
                if (selectedTxIds.length > 0) {
                    setDeleteTxIds(selectedTxIds);
                }
            },
        },
    ];

    // ── Invoices state ───────────────────────────────────────────
    const [invSearch, setInvSearch] = useState('');
    const [invSort, setInvSort] = useState<SortState>({
        sortBy: 'issued_at',
        sortDirection: 'desc',
    });
    const [selectedInvIds, setSelectedInvIds] = useState<
        Array<string | number>
    >([]);
    const [deleteInvIds, setDeleteInvIds] = useState<Array<
        string | number
    > | null>(null);

    const filteredInvoices = useMemo(() => {
        const q = invSearch.toLowerCase().trim();
        const filtered = q
            ? invoices.filter(
                  (i) =>
                      i.reference.toLowerCase().includes(q) ||
                      i.status.toLowerCase().includes(q) ||
                      (i.currency?.toLowerCase().includes(q) ?? false),
              )
            : invoices;

        return sortRows(filtered, invSort);
    }, [invoices, invSearch, invSort]);

    const handleInvSortChange = (sortKey: string) => {
        setInvSort((prev) =>
            prev.sortBy === sortKey
                ? {
                      sortBy: sortKey,
                      sortDirection:
                          prev.sortDirection === 'asc' ? 'desc' : 'asc',
                  }
                : { sortBy: sortKey, sortDirection: 'asc' },
        );
    };

    const confirmDeleteInv = async () => {
        if (!deleteInvIds) {
return;
}

        for (const id of deleteInvIds) {
            await router.delete(`/finance/invoices/${id}`, {
                preserveScroll: true,
                preserveState: true,
            });
        }

        setSelectedInvIds((c) =>
            c.filter((id) => !deleteInvIds.includes(id)),
        );
        setDeleteInvIds(null);
    };

    const invBulkActions: ActionDropdownItem[] = [
        {
            label: 'Open PDF',
            disabled: selectedInvIds.length !== 1,
            disabledReason:
                selectedInvIds.length > 1
                    ? 'Select only 1 invoice.'
                    : undefined,
            onClick: () => {
                if (selectedInvIds.length === 1) {
                    window.location.assign(
                        `/finance/invoices/${selectedInvIds[0]}/pdf`,
                    );
                }
            },
        },
        {
            label: 'Edit',
            disabled: selectedInvIds.length !== 1,
            disabledReason:
                selectedInvIds.length > 1
                    ? 'Select only 1 invoice.'
                    : undefined,
            onClick: () => {
                if (selectedInvIds.length === 1) {
                    router.visit(
                        `/finance/invoices/${selectedInvIds[0]}/edit`,
                    );
                }
            },
        },
        {
            label: 'Delete',
            destructive: true,
            onClick: () => {
                if (selectedInvIds.length > 0) {
                    setDeleteInvIds(selectedInvIds);
                }
            },
        },
    ];

    // ── Columns ──────────────────────────────────────────────────
    const transactionColumns: DataTableColumn<TransactionRow>[] = [
        {
            key: 'description',
            header: 'Description',
            sortable: true,
            sortKey: 'description',
            render: (row) => (
                <Link
                    href={`/finance/transactions/${row.id}`}
                    className="cursor-pointer font-medium underline-offset-4 hover:underline"
                >
                    {row.description}
                </Link>
            ),
        },
        {
            key: 'amount',
            header: 'Amount',
            sortable: true,
            sortKey: 'amount',
            render: (row) => (
                <FinanceAmount
                    amount={row.amount}
                    currency={row.currency}
                    variant="transaction"
                />
            ),
        },
        {
            key: 'occurred_date',
            header: 'Occurred',
            sortable: true,
            sortKey: 'occurred_date',
            render: (row) => formatDateOnly(row.occurred_date),
        },
        {
            key: 'category',
            header: 'Category',
            sortable: true,
            sortKey: 'category',
            render: (row) => row.category ?? '—',
        },
    ];

    const invoiceColumns: DataTableColumn<InvoiceRow>[] = [
        {
            key: 'reference',
            header: 'Reference',
            sortable: true,
            sortKey: 'reference',
            render: (row) => (
                <Link
                    href={`/finance/invoices/${row.id}`}
                    className="cursor-pointer font-medium underline-offset-4 hover:underline"
                >
                    {row.reference}
                </Link>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            sortKey: 'status',
            render: (row) => <FinanceStatusBadge status={row.status} />,
        },
        {
            key: 'issued_at',
            header: 'Issued',
            sortable: true,
            sortKey: 'issued_at',
            render: (row) => formatDateOnly(row.issued_at),
        },
        {
            key: 'due_at',
            header: 'Due',
            sortable: true,
            sortKey: 'due_at',
            render: (row) => formatDateOnly(row.due_at),
        },
        {
            key: 'amount',
            header: 'Amount',
            sortable: true,
            sortKey: 'amount',
            render: (row) => (
                <FinanceAmount amount={row.amount} currency={row.currency} />
            ),
        },
    ];

    // ── Stats ────────────────────────────────────────────────────
    const stats = [
        {
            label: 'Issues',
            value: summary.issues_count,
            icon: Ticket,
            color: 'text-amber-600 dark:text-amber-400',
            href: `/clients/${client.id}/projects/${project.id}/issues`,
            linkLabel: 'Open issues',
        },
        {
            label: 'Boards',
            value: summary.boards_count,
            icon: LayoutGrid,
            color: 'text-emerald-600 dark:text-emerald-400',
            href: `/clients/${client.id}/boards`,
            linkLabel: 'Open boards',
        },
        ...(can_view_finance
            ? [
                  {
                      label: 'Transactions',
                      value: summary.transactions_count ?? 0,
                      icon: Receipt,
                      color: 'text-blue-600 dark:text-blue-400',
                      href: `/clients/${client.id}/finance`,
                      linkLabel: 'Open finance',
                  },
                  {
                      label: 'Invoices',
                      value: summary.invoices_count ?? 0,
                      icon: CreditCard,
                      color: 'text-violet-600 dark:text-violet-400',
                      href: `/clients/${client.id}/finance`,
                      linkLabel: 'Open finance',
                  },
              ]
            : []),
    ];

    // ── Render ────────────────────────────────────────────────────
    return (
        <>
            <Head title={project.name} />

            <div className="space-y-6">
                {/* ── Project header card ─────────────────────────────── */}
                <Card className="shadow-none">
                    <CardHeader className="flex-row items-start justify-between space-y-0">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <Avatar className="size-12">
                                    {project.image_path ? (
                                        <AvatarImage
                                            src={`/storage/${project.image_path}`}
                                            alt={project.name}
                                        />
                                    ) : null}
                                    <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                                        {project.name
                                            .split(' ')
                                            .map((part) => part[0])
                                            .slice(0, 2)
                                            .join('')
                                            .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    <CardTitle>{project.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        {client.name} / Project workspace
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {can_manage_project ? (
                                <Button asChild variant="outline">
                                    <Link href={`/clients/${client.id}/projects/${project.id}/edit`}>
                                        <Camera className="mr-1.5 size-3.5" />
                                        {project.image_path ? 'Update logo' : 'Add logo'}
                                    </Link>
                                </Button>
                            ) : null}
                            {can_manage_project ? (
                                <Button asChild>
                                    <Link
                                        href={`/clients/${client.id}/projects/${project.id}/issues/create?return_to=${encodeURIComponent(`/clients/${client.id}/projects/${project.id}`)}`}
                                    >
                                        <Plus className="mr-1.5 size-4" />
                                        Create issue
                                    </Link>
                                </Button>
                            ) : null}
                            {can_manage_project ? (
                                <Button asChild variant="outline">
                                    <Link href={`/clients/${client.id}/projects/${project.id}/edit`}>
                                        <Pencil className="mr-1.5 size-3.5" />
                                        Edit project
                                    </Link>
                                </Button>
                            ) : null}
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Status</p>
                            <div className="mt-1">
                                <Badge variant="outline" className="capitalize">
                                    {project.status?.name ?? 'No status'}
                                </Badge>
                            </div>
                        </div>
                        {project.budget ? (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Budget</p>
                                <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-foreground">
                                    <Banknote className="size-3.5 text-emerald-500" />
                                    {formatCurrencyAmount(project.budget, project.currency)}
                                </p>
                            </div>
                        ) : null}
                        {project.hosting ? (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Hosting</p>
                                <p className="mt-1 flex items-center gap-1 text-sm text-foreground">
                                    <Server className="size-3.5 text-muted-foreground" />
                                    {project.hosting}
                                </p>
                            </div>
                        ) : null}
                        <ProjectField label="Description" value={project.description ?? 'No description yet.'} fullWidth />
                        {project.markdown_description ? (
                            <ProjectField label="Long description" value={project.markdown_description} fullWidth />
                        ) : null}
                        {project.skills.length > 0 ? (
                            <div className="sm:col-span-2">
                                <p className="text-sm font-medium text-muted-foreground">Skills</p>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                    {project.skills.map((skill) => (
                                        <Badge key={skill.id} variant="secondary">{skill.name}</Badge>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>

                {/* ── Stats row ───────────────────────────────────────── */}
                <div className={`grid gap-4 ${stats.length <= 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
                    {stats.map((stat) => {
                        const Icon = stat.icon;

                        return (
                            <Card key={stat.label} className="shadow-none">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted ${stat.color}`}>
                                            <Icon className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                                            <p className="text-2xl font-semibold">{stat.value}</p>
                                        </div>
                                    </div>
                                    <Link href={stat.href} className="mt-4 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline">
                                        {stat.linkLabel}
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* ── Finance section ─────────────────────────────────── */}
                {finance && viewer_perspective ? (
                    <div className="space-y-6">
                        {client_relationship_volume?.percentage !== null && client_relationship_volume ? (
                            <Card className="border-violet-200/60 bg-gradient-to-br from-violet-50/50 via-background to-background shadow-none dark:border-violet-900/40 dark:from-violet-950/10">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                                        <Percent className="size-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Share of client relationship volume</p>
                                        <p className="text-2xl font-bold tracking-tight">{client_relationship_volume.percentage}%</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatCurrencyAmount(client_relationship_volume.project, finance.overall?.relationship_volume?.currency)}{' '}
                                            of {formatCurrencyAmount(client_relationship_volume.total, finance.overall?.relationship_volume?.currency)}{' '}
                                            total invoiced across all projects
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null}

                        <ClientFinanceAnalysis
                            analysis={finance}
                            viewerPerspective={viewer_perspective}
                            onMonthClick={(period, label) => setDrillMonth({ period, label })}
                        />

                        {/* ── Transactions ────────────────────────────── */}
                        <section className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <h2 className="flex items-center gap-2 text-lg font-semibold">
                                    <Receipt className="size-5 text-blue-500" />
                                    Transactions
                                    <span className="text-sm font-normal text-muted-foreground">
                                        ({filteredTransactions.length})
                                    </span>
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Search..."
                                            value={txSearch}
                                            onChange={(e) => setTxSearch(e.target.value)}
                                            className="h-8 w-48 pl-9 text-sm"
                                        />
                                    </div>
                                    <div className="flex rounded-lg border border-border">
                                        <Button
                                            variant={txView === 'table' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            onClick={() => setTxView('table')}
                                            className="h-8 rounded-r-none"
                                        >
                                            <List className="mr-1.5 size-3.5" />
                                            Table
                                        </Button>
                                        <Button
                                            variant={txView === 'calendar' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            onClick={() => setTxView('calendar')}
                                            className="h-8 rounded-l-none"
                                        >
                                            <CalendarDays className="mr-1.5 size-3.5" />
                                            Calendar
                                        </Button>
                                    </div>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/finance/transactions">All transactions</Link>
                                    </Button>
                                </div>
                            </div>
                            {txView === 'table' ? (
                                <DataTable
                                    columns={transactionColumns}
                                    rows={filteredTransactions}
                                    emptyText="No transactions for this project yet."
                                    getRowId={(row) => row.id}
                                    selectedRowIds={selectedTxIds}
                                    onSelectedRowIdsChange={setSelectedTxIds}
                                    bulkActions={txBulkActions}
                                    currentSort={txSort}
                                    onSortChange={handleTxSortChange}
                                />
                            ) : (
                                <TransactionCalendar transactions={filteredTransactions} />
                            )}
                        </section>

                        {/* ── Invoices ────────────────────────────────── */}
                        <section className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <h2 className="flex items-center gap-2 text-lg font-semibold">
                                    <FileText className="size-5 text-violet-500" />
                                    Invoices
                                    <span className="text-sm font-normal text-muted-foreground">
                                        ({filteredInvoices.length})
                                    </span>
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Search..."
                                            value={invSearch}
                                            onChange={(e) => setInvSearch(e.target.value)}
                                            className="h-8 w-48 pl-9 text-sm"
                                        />
                                    </div>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/finance/invoices">All invoices</Link>
                                    </Button>
                                </div>
                            </div>
                            <DataTable
                                columns={invoiceColumns}
                                rows={filteredInvoices}
                                emptyText="No invoices for this project yet."
                                getRowId={(row) => row.id}
                                selectedRowIds={selectedInvIds}
                                onSelectedRowIdsChange={setSelectedInvIds}
                                bulkActions={invBulkActions}
                                currentSort={invSort}
                                onSortChange={handleInvSortChange}
                            />
                        </section>
                    </div>
                ) : null}

                {/* ── Links & repos ───────────────────────────────────── */}
                {project.links.length > 0 || project.git_repos.length > 0 ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {project.links.length > 0 ? (
                            <Card className="shadow-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <LinkIcon className="size-4" />
                                        Links
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {project.links.map((link) => (
                                        <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-primary underline-offset-4 hover:underline">
                                            {link.label || link.url}
                                        </a>
                                    ))}
                                </CardContent>
                            </Card>
                        ) : null}
                        {project.git_repos.length > 0 ? (
                            <Card className="shadow-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <GitBranch className="size-4" />
                                        Repositories
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {project.git_repos.map((repo) => (
                                        <div key={repo.id} className="space-y-1">
                                            <a href={repo.repo_url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-primary underline-offset-4 hover:underline">
                                                {repo.name}
                                            </a>
                                            {repo.wakatime_badge_url ? (
                                                <img src={repo.wakatime_badge_url} alt={`${repo.name} wakatime`} className="h-4" />
                                            ) : null}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        ) : null}
                    </div>
                ) : null}

                {/* ── Secrets ─────────────────────────────────────────── */}
                {can_manage_secrets ? (
                    <SecretsCard
                        title="Secrets"
                        description="Platform-only credentials and private values for this project."
                        secrets={secrets}
                        createHref={`/clients/${client.id}/projects/${project.id}/secrets/create`}
                        editHref={(secretId) => `/clients/${client.id}/projects/${project.id}/secrets/${secretId}/edit`}
                        deleteHref={(secretId) => `/clients/${client.id}/projects/${project.id}/secrets/${secretId}`}
                        revealHref={(secretId) => `/clients/${client.id}/projects/${project.id}/secrets/${secretId}/reveal`}
                    />
                ) : null}
            </div>

            {/* ── Drill-down modal ──────────────────────────────────── */}
            <Dialog open={drillMonth !== null} onOpenChange={(open) => !open && setDrillMonth(null)}>
                <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{drillMonth?.label}</DialogTitle>
                    </DialogHeader>
                    {drillData.txs.length > 0 ? (
                        <div>
                            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                <Receipt className="size-3.5 text-blue-500" />
                                Transactions ({drillData.txs.length})
                            </h3>
                            <div className="space-y-1.5">
                                {drillData.txs.map((tx) => (
                                    <Link key={tx.id} href={`/finance/transactions/${tx.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2 transition-colors hover:border-border hover:bg-muted/30">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{tx.description}</p>
                                            <p className="text-xs text-muted-foreground">{formatDateOnly(tx.occurred_date)}{tx.category ? ` · ${tx.category}` : ''}</p>
                                        </div>
                                        <FinanceAmount amount={tx.amount} currency={tx.currency} variant="transaction" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    {drillData.invs.length > 0 ? (
                        <div>
                            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                <FileText className="size-3.5 text-violet-500" />
                                Invoices ({drillData.invs.length})
                            </h3>
                            <div className="space-y-1.5">
                                {drillData.invs.map((inv) => (
                                    <Link key={inv.id} href={`/finance/invoices/${inv.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2 transition-colors hover:border-border hover:bg-muted/30">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{inv.reference}</p>
                                            <p className="flex items-center gap-2 text-xs text-muted-foreground">{formatDateOnly(inv.issued_at)}<FinanceStatusBadge status={inv.status} /></p>
                                        </div>
                                        <FinanceAmount amount={inv.amount} currency={inv.currency} />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    {drillData.txs.length === 0 && drillData.invs.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">No transactions or invoices in {drillMonth?.label}.</p>
                    ) : null}
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete transaction confirm ────────────────────────── */}
            <Dialog open={deleteTxIds !== null} onOpenChange={(open) => !open && setDeleteTxIds(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete transaction{deleteTxIds?.length === 1 ? '' : 's'}?</DialogTitle>
                        <DialogDescription>This will permanently remove {deleteTxIds?.length ?? 0} transaction{deleteTxIds?.length === 1 ? '' : 's'}.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button variant="destructive" onClick={() => void confirmDeleteTx()}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete invoice confirm ────────────────────────────── */}
            <Dialog open={deleteInvIds !== null} onOpenChange={(open) => !open && setDeleteInvIds(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete invoice{deleteInvIds?.length === 1 ? '' : 's'}?</DialogTitle>
                        <DialogDescription>This will permanently remove {deleteInvIds?.length ?? 0} invoice{deleteInvIds?.length === 1 ? '' : 's'}.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button variant="destructive" onClick={() => void confirmDeleteInv()}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </>
    );
}




function ProjectField({ label, value, fullWidth = false }: { label: string; value: string; fullWidth?: boolean }) {
    return (
        <div className={fullWidth ? 'sm:col-span-2' : ''}>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm whitespace-pre-line text-foreground">{value}</p>
        </div>
    );
}

ProjectShow.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
