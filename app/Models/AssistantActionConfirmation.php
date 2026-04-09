<?php

namespace App\Models;

use App\AI\AssistantConfirmationPresenter;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['thread_id', 'user_id', 'tool_name', 'payload_json', 'status'])]
class AssistantActionConfirmation extends Model
{
    protected function casts(): array
    {
        return [
            'payload_json' => 'array',
        ];
    }

    public function thread(): BelongsTo
    {
        return $this->belongsTo(AssistantThread::class, 'thread_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function toApiArray(): array
    {
        $presentation = app(AssistantConfirmationPresenter::class)->present($this);

        return [
            'id' => $this->id,
            'thread_id' => $this->thread_id,
            'tool_name' => $this->tool_name,
            'payload' => $this->payload_json,
            'presentation' => $presentation,
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
