<?php

namespace App\Actions\Clients;

use App\Models\AuditLog;
use App\Models\Client;
use App\Models\ClientPhoneNumber;
use App\Models\ClientTag;
use App\Models\User;
use Illuminate\Support\Arr;

class UpdateClient
{
    public function handle(User $user, Client $client, array $attributes, string $source = 'web'): Client
    {
        $client->fill(Arr::only($attributes, [
            'name',
            'email',
            'behavior_id',
            'industry',
            'country_of_origin',
            'address',
            'birthday',
            'date_of_first_interaction',
            'origin',
            'notes',
            'social_links_json',
        ]));
        $client->save();

        if (array_key_exists('phone_numbers', $attributes)) {
            $client->phoneNumbers()->delete();

            collect($attributes['phone_numbers'])
                ->filter(fn ($entry) => filled($entry['number'] ?? null))
                ->values()
                ->each(fn ($entry, $index) => ClientPhoneNumber::query()->create([
                    'client_id' => $client->id,
                    'label' => $entry['label'] ?? null,
                    'number' => $entry['number'],
                    'position' => $index,
                ]));
        }

        if (array_key_exists('tags', $attributes)) {
            $client->tags()->delete();

            collect($attributes['tags'])
                ->filter(fn ($tag) => filled($tag))
                ->values()
                ->each(fn ($tag, $index) => ClientTag::query()->create([
                    'client_id' => $client->id,
                    'name' => $tag,
                    'position' => $index,
                ]));
        }

        AuditLog::query()->create([
            'user_id' => $user->id,
            'event' => 'client.updated',
            'source' => $source,
            'subject_type' => Client::class,
            'subject_id' => $client->id,
            'payload_json' => Arr::only($attributes, [
                'name',
                'email',
                'behavior_id',
                'industry',
                'country_of_origin',
                'address',
                'birthday',
                'date_of_first_interaction',
                'origin',
                'notes',
                'social_links_json',
                'phone_numbers',
                'tags',
            ]),
        ]);

        return $client->fresh(['behavior', 'phoneNumbers', 'tags']);
    }
}
