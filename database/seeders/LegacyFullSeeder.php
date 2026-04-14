<?php

namespace Database\Seeders;

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientPhoneNumber;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\SecretEntry;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class LegacyFullSeeder extends Seeder
{
    public function run(): void
    {
        $data = require database_path('seeders/Support/LegacyData.php');

        Behavior::query()->upsert(
            collect($data['behaviors'])
                ->map(fn (array $behavior) => [
                    'name' => $behavior['name'],
                    'slug' => $behavior['slug'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
                ->values()
                ->all(),
            ['slug'],
            ['name', 'updated_at'],
        );

        $statusIds = ProjectStatus::query()
            ->whereIn('slug', ['active', 'paused', 'completed', 'archived'])
            ->pluck('id', 'slug');

        $behaviorIds = Behavior::query()->pluck('id', 'slug');
        $projectNotes = collect($data['project_notes'])->groupBy('project_legacy_id');

        $clientMap = [];
        foreach ($data['clients'] as $legacyId => $attributes) {
            $client = Client::query()->create([
                'name' => $attributes['name'],
                'behavior_id' => $behaviorIds[$data['behaviors'][$attributes['behavior_legacy_id']]['slug']],
                'image_path' => null,
                'email' => null,
                'country_of_origin' => null,
                'industry' => null,
                'address' => $attributes['address'],
                'birthday' => $this->parseDate($attributes['birthday']),
                'date_of_first_interaction' => $this->parseDate($attributes['date_of_first_interaction']),
                'origin' => null,
                'social_links_json' => null,
                'notes' => $attributes['notes'],
            ]);

            $clientMap[(int) $legacyId] = $client->id;
        }

        $phonePositions = [];
        foreach ($data['client_phone_numbers'] as $phoneNumber) {
            $clientId = $clientMap[$phoneNumber['client_legacy_id']] ?? null;

            if ($clientId === null) {
                continue;
            }

            $phonePositions[$clientId] ??= 0;

            ClientPhoneNumber::query()->create([
                'client_id' => $clientId,
                'label' => null,
                'number' => $phoneNumber['number'],
                'position' => $phonePositions[$clientId]++,
            ]);
        }

        $projectMap = [];
        foreach ($data['projects'] as $legacyId => $attributes) {
            $clientId = $clientMap[$attributes['client_legacy_id']] ?? null;

            if ($clientId === null) {
                continue;
            }

            $legacyNoteEntries = $projectNotes->get($legacyId, collect())
                ->sortBy('recorded_at')
                ->map(function (array $note): string {
                    return 'Legacy note - '.$note['recorded_at'].PHP_EOL.PHP_EOL.$note['markdown'];
                })
                ->values()
                ->all();

            $notes = collect([
                $attributes['notes'],
                ...$legacyNoteEntries,
            ])->filter(fn ($value) => filled($value))->implode(PHP_EOL.PHP_EOL.'---'.PHP_EOL.PHP_EOL);

            $project = Project::query()->create([
                'client_id' => $clientId,
                'status_id' => $statusIds[$attributes['status_slug']],
                'name' => $attributes['name'],
                'description' => $attributes['description'],
                'starts_at' => $this->parseDateTime($attributes['starts_at']),
                'ends_at' => null,
                'notes' => $notes !== '' ? $notes : null,
                'budget' => $attributes['budget'],
                'currency' => $attributes['currency'],
            ]);

            $projectMap[(int) $legacyId] = $project->id;
        }

        foreach ($data['transactions'] as $transaction) {
            $projectId = $projectMap[$transaction['project_legacy_id']] ?? null;

            if ($projectId === null) {
                continue;
            }

            Transaction::query()->create([
                'project_id' => $projectId,
                'description' => Str::limit($transaction['description'], 255, ''),
                'amount' => $transaction['amount'],
                'occurred_date' => $this->parseDate($transaction['occurred_date'] ?? $transaction['occurred_at'] ?? null),
                'category' => $transaction['category'],
                'currency' => $transaction['currency'],
            ]);
        }

        foreach ($data['invoices'] as $invoice) {
            $projectId = $projectMap[$invoice['project_legacy_id']] ?? null;

            if ($projectId === null) {
                continue;
            }

            Invoice::query()->create([
                'project_id' => $projectId,
                'reference' => $invoice['reference'],
                'status' => $invoice['status'],
                'amount' => $invoice['amount'],
                'currency' => $invoice['currency'],
                'issued_at' => $this->parseDate($invoice['issued_at']),
                'due_at' => null,
                'paid_at' => $this->parseDate($invoice['paid_at']),
                'notes' => $invoice['notes'],
            ]);
        }

        foreach ($data['project_secrets'] as $secret) {
            $projectId = $projectMap[$secret['project_legacy_id']] ?? null;

            if ($projectId === null) {
                continue;
            }

            SecretEntry::query()->create([
                'secretable_type' => Project::class,
                'secretable_id' => $projectId,
                'label' => $secret['label'],
                'description' => $secret['description'],
                'secret_value' => $secret['secret_value'],
            ]);
        }
    }

    private function parseDate(?string $value): ?string
    {
        if (! filled($value)) {
            return null;
        }

        return Carbon::parse($value)->toDateString();
    }

    private function parseDateTime(?string $value): ?string
    {
        if (! filled($value)) {
            return null;
        }

        return Carbon::parse($value)->toDateTimeString();
    }
}
