<?php

namespace App\Actions\Secrets;

use App\Models\AuditLog;
use App\Models\SecretEntry;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Model;

class CreateSecretEntry
{
    public function handle(
        User $actor,
        Model $secretable,
        array $attributes,
        string $source = 'manual_ui',
    ): SecretEntry {
        if (! $actor->canAccessPlatform()) {
            throw new AuthorizationException('You are not allowed to create secrets.');
        }

        $secret = $secretable->secrets()->create([
            'label' => $attributes['label'],
            'description' => $attributes['description'] ?? null,
            'secret_value' => $attributes['secret_value'],
        ]);

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'secret_entry.created',
            'source' => $source,
            'subject_type' => SecretEntry::class,
            'subject_id' => $secret->id,
            'metadata_json' => [
                'secretable_type' => $secretable::class,
                'secretable_id' => $secretable->getKey(),
            ],
            'after_json' => [
                'id' => $secret->id,
                'label' => $secret->label,
                'description' => $secret->description,
            ],
        ]);

        return $secret;
    }
}
