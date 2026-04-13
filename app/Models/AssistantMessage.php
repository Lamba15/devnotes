<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['thread_id', 'role', 'content', 'tool_calls_json', 'tool_results_json', 'meta_json'])]
class AssistantMessage extends Model
{
    protected $touches = ['thread'];

    protected function casts(): array
    {
        return [
            'tool_calls_json' => 'array',
            'tool_results_json' => 'array',
            'meta_json' => 'array',
        ];
    }

    public function thread(): BelongsTo
    {
        return $this->belongsTo(AssistantThread::class, 'thread_id');
    }

    public function runsAsUserMessage(): HasMany
    {
        return $this->hasMany(AssistantRun::class, 'user_message_id');
    }

    public function runsAsAssistantMessage(): HasMany
    {
        return $this->hasMany(AssistantRun::class, 'assistant_message_id');
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'role' => $this->role,
            'content' => $this->content,
            'tool_calls' => $this->tool_calls_json,
            'tool_results' => $this->tool_results_json,
            'meta' => $this->meta_json,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
