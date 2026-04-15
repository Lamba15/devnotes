import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatCurrencyAmount } from '@/lib/format-currency';
import { cn } from '@/lib/utils';

type FinanceAmountProps = {
    amount: number | string;
    currency?: string | null;
    variant?: 'neutral' | 'transaction';
    className?: string;
};

export function FinanceAmount({
    amount,
    currency,
    variant = 'neutral',
    className,
}: FinanceAmountProps) {
    const numericAmount = Number(amount);

    if (variant === 'transaction') {
        const isPositive = numericAmount >= 0;

        return (
            <span
                className={cn(
                    'inline-flex items-center gap-1 font-medium',
                    isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400',
                    className,
                )}
            >
                {isPositive ? (
                    <ArrowUpRight className="size-3" />
                ) : (
                    <ArrowDownRight className="size-3" />
                )}
                {formatCurrencyAmount(numericAmount, currency, {
                    absolute: true,
                })}
            </span>
        );
    }

    return (
        <span className={cn('font-medium text-foreground', className)}>
            {formatCurrencyAmount(numericAmount, currency)}
        </span>
    );
}
