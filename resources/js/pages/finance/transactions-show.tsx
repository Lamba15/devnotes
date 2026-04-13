import { Head, Link } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowLeft,
    ArrowUpRight,
    Calendar,
    FolderKanban,
    Pencil,
    Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { formatCurrencyAmount } from '@/lib/format-currency';

export default function FinanceTransactionShow({
    transaction,
}: {
    transaction: {
        id: number;
        description: string;
        amount: string;
        currency: string | null;
        occurred_at: string | null;
        project: {
            id: number;
            name: string;
            client?: { id: number; name: string } | null;
        };
    };
}) {
    return (
        <>
            <Head title={transaction.description} />
            <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-4xl space-y-6">
                    <Card className="shadow-none">
                        <CardHeader className="flex-row items-start justify-between space-y-0">
                            <div className="space-y-1">
                                <CardTitle>{transaction.description}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {transaction.project.client?.name} / {transaction.project.name}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href="/finance/transactions">
                                    <Button variant="outline">
                                        <ArrowLeft className="mr-1.5 size-3.5" />
                                        Back
                                    </Button>
                                </Link>
                                <Link href={`/finance/transactions/${transaction.id}/edit`}>
                                    <Button>
                                        <Pencil className="mr-1.5 size-3.5" />
                                        Edit
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                                {(() => {
                                    const num = Number(transaction.amount);
                                    const isPositive = num >= 0;

                                    return (
                                        <p className={`mt-1 flex items-center gap-1 text-lg font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {isPositive ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                                            {formatCurrencyAmount(num, transaction.currency, { absolute: true })}
                                        </p>
                                    );
                                })()}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Occurred at</p>
                                <p className="mt-1 flex items-center gap-1 text-sm text-foreground">
                                    <Calendar className="size-3.5 text-muted-foreground" />
                                    {transaction.occurred_at ?? 'Not recorded'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Project</p>
                                <p className="mt-1 flex items-center gap-1 text-sm text-foreground">
                                    <FolderKanban className="size-3.5 text-violet-500" />
                                    {transaction.project.name}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Client</p>
                                <p className="mt-1 flex items-center gap-1 text-sm text-foreground">
                                    <Users className="size-3.5 text-blue-500" />
                                    {transaction.project.client?.name ?? '—'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

function DetailField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm text-foreground">{value}</p>
        </div>
    );
}

FinanceTransactionShow.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
