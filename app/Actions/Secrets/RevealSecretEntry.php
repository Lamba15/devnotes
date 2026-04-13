<?php

namespace App\Actions\Secrets;

use App\Models\AuditLog;
use App\Models\SecretEntry;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class RevealSecretEntry
{
    public function handle(User $actor, SecretEntry $secret, string $source = 'manual_ui'): string
    {
        if (! $actor->canAccessPlatform()) {
            throw new AuthorizationException('You are not allowed to reveal secrets.');
        }

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'secret_entry.revealed',
            'source' => $source,
            'subject_type' => SecretEntry::class,
            'subject_id' => $secret->id,
            'metadata_json' => [
                'secretable_type' => $secret->secretable_type,
                'secretable_id' => $secret->secretable_id,
                'label' => $secret->label,
            ],
        ]);

        return $secret->secret_value;
    }
}
