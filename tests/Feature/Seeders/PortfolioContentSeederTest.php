<?php

use App\Models\ContentSection;
use App\Models\Feedback;
use App\Models\Project;
use App\Models\Skill;
use Database\Seeders\LegacyFullSeeder;
use Database\Seeders\LegacyPortfolioSeeder;
use Database\Seeders\PortfolioContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    Http::fake([
        '*/get-skills' => Http::response(['code' => 1, 'data' => portfolioContentLegacySkills(), 'success' => true]),
        '*/get-projects-public' => Http::response(['code' => 1, 'data' => portfolioContentLegacyProjects(), 'success' => true]),
        '*' => Http::response('fake-binary-content', 200),
    ]);
});

test('seeder recreates the full portfolio content deterministically', function () {
    $this->seed(LegacyFullSeeder::class);
    $this->seed(LegacyPortfolioSeeder::class);
    $this->seed(PortfolioContentSeeder::class);

    $published = Project::query()->published()->orderBy('sort_order')->orderBy('id')->get();

    expect($published->pluck('name')->all())->toBe([
        'Dwell AI',
        'Wallets Client Search',
        'Leen Edu',
        'EgyGPT',
        'Odynza',
        'Wallets — walletsproperties.com',
        'Dwell — dwellegypt.com',
        'Math Masr',
        'Tropical For Landscape',
        'Tapkha',
        'IDesigns',
        'million pictures of love',
    ]);

    expect($published->where('is_featured', true)->pluck('name')->all())
        ->toBe(['Dwell AI', 'Wallets Client Search', 'Leen Edu']);

    expect($published->pluck('portfolio_category', 'name')->all())->toBe([
        'Dwell AI' => 'ai',
        'Wallets Client Search' => 'erp',
        'Leen Edu' => 'education',
        'EgyGPT' => 'ai',
        'Odynza' => 'business',
        'Wallets — walletsproperties.com' => 'business',
        'Dwell — dwellegypt.com' => 'business',
        'Math Masr' => 'education',
        'Tropical For Landscape' => 'business',
        'Tapkha' => 'business',
        'IDesigns' => 'creative',
        'million pictures of love' => 'creative',
    ]);

    $dwellAi = $published->firstWhere('name', 'Dwell AI');

    expect($dwellAi->client->name)->toBe('nour abo elsoud')
        ->and($dwellAi->skills->pluck('slug')->sort()->values()->all())->toBe(['react', 'tailwind', 'typescript'])
        ->and($dwellAi->links->first()->label)->toBe('Try Dwell AI')
        ->and($dwellAi->markdown_description)->toContain(Storage::disk('public')->url('portfolio/files/'))
        ->and($dwellAi->markdown_description)->not->toContain('%%STORAGE_URL%%')
        ->and($dwellAi->markdown_description)->not->toContain('192.168.8.15');

    // Legacy projects keep their real clients and get the final curation state.
    $leen = $published->firstWhere('name', 'Leen Edu');

    expect($leen->client->name)->toBe('mahmoud el zainy')
        ->and($leen->is_featured)->toBeTrue()
        ->and($leen->markdown_description)->not->toContain('%%STORAGE_URL%%')
        ->and($leen->markdown_description)->not->toContain('192.168.8.15');

    expect(ContentSection::query()->count())->toBe(9)
        ->and(ContentSection::query()->published()->count())->toBe(9)
        ->and(ContentSection::query()->where('key', 'about')->exists())->toBeTrue()
        ->and(ContentSection::query()->where('key', 'like', 'education.%')->count())->toBe(7);

    $feedback = Feedback::query()->orderBy('sort_order')->orderBy('id')->get();

    expect($feedback)->toHaveCount(4)
        ->and($feedback->firstWhere('name', 'Fuad')->project->name)->toBe('IDesigns')
        ->and($feedback->firstWhere('name', 'Lance')->project)->toBeNull()
        ->and($feedback->where('is_published', true))->toHaveCount(4);

    expect(Skill::query()->count())->toBe(26);

    foreach ([
        'openai-apis' => 'openai',
        'langchain' => 'langchain',
        'langgraph' => 'langgraph',
        'rag' => 'rag',
        'vector-databases' => 'vector-databases',
    ] as $slug => $iconSlug) {
        $skill = Skill::query()->where('slug', $slug)->firstOrFail();

        expect($skill->icon)->toBe("portfolio/skills/unified/{$iconSlug}.svg");
        Storage::disk('public')->assertExists($skill->icon);
    }

    Storage::disk('public')->assertExists('portfolio/covers/c6580cd5d0d2f958e680fb91.png');
    Storage::disk('public')->assertExists('portfolio/files/bcfa527cc2074c7dab14eec9.mp4');
});

test('seeder is idempotent when run twice', function () {
    $this->seed(LegacyFullSeeder::class);
    $this->seed(LegacyPortfolioSeeder::class);
    $this->seed(PortfolioContentSeeder::class);
    $this->seed(PortfolioContentSeeder::class);

    expect(Project::query()->published()->count())->toBe(12)
        ->and(Project::query()->count())->toBe(38)
        ->and(ContentSection::query()->count())->toBe(9)
        ->and(Feedback::query()->count())->toBe(4)
        ->and(Skill::query()->count())->toBe(26)
        ->and(DB::table('project_links')->count())->toBe(10);
});

function portfolioContentLegacySkills(): array
{
    $base = 'https://nouraboelsoud.com/erp/apis/v1/skills';

    return [
        ['id' => 1, 'name' => 'LINUX', 'icon' => "{$base}/87f16b67db8cd6cd7195b1f7.png"],
        ['id' => 4, 'name' => 'AWS', 'icon' => "{$base}/177c397a6779e1a85703e6ec.svg"],
        ['id' => 5, 'name' => 'CI/CD', 'icon' => "{$base}/a1276ac6ef9f9d7b0a9f35e4.png"],
        ['id' => 6, 'name' => 'SQL', 'icon' => "{$base}/1420a631bf752cff63d00831.png"],
        ['id' => 7, 'name' => 'PHP', 'icon' => "{$base}/9edfc86b14ce33800d682881.svg"],
        ['id' => 8, 'name' => 'NEXTJS', 'icon' => "{$base}/17e5dd1cb16b945a24f6f09f.svg"],
        ['id' => 9, 'name' => 'TYPESCRIPT', 'icon' => "{$base}/33fce117cda8e8b957f9ce50.png"],
        ['id' => 10, 'name' => 'REACT', 'icon' => "{$base}/c877896a4a087881819e4445.svg"],
        ['id' => 11, 'name' => 'REACT NATIVE', 'icon' => "{$base}/14a8cc42c3943137ac04735f.svg"],
        ['id' => 12, 'name' => 'GIT', 'icon' => "{$base}/f7ac396332c07013a81cf2c4.svg"],
        ['id' => 14, 'name' => 'THREEJS', 'icon' => "{$base}/14840d889bcc017ee7ad3699.svg"],
        ['id' => 15, 'name' => 'Docker', 'icon' => "{$base}/8738bb22940b12cfd0778925.webp"],
        ['id' => 18, 'name' => 'Laravel', 'icon' => "{$base}/ce3fd71e901d9939e80ca281.png"],
        ['id' => 20, 'name' => 'FastAPI', 'icon' => "{$base}/b1c584d3f241ce1fb17997be.png"],
        ['id' => 21, 'name' => 'Tailwind', 'icon' => "{$base}/c93084abe1a8d6db89b57bf1.svg"],
    ];
}

function portfolioContentLegacyProjects(): array
{
    $covers = 'https://nouraboelsoud.com/erp/apis/v1/projects/covers';
    $skills = 'https://nouraboelsoud.com/erp/apis/v1/skills';

    $skill = fn (int $id, string $name, string $icon) => [
        'projectId' => 0, 'skillId' => $id, 'id' => $id, 'name' => $name,
        'icon' => "{$skills}/{$icon}", 'skill' => $name,
    ];

    return [
        [
            'id' => 7, 'name' => 'Math Masr', 'cover' => "{$covers}/c6580cd5d0d2f958e680fb91.png",
            'description' => 'The most advanced educational system for mathematics.',
            'markdownDescription' => null, 'startDate' => '29 June 2022', 'link' => 'https://mathmasr.com',
            'skills' => [$skill(6, 'SQL', '1420a631bf752cff63d00831.png'), $skill(10, 'REACT', 'c877896a4a087881819e4445.svg'), $skill(7, 'PHP', '9edfc86b14ce33800d682881.svg')],
        ],
        [
            'id' => 24, 'name' => 'Leen Edu', 'cover' => "{$covers}/3cd8ef3f5cc76ced36f46427.png",
            'description' => 'Leen Edu, a pioneering educational platform.',
            'markdownDescription' => null, 'startDate' => '07 July 2023', 'link' => 'https://leenedu.net',
            'skills' => [$skill(10, 'REACT', 'c877896a4a087881819e4445.svg'), $skill(18, 'Laravel', 'ce3fd71e901d9939e80ca281.png'), $skill(21, 'Tailwind', 'c93084abe1a8d6db89b57bf1.svg'), $skill(9, 'TYPESCRIPT', '33fce117cda8e8b957f9ce50.png'), $skill(7, 'PHP', '9edfc86b14ce33800d682881.svg')],
        ],
        [
            'id' => 2, 'name' => 'Tropical For Landscape', 'cover' => "{$covers}/6da47b03ceeebf55c864505f.jpg",
            'description' => 'Landscaping company platform.',
            'markdownDescription' => null, 'startDate' => '18 July 2021', 'link' => 'https://tropical-co.com',
            'skills' => [$skill(7, 'PHP', '9edfc86b14ce33800d682881.svg'), $skill(6, 'SQL', '1420a631bf752cff63d00831.png'), $skill(10, 'REACT', 'c877896a4a087881819e4445.svg')],
        ],
        [
            'id' => 22, 'name' => 'IDesigns', 'cover' => "{$covers}/772add159c4837eac5166887.png",
            'description' => 'Interior design store.',
            'markdownDescription' => null, 'startDate' => '03 March 2023', 'link' => 'https://www.idesigns.shop',
            'skills' => [$skill(4, 'AWS', '177c397a6779e1a85703e6ec.svg'), $skill(10, 'REACT', 'c877896a4a087881819e4445.svg'), $skill(20, 'FastAPI', 'b1c584d3f241ce1fb17997be.png')],
        ],
        [
            'id' => 3, 'name' => 'Tapkha', 'cover' => "{$covers}/c24368d141581e3c6742cbd0.png",
            'description' => 'Restaurant ordering app.',
            'markdownDescription' => null, 'startDate' => '18 July 2021', 'link' => 'https://tapkha.com',
            'skills' => [$skill(7, 'PHP', '9edfc86b14ce33800d682881.svg'), $skill(6, 'SQL', '1420a631bf752cff63d00831.png'), $skill(10, 'REACT', 'c877896a4a087881819e4445.svg'), $skill(11, 'REACT NATIVE', '14a8cc42c3943137ac04735f.svg'), $skill(5, 'CI/CD', 'a1276ac6ef9f9d7b0a9f35e4.png')],
        ],
        [
            'id' => 5, 'name' => 'million pictures of love', 'cover' => "{$covers}/caf91000a6740f1980082bde.svg",
            'description' => 'A creative experiment.',
            'markdownDescription' => null, 'startDate' => '20 January 2023', 'link' => null,
            'skills' => [$skill(4, 'AWS', '177c397a6779e1a85703e6ec.svg'), $skill(5, 'CI/CD', 'a1276ac6ef9f9d7b0a9f35e4.png'), $skill(6, 'SQL', '1420a631bf752cff63d00831.png'), $skill(7, 'PHP', '9edfc86b14ce33800d682881.svg'), $skill(9, 'TYPESCRIPT', '33fce117cda8e8b957f9ce50.png'), $skill(10, 'REACT', 'c877896a4a087881819e4445.svg'), $skill(12, 'GIT', 'f7ac396332c07013a81cf2c4.svg'), $skill(15, 'Docker', '8738bb22940b12cfd0778925.webp'), $skill(1, 'LINUX', '87f16b67db8cd6cd7195b1f7.png')],
        ],
    ];
}
