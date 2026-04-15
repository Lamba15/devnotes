<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

#[Fillable(['name', 'slug', 'icon'])]
class Skill extends Model
{
    protected static function booted(): void
    {
        static::creating(function (Skill $skill) {
            if (empty($skill->slug) && ! empty($skill->name)) {
                $skill->slug = Str::slug($skill->name);
            }
        });
    }

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_skill');
    }
}
