<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['board_id', 'name', 'position', 'updates_status', 'mapped_status'])]
class BoardColumn extends Model
{
    protected function casts(): array
    {
        return [
            'updates_status' => 'boolean',
        ];
    }

    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    public function placements(): HasMany
    {
        return $this->hasMany(BoardIssuePlacement::class, 'column_id');
    }
}
