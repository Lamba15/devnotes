<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'run_id',
    'key',
    'title',
    'status',
    'summary',
    'started_at',
    'finished_at',
    'duration_ms',
    'metadata_json',
])]
class AssistantRunPhase extends Model
{
    protected function casts(): array
    {
        return [
            'metadata_json' => 'array',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function run(): BelongsTo
    {
        return $this->belongsTo(AssistantRun::class, 'run_id');
    }
}
