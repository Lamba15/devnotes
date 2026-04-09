import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';

export default function FinanceTransactionShow({
    transaction,
}: {
    transaction: {
        id: number;
        description: string;
        amount: string;
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
                                    <Button variant="outline">Back</Button>
                                </Link>
                                <Link href={`/finance/transactions/${transaction.id}/edit`}>
                                    <Button>Edit transaction</Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <DetailField label="Amount" value={transaction.amount} />
                            <DetailField
                                label="Occurred at"
                                value={transaction.occurred_at ?? 'Not recorded'}
                            />
                            <DetailField
                                label="Project"
                                value={transaction.project.name}
                            />
                            <DetailField
                                label="Client"
                                value={transaction.project.client?.name ?? '—'}
                            />
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
