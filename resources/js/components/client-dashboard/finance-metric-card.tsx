import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { FinanceAmount } from '@/components/finance/finance-amount';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type MoneySummary = {
    amount: number;
    currency: string | null;
    mixed_currencies: boolean;
};

export function FinanceMetricCard({
    title,
    icon: Icon,
    summary,
    href,
}: {
    title: string;
    icon: LucideIcon;
    summary: MoneySummary;
    href?: string;
}) {
    const card = (
        <Card
            className={cn(
                'shadow-none',
                href && 'transition-all hover:bg-muted/30 hover:shadow-sm',
            )}
        >
            <CardContent className="space-y-3 pt-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="size-4" />
                    <span className="text-sm font-medium">{title}</span>
                </div>
                {summary.mixed_currencies ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                        Mixed currencies
                    </p>
                ) : (
                    <FinanceAmount
                        amount={summary.amount}
                        currency={summary.currency}
                        className="text-xl"
                    />
                )}
            </CardContent>
        </Card>
    );

    if (href) {
        return <Link href={href}>{card}</Link>;
    }

    return card;
}
