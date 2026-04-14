<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'project_id',
    'reference',
    'status',
    'currency',
    'subtotal_amount',
    'discount_total_amount',
    'amount',
    'issued_at',
    'due_at',
    'paid_at',
    'notes',
    'public_id',
    'public_pdf_path',
    'public_pdf_generated_at',
])]
class Invoice extends Model
{
    protected function casts(): array
    {
        return [
            'subtotal_amount' => 'decimal:2',
            'discount_total_amount' => 'decimal:2',
            'amount' => 'decimal:2',
            'issued_at' => 'date',
            'due_at' => 'date',
            'paid_at' => 'date',
            'public_pdf_generated_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('position');
    }

    public function discounts(): HasMany
    {
        return $this->hasMany(InvoiceDiscount::class)->orderBy('position');
    }
}
