<?php

namespace App\Models;

use App\Support\ClientPermissionCatalog;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['client_id', 'user_id', 'role', 'created_by'])]
class ClientMembership extends Model
{
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function permissions(): HasMany
    {
        return $this->hasMany(ClientMembershipPermission::class, 'client_membership_id');
    }

    public function normalizedRole(): string
    {
        return $this->role === 'viewer' ? 'member' : $this->role;
    }

    public function permissionNames(): array
    {
        $permissions = $this->relationLoaded('permissions')
            ? $this->permissions->pluck('permission_name')->all()
            : $this->permissions()->pluck('permission_name')->all();

        return ClientPermissionCatalog::normalize($permissions);
    }
}
