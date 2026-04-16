<?php

namespace App\Http\Concerns;

use App\Models\Invoice;
use App\Models\Transaction;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

trait BuildsFinanceAnalysis
{
    protected function buildFinanceAnalysis(
        int $projectCount,
        Collection $transactions,
        Collection $invoices,
    ): array {
        $runningAccountRows = collect();

        foreach ($transactions as $transaction) {
            $runningAccountRows->push((object) [
                'amount' => (float) $transaction->amount,
                'currency' => $transaction->currency,
            ]);
        }

        foreach ($invoices as $invoice) {
            $runningAccountRows->push((object) [
                'amount' => -(float) $invoice->amount,
                'currency' => $invoice->currency,
            ]);
        }

        $currencyKeys = $transactions
            ->pluck('currency')
            ->merge($invoices->pluck('currency'))
            ->map(fn ($currency) => $this->normalizeMoneyCurrencyKey($currency))
            ->unique()
            ->sort()
            ->values();

        return [
            'overall' => [
                'project_count' => $projectCount,
                'transaction_count' => $transactions->count(),
                'invoice_count' => $invoices->count(),
                'currencies' => $currencyKeys
                    ->map(fn (string $key) => $this->moneyCurrencyLabel($key))
                    ->all(),
                'running_account' => $this->summarizeMoneyCollection(
                    $runningAccountRows,
                    'amount',
                    'currency',
                ),
                'relationship_volume' => $this->summarizeMoneyCollection(
                    $invoices,
                    'amount',
                    'currency',
                ),
                'transaction_volume' => $this->summarizeMoneyCollection(
                    $transactions,
                    'amount',
                    'currency',
                ),
            ],
            'by_currency' => $currencyKeys
                ->map(function (string $currencyKey) use ($transactions, $invoices): array {
                    $currencyTransactions = $transactions
                        ->filter(fn (Transaction $transaction) => $this->normalizeMoneyCurrencyKey($transaction->currency) === $currencyKey)
                        ->values();
                    $currencyInvoices = $invoices
                        ->filter(fn (Invoice $invoice) => $this->normalizeMoneyCurrencyKey($invoice->currency) === $currencyKey)
                        ->values();

                    $transactionTotal = round($currencyTransactions->sum(fn (Transaction $transaction) => (float) $transaction->amount), 2);
                    $invoiceTotal = round($currencyInvoices->sum(fn (Invoice $invoice) => (float) $invoice->amount), 2);
                    $runningAccount = round($transactionTotal - $invoiceTotal, 2);
                    $openStatuses = ['draft', 'pending', 'overdue'];

                    return [
                        'currency' => $currencyKey === 'UNSPECIFIED' ? null : $currencyKey,
                        'label' => $this->moneyCurrencyLabel($currencyKey),
                        'running_account' => $runningAccount,
                        'client_owes_you' => max(round($invoiceTotal - $transactionTotal, 2), 0),
                        'you_owe_client' => max($runningAccount, 0),
                        'transaction_total' => $transactionTotal,
                        'invoice_total' => $invoiceTotal,
                        'received_total' => round($currencyTransactions
                            ->filter(fn (Transaction $transaction) => (float) $transaction->amount > 0)
                            ->sum(fn (Transaction $transaction) => (float) $transaction->amount), 2),
                        'refund_total' => round(abs($currencyTransactions
                            ->filter(fn (Transaction $transaction) => (float) $transaction->amount < 0)
                            ->sum(fn (Transaction $transaction) => (float) $transaction->amount)), 2),
                        'open_invoice_total' => round($currencyInvoices
                            ->filter(fn (Invoice $invoice) => in_array($invoice->status, $openStatuses, true))
                            ->sum(fn (Invoice $invoice) => (float) $invoice->amount), 2),
                        'invoice_statuses' => collect(['draft', 'pending', 'paid', 'overdue'])
                            ->mapWithKeys(fn (string $status) => [
                                $status => [
                                    'count' => $currencyInvoices->where('status', $status)->count(),
                                    'amount' => round($currencyInvoices
                                        ->where('status', $status)
                                        ->sum(fn (Invoice $invoice) => (float) $invoice->amount), 2),
                                ],
                            ])
                            ->all(),
                        'timeline' => $this->buildFinanceTimeline(
                            $currencyTransactions,
                            $currencyInvoices,
                        ),
                    ];
                })
                ->all(),
        ];
    }

    protected function buildFinanceTimeline(
        Collection $transactions,
        Collection $invoices,
    ): array {
        $events = collect();

        foreach ($transactions as $transaction) {
            $date = $transaction->occurred_date
                ? CarbonImmutable::parse($transaction->occurred_date)
                : CarbonImmutable::parse($transaction->created_at);

            $events->push([
                'type' => 'transaction',
                'date' => $date,
                'amount' => (float) $transaction->amount,
            ]);
        }

        foreach ($invoices as $invoice) {
            $date = $invoice->issued_at
                ? CarbonImmutable::parse($invoice->issued_at)
                : CarbonImmutable::parse($invoice->created_at);

            $events->push([
                'type' => 'invoice',
                'date' => $date,
                'amount' => (float) $invoice->amount,
            ]);
        }

        if ($events->isEmpty()) {
            return [];
        }

        $firstMonth = $events->min('date')->startOfMonth();
        $lastEvent = $events->max('date')->startOfMonth();
        $now = CarbonImmutable::now()->startOfMonth();
        $lastMonth = $lastEvent->greaterThan($now) ? $lastEvent : $now;
        $totalMonths = $firstMonth->diffInMonths($lastMonth) + 1;

        if ($totalMonths <= 18) {
            $granularity = 'month';
        } elseif ($totalMonths <= 48) {
            $granularity = 'quarter';
        } else {
            $granularity = 'year';
        }

        $currentMonth = $firstMonth;
        $cumulativeInvoiced = 0.0;
        $cumulativePaid = 0.0;

        $monthlyBuckets = [];

        while ($currentMonth->lessThanOrEqualTo($lastMonth)) {
            $ym = $currentMonth->format('Y-m');
            $monthEvents = $events->filter(fn (array $event) => $event['date']->format('Y-m') === $ym);

            $monthlyInvoiced = (float) $monthEvents
                ->filter(fn (array $event) => $event['type'] === 'invoice')
                ->sum('amount');
            $monthlyPaid = (float) $monthEvents
                ->filter(fn (array $event) => $event['type'] === 'transaction')
                ->sum('amount');

            $cumulativeInvoiced += $monthlyInvoiced;
            $cumulativePaid += $monthlyPaid;

            $monthlyBuckets[] = [
                'date' => $currentMonth,
                'invoiced' => $monthlyInvoiced,
                'paid' => $monthlyPaid,
                'cum_invoiced' => $cumulativeInvoiced,
                'cum_paid' => $cumulativePaid,
            ];

            $currentMonth = $currentMonth->addMonth();
        }

        return [
            'default_granularity' => $granularity,
            'points' => array_map(fn (array $b) => [
                'period' => $b['date']->format('Y-m'),
                'label' => $b['date']->format('M Y'),
                'year' => (int) $b['date']->format('Y'),
                'quarter' => (int) ceil($b['date']->month / 3),
                'period_invoiced' => round($b['invoiced'], 2),
                'period_paid' => round($b['paid'], 2),
                'cumulative_invoiced' => round($b['cum_invoiced'], 2),
                'cumulative_paid' => round($b['cum_paid'], 2),
                'running_account' => round($b['cum_paid'] - $b['cum_invoiced'], 2),
            ], $monthlyBuckets),
        ];
    }

    protected function normalizeMoneyCurrencyKey(?string $currency): string
    {
        $normalized = strtoupper(trim((string) $currency));

        return $normalized !== '' ? $normalized : 'UNSPECIFIED';
    }

    protected function moneyCurrencyLabel(string $currencyKey): string
    {
        return $currencyKey === 'UNSPECIFIED' ? 'No currency' : $currencyKey;
    }

    protected function summarizeMoneyCollection(Collection $rows, string $amountKey, string $currencyKey): array
    {
        $currencies = $rows
            ->pluck($currencyKey)
            ->filter()
            ->unique()
            ->values();

        return [
            'amount' => round($rows->sum(fn ($row) => (float) ($row->{$amountKey} ?? 0)), 2),
            'currency' => $currencies->count() === 1 ? $currencies->first() : null,
            'mixed_currencies' => $currencies->count() > 1,
        ];
    }
}
