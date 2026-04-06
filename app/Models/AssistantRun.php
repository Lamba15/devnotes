<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'thread_id',
    'user_id',
    'user_message_id',
    'assistant_message_id',
    'status',
    'provider',
    'configured_model',
    'effective_model',
    'system_prompt_source',
    'model_runs',
    'reruns',
    'started_at',
    'finished_at',
    'duration_ms',
    'error_type',
    'error_message',
    'metadata_json',
])]
class AssistantRun extends Model
{
    protected function casts(): array
    {
        return [
            'metadata_json' => 'array',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function thread(): BelongsTo
    {
        return $this->belongsTo(AssistantThread::class, 'thread_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function userMessage(): BelongsTo
    {
        return $this->belongsTo(AssistantMessage::class, 'user_message_id');
    }

    public function assistantMessage(): BelongsTo
    {
        return $this->belongsTo(AssistantMessage::class, 'assistant_message_id');
    }

    public function toolExecutions(): HasMany
    {
        return $this->hasMany(AssistantToolExecution::class, 'run_id');
    }

    public function phases(): HasMany
    {
        return $this->hasMany(AssistantRunPhase::class, 'run_id');
    }
}
