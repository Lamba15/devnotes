<?php

namespace App\Actions\Secrets;

use App\Models\AuditLog;
use App\Models\SecretEntry;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteSecretEntry
{
    public function handle(User $actor, SecretEntry $secret, string $source = 'manual_ui'): void
    {
        if (! $actor->canAccessPlatform()) {
            throw new AuthorizationException('You are not allowed to delete secrets.');
        }

        $before = [
            'id' => $secret->id,
            'label' => $secret->label,
            'description' => $secret->description,
        ];

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'secret_entry.deleted',
            'source' => $source,
            'subject_type' => SecretEntry::class,
            'subject_id' => $secret->id,
            'metadata_json' => [
                'secretable_type' => $secret->secretable_type,
                'secretable_id' => $secret->secretable_id,
            ],
            'before_json' => $before,
        ]);

        $secret->delete();
    }
}
