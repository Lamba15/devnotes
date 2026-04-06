<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'run_id',
    'confirmation_id',
    'tool_name',
    'tool_call_id',
    'status',
    'result_type',
    'requires_confirmation',
    'arguments_json',
    'result_json',
    'error_message',
    'started_at',
    'finished_at',
    'duration_ms',
    'metadata_json',
])]
class AssistantToolExecution extends Model
{
    protected function casts(): array
    {
        return [
            'arguments_json' => 'array',
            'result_json' => 'array',
            'metadata_json' => 'array',
            'requires_confirmation' => 'boolean',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function run(): BelongsTo
    {
        return $this->belongsTo(AssistantRun::class, 'run_id');
    }

    public function confirmation(): BelongsTo
    {
        return $this->belongsTo(AssistantActionConfirmation::class, 'confirmation_id');
    }
}
