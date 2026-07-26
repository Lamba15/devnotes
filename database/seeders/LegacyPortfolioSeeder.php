<?php

namespace Database\Seeders;

use App\Models\Behavior;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\Skill;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LegacyPortfolioSeeder extends Seeder
{
    private const API_BASE = 'https://nouraboelsoud.com/erp/apis/v1';

    private const SELF_CLIENT_NAME = 'Nour Aboelsoud';

    /**
     * Legacy API skill names mapped to canonical display names.
     *
     * @var array<string, string>
     */
    private const SKILL_NAME_MAP = [
        'LINUX' => 'Linux',
        'AWS' => 'AWS',
        'CI/CD' => 'CI/CD',
        'SQL' => 'SQL',
        'PHP' => 'PHP',
        'NEXTJS' => 'Next.js',
        'TYPESCRIPT' => 'TypeScript',
        'REACT' => 'React',
        'REACT NATIVE' => 'React Native',
        'GIT' => 'Git',
        'THREEJS' => 'Three.js',
        'Docker' => 'Docker',
        'Laravel' => 'Laravel',
        'FastAPI' => 'FastAPI',
        'Tailwind' => 'Tailwind',
    ];

    /**
     * @var array<string, string>
     */
    private const PROJECT_CATEGORY_MAP = [
        'Math Masr' => 'education',
        'Leen Edu' => 'education',
        'Tropical For Landscape' => 'business',
        'Tapkha' => 'business',
        'IDesigns' => 'creative',
        'million pictures of love' => 'creative',
    ];

    public function run(): void
    {
        $legacySkills = Http::get(self::API_BASE.'/get-skills')->throw()->json('data') ?? [];
        $legacyProjects = Http::get(self::API_BASE.'/get-projects-public')->throw()->json('data') ?? [];

        $skillIds = $this->importSkills($legacySkills);

        $client = $this->selfClient();
        $statusId = ProjectStatus::query()->where('slug', 'completed')->firstOrFail()->id;

        foreach (array_values($legacyProjects) as $position => $legacyProject) {
            $this->importProject($client, $statusId, $legacyProject, $position, $skillIds);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $legacySkills
     * @return array<string, int>
     */
    private function importSkills(array $legacySkills): array
    {
        $skillIds = [];

        foreach ($legacySkills as $legacySkill) {
            $name = self::SKILL_NAME_MAP[$legacySkill['name']] ?? Str::headline((string) $legacySkill['name']);

            $skill = Skill::query()->updateOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'name' => $name,
                    'icon' => $this->downloadToPublicDisk($legacySkill['icon'] ?? null, 'portfolio/skills'),
                ]
            );

            $skillIds[$legacySkill['name']] = $skill->id;
        }

        return $skillIds;
    }

    private function selfClient(): Client
    {
        $normalizedSelfName = Str::lower(str_replace(' ', '', self::SELF_CLIENT_NAME));

        $client = Client::query()->get()
            ->first(fn (Client $client): bool => Str::lower(str_replace(' ', '', $client->name)) === $normalizedSelfName);

        return $client ?? Client::query()->create([
            'name' => self::SELF_CLIENT_NAME,
            'behavior_id' => Behavior::query()->where('slug', 'normal')->firstOrFail()->id,
        ]);
    }

    /**
     * @param  array<string, mixed>  $legacyProject
     * @param  array<string, int>  $skillIds
     */
    private function importProject(Client $client, int $statusId, array $legacyProject, int $position, array $skillIds): void
    {
        $project = Project::query()->where('name', $legacyProject['name'])->first()
            ?? new Project(['client_id' => $client->id, 'name' => $legacyProject['name']]);

        $project->fill([
            'status_id' => $statusId,
            'description' => $legacyProject['description'] ?? null,
            'markdown_description' => $this->rewriteMarkdownAssets($legacyProject['markdownDescription'] ?? null),
            'starts_at' => filled($legacyProject['startDate'] ?? null) ? Carbon::parse($legacyProject['startDate']) : null,
            'image_path' => $this->downloadToPublicDisk($legacyProject['cover'] ?? null, 'portfolio/covers'),
            'is_published' => true,
            'sort_order' => $position,
            'portfolio_category' => self::PROJECT_CATEGORY_MAP[$legacyProject['name']] ?? null,
        ]);
        $project->save();

        $project->links()->delete();
        if (filled($legacyProject['link'] ?? null)) {
            $project->links()->create([
                'label' => 'Website',
                'url' => $legacyProject['link'],
                'position' => 0,
            ]);
        }

        $project->skills()->sync(
            collect($legacyProject['skills'] ?? [])
                ->map(fn (array $skill): ?int => $skillIds[$skill['name']] ?? null)
                ->filter()
                ->values()
                ->all()
        );
    }

    private function rewriteMarkdownAssets(?string $markdown): ?string
    {
        if (! filled($markdown)) {
            return null;
        }

        return preg_replace_callback(
            '~'.preg_quote(self::API_BASE, '~').'/[^\s?#)"\']+~',
            fn (array $matches): string => Storage::disk('public')->url(
                $this->downloadToPublicDisk($matches[0], 'portfolio/files')
            ),
            $markdown
        );
    }

    private function downloadToPublicDisk(?string $url, string $directory): ?string
    {
        if (! filled($url)) {
            return null;
        }

        $path = $directory.'/'.basename((string) parse_url($url, PHP_URL_PATH));

        if (! Storage::disk('public')->exists($path)) {
            Storage::disk('public')->put($path, Http::get($url)->throw()->body());
        }

        return $path;
    }
}
