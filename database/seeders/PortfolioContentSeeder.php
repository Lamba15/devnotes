<?php

namespace Database\Seeders;

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ContentSection;
use App\Models\Feedback;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\Skill;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Recreates the curated portfolio content (projects, skills, sections,
 * feedback, and their binary assets) from checked-in fixtures.
 *
 * Fixture markdown stores asset URLs as %%STORAGE_URL%%<path>; the token is
 * replaced with the current app's public-disk URL at seed time so content
 * always points at the environment it was seeded in.
 */
class PortfolioContentSeeder extends Seeder
{
    private const FIXTURE_DIR = 'seeders/fixtures/portfolio';

    private const STORAGE_TOKEN = '%%STORAGE_URL%%';

    public function run(): void
    {
        $data = json_decode(
            (string) file_get_contents(database_path(self::FIXTURE_DIR.'/content.json')),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        $this->importAssets($data['assets']);
        $this->importSkills($data['skills']);
        $this->importProjects($data['projects']);
        $this->importSections($data['sections']);
        $this->importFeedback($data['feedback']);
    }

    /**
     * @param  array<int, string>  $assets
     */
    private function importAssets(array $assets): void
    {
        foreach ($assets as $path) {
            Storage::disk('public')->put(
                $path,
                file_get_contents(database_path(self::FIXTURE_DIR.'/bin/'.$path)),
            );
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $skills
     */
    private function importSkills(array $skills): void
    {
        foreach ($skills as $skill) {
            Skill::query()->updateOrCreate(
                ['slug' => $skill['slug']],
                ['name' => $skill['name'], 'icon' => $skill['icon']],
            );
        }
    }

    /**
     * Former names — when a fixture project was previously seeded under an
     * old name, match that row instead of creating a duplicate.
     *
     * @var array<string, list<string>>
     */
    private const PROJECT_NAME_ALIASES = [
        'Wallets CRM' => ['Wallets Client Search'],
    ];

    /**
     * @param  array<int, array<string, mixed>>  $projects
     */
    private function importProjects(array $projects): void
    {
        $skillIds = Skill::query()->pluck('id', 'slug');

        foreach ($projects as $attributes) {
            $project = Project::query()->where('name', $attributes['name'])->first()
                ?? Project::query()->whereIn('name', self::PROJECT_NAME_ALIASES[$attributes['name']] ?? [])->first()
                ?? new Project([
                    'client_id' => $this->selfClient()->id,
                    'name' => $attributes['name'],
                ]);

            // Renames flow through: an aliased row gets the fixture's name.
            $project->name = $attributes['name'];

            $project->fill([
                'status_id' => ProjectStatus::query()->where('slug', $attributes['status_slug'])->firstOrFail()->id,
                'description' => $attributes['description'],
                'markdown_description' => $this->rewriteAssetUrls($attributes['markdown_description']),
                'hosting' => $attributes['hosting'],
                'starts_at' => $attributes['starts_at'],
                'ends_at' => $attributes['ends_at'],
                'image_path' => $attributes['image_path'],
                'is_published' => true,
                'is_featured' => $attributes['is_featured'],
                'sort_order' => $attributes['sort_order'],
                'portfolio_category' => $attributes['portfolio_category'],
            ]);
            $project->save();

            $project->links()->delete();
            foreach ($attributes['links'] as $link) {
                $project->links()->create($link);
            }

            $project->skills()->sync(
                collect($attributes['skills'])
                    ->map(fn (string $slug): ?int => $skillIds[$slug] ?? null)
                    ->filter()
                    ->values()
                    ->all()
            );
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $sections
     */
    private function importSections(array $sections): void
    {
        foreach ($sections as $section) {
            ContentSection::query()->updateOrCreate(
                ['key' => $section['key']],
                [
                    'title' => $section['title'],
                    'body_markdown' => $this->rewriteAssetUrls($section['body_markdown']),
                    'metadata' => $section['metadata'],
                    'sort_order' => $section['sort_order'],
                    'is_published' => $section['is_published'],
                ],
            );
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $feedback
     */
    private function importFeedback(array $feedback): void
    {
        foreach ($feedback as $row) {
            Feedback::query()->updateOrCreate(
                ['name' => $row['name'], 'quote' => $row['quote']],
                [
                    'role' => $row['role'],
                    'source' => $row['source'],
                    'rating' => $row['rating'],
                    'project_id' => $row['project_name']
                        ? Project::query()->where('name', $row['project_name'])->value('id')
                        : null,
                    'is_published' => $row['is_published'],
                    'sort_order' => $row['sort_order'],
                ],
            );
        }
    }

    private function rewriteAssetUrls(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        return str_replace(self::STORAGE_TOKEN, Storage::disk('public')->url(''), $text);
    }

    private function selfClient(): Client
    {
        $normalizedSelfName = 'nouraboelsoud';

        $client = Client::query()->get()
            ->first(fn (Client $client): bool => Str::lower(str_replace(' ', '', $client->name)) === $normalizedSelfName);

        return $client ?? Client::query()->create([
            'name' => 'Nour Aboelsoud',
            'behavior_id' => Behavior::query()->where('slug', 'normal')->firstOrFail()->id,
        ]);
    }
}
