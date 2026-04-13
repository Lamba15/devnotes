<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['client_membership_id', 'permission_name', 'granted_by'])]
class ClientMembershipPermission extends Model
{
    public function membership(): BelongsTo
    {
        return $this->belongsTo(ClientMembership::class, 'client_membership_id');
    }

    public function grantor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'granted_by');
    }
}
