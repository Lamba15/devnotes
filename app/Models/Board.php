<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['project_id', 'created_by', 'name'])]
class Board extends Model
{
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function columns(): HasMany
    {
        return $this->hasMany(BoardColumn::class);
    }

    public function placements(): HasMany
    {
        return $this->hasMany(BoardIssuePlacement::class);
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(BoardMembership::class);
    }
}
