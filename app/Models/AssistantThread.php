<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'title', 'context_type', 'context_id'])]
class AssistantThread extends Model
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AssistantMessage::class, 'thread_id');
    }

    public function confirmations(): HasMany
    {
        return $this->hasMany(AssistantActionConfirmation::class, 'thread_id');
    }

    public function runs(): HasMany
    {
        return $this->hasMany(AssistantRun::class, 'thread_id');
    }

    public function toSummaryArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title ?: 'New chat',
            'context_type' => $this->context_type,
            'context_id' => $this->context_id,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
