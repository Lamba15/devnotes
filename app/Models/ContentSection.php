<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['key', 'title', 'body_markdown', 'metadata', 'sort_order', 'is_published'])]
class ContentSection extends Model
{
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'sort_order' => 'integer',
            'is_published' => 'boolean',
        ];
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }
}
