<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['name', 'role', 'quote', 'source', 'rating', 'project_id', 'is_published', 'sort_order'])]
class Feedback extends Model
{
    public const SOURCES = ['upwork', 'direct'];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'is_published' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
