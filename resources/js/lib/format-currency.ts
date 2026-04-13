export function formatCurrencyAmount(
    amount: number | string,
    currency: string | null | undefined = 'USD',
    options?: {
        absolute?: boolean;
    },
): string {
    const value = Number(amount);
    const normalizedCurrency = currency ?? 'USD';
    const displayValue = options?.absolute ? Math.abs(value) : value;

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: normalizedCurrency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(displayValue);
}
