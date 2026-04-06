<?php

namespace App\Models;

use Database\Factories\ClientFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'behavior_id',
    'image_path',
    'email',
    'country_of_origin',
    'industry',
    'address',
    'birthday',
    'date_of_first_interaction',
    'notes',
])]
class Client extends Model
{
    /** @use HasFactory<ClientFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'birthday' => 'date',
            'date_of_first_interaction' => 'date',
        ];
    }

    public function behavior(): BelongsTo
    {
        return $this->belongsTo(Behavior::class);
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(ClientMembership::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }
}
