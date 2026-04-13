<?php

namespace App\Actions\Secrets;

use App\Models\AuditLog;
use App\Models\SecretEntry;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class UpdateSecretEntry
{
    public function handle(
        User $actor,
        SecretEntry $secret,
        array $attributes,
        string $source = 'manual_ui',
    ): SecretEntry {
        if (! $actor->canAccessPlatform()) {
            throw new AuthorizationException('You are not allowed to update secrets.');
        }

        $before = [
            'id' => $secret->id,
            'label' => $secret->label,
            'description' => $secret->description,
        ];

        $secret->fill([
            'label' => $attributes['label'],
            'description' => $attributes['description'] ?? null,
        ]);

        if (array_key_exists('secret_value', $attributes) && filled($attributes['secret_value'])) {
            $secret->secret_value = $attributes['secret_value'];
        }

        $secret->save();

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'secret_entry.updated',
            'source' => $source,
            'subject_type' => SecretEntry::class,
            'subject_id' => $secret->id,
            'metadata_json' => [
                'secretable_type' => $secret->secretable_type,
                'secretable_id' => $secret->secretable_id,
            ],
            'before_json' => $before,
            'after_json' => [
                'id' => $secret->id,
                'label' => $secret->label,
                'description' => $secret->description,
            ],
        ]);

        return $secret->fresh();
    }
}
