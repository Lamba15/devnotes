<?php

namespace App\Models;

use Database\Factories\BehaviorFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug'])]
class Behavior extends Model
{
    /** @use HasFactory<BehaviorFactory> */
    use HasFactory;

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }
}
