<?php

namespace App\Actions\Finance;

use App\Models\Invoice;
use Illuminate\Validation\ValidationException;

class SyncInvoiceDocument
{
    public function handle(Invoice $invoice, array $attributes): Invoice
    {
        $items = $this->normalizeItems($invoice, $attributes);
        $discounts = $this->normalizeDiscounts($attributes);

        $invoice->discounts()->delete();
        $invoice->items()->delete();

        $createdItems = [];
        $itemRunningAmounts = [];
        $subtotalAmount = 0.0;

        foreach ($items as $index => $item) {
            $createdItem = $invoice->items()->create([
                'position' => $index + 1,
                'description' => $item['description'],
                'hours' => $item['hours'],
                'rate' => $item['rate'],
                'base_amount' => $item['base_amount'],
                'amount' => $item['base_amount'],
            ]);

            $createdItems[$index] = $createdItem;
            $itemRunningAmounts[$index] = (float) $item['base_amount'];
            $subtotalAmount += (float) $item['base_amount'];
        }

        $discountTotalAmount = 0.0;

        foreach ($discounts['item'] as $index => $discount) {
            $itemIndex = $discount['target_item_index'];

            if (! array_key_exists($itemIndex, $createdItems)) {
                throw ValidationException::withMessages([
                    "discounts.{$index}.target_item_index" => 'Select a valid invoice item for this discount.',
                ]);
            }

            $currentAmount = $itemRunningAmounts[$itemIndex];
            $discountAmount = $this->discountAmount($currentAmount, $discount['type'], $discount['value']);

            $invoice->discounts()->create([
                'invoice_item_id' => $createdItems[$itemIndex]->id,
                'position' => $index + 1,
                'label' => $discount['label'],
                'type' => $discount['type'],
                'value' => $discount['value'],
                'amount' => $discountAmount,
            ]);

            $itemRunningAmounts[$itemIndex] = round($currentAmount - $discountAmount, 2);
            $discountTotalAmount += $discountAmount;
        }

        foreach ($createdItems as $index => $createdItem) {
            $createdItem->update([
                'amount' => $itemRunningAmounts[$index],
            ]);
        }

        $invoiceRunningAmount = round(array_sum($itemRunningAmounts), 2);

        foreach ($discounts['invoice'] as $index => $discount) {
            $discountAmount = $this->discountAmount($invoiceRunningAmount, $discount['type'], $discount['value']);

            $invoice->discounts()->create([
                'invoice_item_id' => null,
                'position' => $index + 1,
                'label' => $discount['label'],
                'type' => $discount['type'],
                'value' => $discount['value'],
                'amount' => $discountAmount,
            ]);

            $invoiceRunningAmount = round($invoiceRunningAmount - $discountAmount, 2);
            $discountTotalAmount += $discountAmount;
        }

        $invoice->fill([
            'subtotal_amount' => round($subtotalAmount, 2),
            'discount_total_amount' => round($discountTotalAmount, 2),
            'amount' => max(round($invoiceRunningAmount, 2), 0),
        ]);
        $invoice->save();

        return $invoice->fresh(['project.client', 'items.discounts', 'discounts']);
    }

    private function normalizeItems(Invoice $invoice, array $attributes): array
    {
        $items = collect($attributes['items'] ?? [])
            ->filter(fn ($item) => is_array($item))
            ->map(function (array $item, int $index): array {
                $description = trim((string) ($item['description'] ?? ''));
                $hours = $this->nullableDecimal($item['hours'] ?? null, 2);
                $rate = $this->nullableDecimal($item['rate'] ?? null, 2);
                $flatAmount = $this->nullableDecimal($item['amount'] ?? null, 2);

                if ($description === '') {
                    throw ValidationException::withMessages([
                        "items.{$index}.description" => 'Each invoice item needs a description.',
                    ]);
                }

                $usesHours = $hours !== null || $rate !== null;

                if ($usesHours && ($hours === null || $rate === null)) {
                    throw ValidationException::withMessages([
                        "items.{$index}.hours" => 'Hourly items require both hours and rate.',
                        "items.{$index}.rate" => 'Hourly items require both hours and rate.',
                    ]);
                }

                if (! $usesHours && $flatAmount === null) {
                    throw ValidationException::withMessages([
                        "items.{$index}.amount" => 'Flat items need an amount.',
                    ]);
                }

                $baseAmount = $usesHours
                    ? round($hours * $rate, 2)
                    : round($flatAmount, 2);

                return [
                    'description' => $description,
                    'hours' => $usesHours ? $hours : null,
                    'rate' => $usesHours ? $rate : null,
                    'base_amount' => $baseAmount,
                ];
            })
            ->values()
            ->all();

        if ($items !== []) {
            return $items;
        }

        if (array_key_exists('amount', $attributes) && $attributes['amount'] !== null && $attributes['amount'] !== '') {
            return [[
                'description' => 'Invoice '.$invoice->reference,
                'hours' => null,
                'rate' => null,
                'base_amount' => round((float) $attributes['amount'], 2),
            ]];
        }

        throw ValidationException::withMessages([
            'items' => 'Add at least one invoice item.',
        ]);
    }

    private function normalizeDiscounts(array $attributes): array
    {
        $normalized = [
            'item' => [],
            'invoice' => [],
        ];

        foreach (collect($attributes['discounts'] ?? [])->filter(fn ($discount) => is_array($discount))->values() as $index => $discount) {
            $type = (string) ($discount['type'] ?? '');
            $targetType = (string) ($discount['target_type'] ?? 'invoice');
            $value = $this->nullableDecimal($discount['value'] ?? null, 4);
            $label = trim((string) ($discount['label'] ?? ''));

            if (! in_array($type, ['fixed', 'percent'], true)) {
                throw ValidationException::withMessages([
                    "discounts.{$index}.type" => 'Discount type must be fixed or percent.',
                ]);
            }

            if (! in_array($targetType, ['invoice', 'item'], true)) {
                throw ValidationException::withMessages([
                    "discounts.{$index}.target_type" => 'Discount target must be the invoice or a specific item.',
                ]);
            }

            if ($value === null || $value <= 0) {
                throw ValidationException::withMessages([
                    "discounts.{$index}.value" => 'Discount value must be greater than zero.',
                ]);
            }

            if ($type === 'percent' && $value > 100) {
                throw ValidationException::withMessages([
                    "discounts.{$index}.value" => 'Percent discounts cannot be greater than 100.',
                ]);
            }

            $payload = [
                'label' => $label !== '' ? $label : null,
                'type' => $type,
                'value' => $value,
                'target_item_index' => $targetType === 'item'
                    ? (int) ($discount['target_item_index'] ?? -1)
                    : null,
            ];

            $normalized[$targetType][] = $payload;
        }

        return $normalized;
    }

    private function nullableDecimal(mixed $value, int $precision): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return round((float) $value, $precision);
    }

    private function discountAmount(float $currentAmount, string $type, float $value): float
    {
        if ($currentAmount <= 0) {
            return 0.0;
        }

        $amount = $type === 'percent'
            ? round($currentAmount * ($value / 100), 2)
            : round($value, 2);

        return min(max($amount, 0), $currentAmount);
    }
}
