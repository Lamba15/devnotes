<?php

use App\Models\Client;
use App\Models\Project;
use App\Models\Skill;
use Database\Seeders\LegacyFullSeeder;
use Database\Seeders\LegacyPortfolioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    fakeLegacyPortfolioApi();
});

test('seeder imports legacy skills with canonical names and downloaded icons', function () {
    $this->seed(LegacyPortfolioSeeder::class);

    expect(Skill::query()->count())->toBe(21)
        ->and(Skill::query()->where('slug', 'react')->count())->toBe(1)
        ->and(Skill::query()->where('slug', 'typescript')->value('icon'))->toBe('portfolio/skills/33fce117cda8e8b957f9ce50.png');

    foreach (['cicd' => 'CI/CD', 'sql' => 'SQL', 'nextjs' => 'Next.js', 'react-native' => 'React Native', 'threejs' => 'Three.js', 'fastapi' => 'FastAPI'] as $slug => $name) {
        expect(Skill::query()->where('slug', $slug)->value('name'))->toBe($name);
    }

    Storage::disk('public')->assertExists('portfolio/skills/87f16b67db8cd6cd7195b1f7.png');
});

test('seeder imports six legacy projects as published curated portfolio entries', function () {
    $this->seed(LegacyPortfolioSeeder::class);

    expect(Project::query()->count())->toBe(6)
        ->and(Project::query()->published()->count())->toBe(6);

    $mathMasr = Project::query()->where('name', 'Math Masr')->firstOrFail();

    expect($mathMasr->sort_order)->toBe(0)
        ->and($mathMasr->portfolio_category)->toBe('education')
        ->and($mathMasr->is_featured)->toBeFalse()
        ->and($mathMasr->starts_at->toDateString())->toBe('2022-06-29')
        ->and($mathMasr->status->slug)->toBe('completed')
        ->and(Project::query()->where('name', 'Leen Edu')->value('sort_order'))->toBe(1)
        ->and(Project::query()->where('name', 'Tropical For Landscape')->value('portfolio_category'))->toBe('business')
        ->and(Project::query()->where('name', 'Tapkha')->value('portfolio_category'))->toBe('business')
        ->and(Project::query()->where('name', 'IDesigns')->value('portfolio_category'))->toBe('creative')
        ->and(Project::query()->where('name', 'million pictures of love')->value('portfolio_category'))->toBe('creative');
});

test('seeder creates a self client when none exists and assigns imported projects to it', function () {
    $this->seed(LegacyPortfolioSeeder::class);

    $client = Client::query()->where('name', 'Nour Aboelsoud')->firstOrFail();

    expect($client->behavior->slug)->toBe('normal')
        ->and(Project::query()->where('client_id', $client->id)->count())->toBe(6);
});

test('seeder curates existing legacy projects in place instead of duplicating them', function () {
    $this->seed(LegacyFullSeeder::class);
    $this->seed(LegacyPortfolioSeeder::class);

    expect(Project::query()->count())->toBe(34)
        ->and(Client::query()->count())->toBe(20)
        ->and(Client::query()->where('name', 'Nour Aboelsoud')->exists())->toBeFalse();

    $tropical = Project::query()->where('name', 'Tropical For Landscape')->firstOrFail();

    expect($tropical->is_published)->toBeTrue()
        ->and($tropical->portfolio_category)->toBe('business')
        ->and($tropical->image_path)->toBe('portfolio/covers/6da47b03ceeebf55c864505f.jpg')
        ->and($tropical->client->name)->toBe('Abdel-Rahman galal');
});

test('seeder stores project covers on the public disk and website links on the project', function () {
    $this->seed(LegacyPortfolioSeeder::class);

    $mathMasr = Project::query()->where('name', 'Math Masr')->firstOrFail();

    expect($mathMasr->image_path)->toBe('portfolio/covers/c6580cd5d0d2f958e680fb91.png');
    Storage::disk('public')->assertExists('portfolio/covers/c6580cd5d0d2f958e680fb91.png');

    $websiteLinks = DB::table('project_links')->where('label', 'Website')->get();

    expect($websiteLinks)->toHaveCount(5)
        ->and($websiteLinks->where('project_id', $mathMasr->id)->first()->url)->toBe('https://mathmasr.com')
        ->and(Project::query()->where('name', 'million pictures of love')->firstOrFail()->links)->toHaveCount(0);
});

test('seeder downloads markdown assets and rewrites their urls to local storage', function () {
    $this->seed(LegacyPortfolioSeeder::class);

    $markdown = Project::query()->where('name', 'Leen Edu')->firstOrFail()->markdown_description;

    expect($markdown)->toContain('/storage/portfolio/files/57d74c6c67bfe89e37c382df.png')
        ->not->toContain('nouraboelsoud.com/erp');

    Storage::disk('public')->assertExists('portfolio/files/57d74c6c67bfe89e37c382df.png');

    $tropicalMarkdown = Project::query()->where('name', 'Tropical For Landscape')->firstOrFail()->markdown_description;

    expect($tropicalMarkdown)->toContain('/storage/portfolio/files/bcfa527cc2074c7dab14eec9.mp4?!#title=');
    Storage::disk('public')->assertExists('portfolio/files/bcfa527cc2074c7dab14eec9.mp4');
});

test('seeder is idempotent when run twice', function () {
    $this->seed(LegacyPortfolioSeeder::class);
    $this->seed(LegacyPortfolioSeeder::class);

    expect(Project::query()->count())->toBe(6)
        ->and(Skill::query()->count())->toBe(21)
        ->and(Client::query()->where('name', 'Nour Aboelsoud')->count())->toBe(1)
        ->and(DB::table('project_links')->count())->toBe(5)
        ->and(DB::table('project_skill')->count())->toBe(28);
});

function fakeLegacyPortfolioApi(): void
{
    Http::fake([
        '*/get-skills' => Http::response(['code' => 1, 'data' => legacyPortfolioSkillsPayload(), 'success' => true]),
        '*/get-projects-public' => Http::response(['code' => 1, 'data' => legacyPortfolioProjectsPayload(), 'success' => true]),
        '*' => Http::response('fake-binary-content', 200),
    ]);
}

function legacyPortfolioSkillsPayload(): array
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

function legacyPortfolioProjectsPayload(): array
{
    $covers = 'https://nouraboelsoud.com/erp/apis/v1/projects/covers';
    $files = 'https://nouraboelsoud.com/erp/apis/v1/projects/files';
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
            'markdownDescription' => "## Overview\r\n\r\n![]({$files}/57d74c6c67bfe89e37c382df.png)\r\n\r\nLeen Edu body.",
            'startDate' => '07 July 2023', 'link' => 'https://leenedu.net',
            'skills' => [$skill(10, 'REACT', 'c877896a4a087881819e4445.svg'), $skill(18, 'Laravel', 'ce3fd71e901d9939e80ca281.png'), $skill(21, 'Tailwind', 'c93084abe1a8d6db89b57bf1.svg'), $skill(9, 'TYPESCRIPT', '33fce117cda8e8b957f9ce50.png'), $skill(7, 'PHP', '9edfc86b14ce33800d682881.svg')],
        ],
        [
            'id' => 2, 'name' => 'Tropical For Landscape', 'cover' => "{$covers}/6da47b03ceeebf55c864505f.jpg",
            'description' => 'Landscaping company platform.',
            'markdownDescription' => "## Tropical\r\n\r\n<video src=\"{$files}/bcfa527cc2074c7dab14eec9.mp4?!#title=%20Complex%20Forms\"></video>",
            'startDate' => '18 July 2021', 'link' => 'https://tropical-co.com',
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
