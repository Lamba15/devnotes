<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['project_id', 'title', 'description', 'status', 'priority', 'type', 'creator_id', 'due_date', 'estimated_hours', 'label'])]
class Issue extends Model
{
    protected function casts(): array
    {
        return [
            'due_date' => 'date',
        ];
    }

    public function attachments()
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'issue_assignees')->withTimestamps();
    }

    public function isAssignedTo(User $user): bool
    {
        if ($this->relationLoaded('assignees')) {
            return $this->assignees->contains('id', $user->id);
        }

        return $this->assignees()->whereKey($user->id)->exists();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function placements(): HasMany
    {
        return $this->hasMany(BoardIssuePlacement::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(IssueComment::class);
    }
}
