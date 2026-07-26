<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ContentSection;
use App\Models\Feedback;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\Skill;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function portfolioProject(array $attributes = []): Project
{
    return Project::factory()->create([
        'client_id' => Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id])->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ...$attributes,
    ]);
}

test('projects index returns only published projects ordered by sort order with full shape', function () {
    $react = Skill::query()->where('slug', 'react')->firstOrFail();
    $react->update(['icon' => 'portfolio/skills/react.svg']);

    $unpublished = portfolioProject(['name' => 'Hidden', 'is_published' => false]);
    $second = portfolioProject(['name' => 'Second', 'is_published' => true, 'sort_order' => 2]);
    $first = portfolioProject([
        'name' => 'First',
        'is_published' => true,
        'is_featured' => true,
        'sort_order' => 1,
        'portfolio_category' => 'ai',
        'hosting' => 'Hostinger',
        'image_path' => 'portfolio/covers/first.png',
        'markdown_description' => '# First',
        'starts_at' => '2022-06-29',
    ]);
    $first->skills()->sync([$react->id]);
    $first->links()->create(['label' => 'Website', 'url' => 'https://first.test', 'position' => 0]);
    $first->gitRepos()->create(['name' => 'core', 'repo_url' => 'https://github.com/acme/core', 'wakatime_badge_url' => null, 'position' => 0]);

    $this->getJson(route('api.portfolio.projects.index'))
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'First')
        ->assertJsonPath('data.1.name', 'Second')
        ->assertJsonPath('data.0.description', $first->description)
        ->assertJsonPath('data.0.markdown_description', '# First')
        ->assertJsonPath('data.0.hosting', 'Hostinger')
        ->assertJsonPath('data.0.cover_url', Storage::disk('public')->url('portfolio/covers/first.png'))
        ->assertJsonPath('data.0.starts_at', '2022-06-29')
        ->assertJsonPath('data.0.ends_at', null)
        ->assertJsonPath('data.0.is_featured', true)
        ->assertJsonPath('data.0.portfolio_category', 'ai')
        ->assertJsonPath('data.0.skills.0.name', 'React')
        ->assertJsonPath('data.0.skills.0.icon_url', Storage::disk('public')->url('portfolio/skills/react.svg'))
        ->assertJsonPath('data.0.links.0.label', 'Website')
        ->assertJsonPath('data.0.links.0.url', 'https://first.test')
        ->assertJsonPath('data.0.git_repos.0.repo_url', 'https://github.com/acme/core')
        ->assertJsonMissing(['name' => 'Hidden']);
});

test('projects index filters by category and featured', function () {
    portfolioProject(['name' => 'AI one', 'is_published' => true, 'portfolio_category' => 'ai', 'sort_order' => 1]);
    portfolioProject(['name' => 'ERP one', 'is_published' => true, 'portfolio_category' => 'erp', 'sort_order' => 2]);
    portfolioProject(['name' => 'Featured ERP', 'is_published' => true, 'is_featured' => true, 'portfolio_category' => 'erp', 'sort_order' => 3]);

    $this->getJson(route('api.portfolio.projects.index', ['category' => 'erp']))
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonMissing(['name' => 'AI one']);

    $this->getJson(route('api.portfolio.projects.index', ['featured' => '1']))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Featured ERP');
});

test('projects index rejects an unknown category', function () {
    $this->getJson(route('api.portfolio.projects.index', ['category' => 'gadgets']))
        ->assertUnprocessable();
});

test('project show returns a published project and hides unpublished ones', function () {
    $published = portfolioProject(['name' => 'Visible', 'is_published' => true]);
    $unpublished = portfolioProject(['name' => 'Hidden', 'is_published' => false]);

    $this->getJson(route('api.portfolio.projects.show', $published))
        ->assertOk()
        ->assertJsonPath('data.name', 'Visible')
        ->assertJsonPath('data.cover_url', null);

    $this->getJson(route('api.portfolio.projects.show', $unpublished))
        ->assertNotFound();
});

test('skills index returns all skills ordered by name, including unused ones', function () {
    $used = Skill::query()->where('slug', 'react')->firstOrFail();
    $used->update(['icon' => 'portfolio/skills/react.svg']);
    $unused = Skill::query()->where('slug', 'figma')->firstOrFail();
    $usedByHidden = Skill::query()->where('slug', 'vite')->firstOrFail();

    $published = portfolioProject(['is_published' => true]);
    $published->skills()->sync([$used->id]);
    $hidden = portfolioProject(['is_published' => false]);
    $hidden->skills()->sync([$usedByHidden->id]);

    $response = $this->getJson(route('api.portfolio.skills.index'))->assertOk();

    $names = collect($response->json('data'))->pluck('name');

    // Unused and hidden-project skills are included now.
    expect($names)->toContain('React')
        ->toContain($unused->name)
        ->toContain($usedByHidden->name);

    // Ordered by name.
    $sorted = $names->sort(fn (string $a, string $b) => strcasecmp($a, $b))->values();
    expect($names->values()->all())->toEqual($sorted->all());

    $react = collect($response->json('data'))->firstWhere('slug', 'react');
    expect($react['icon_url'])->toEqual(Storage::disk('public')->url('portfolio/skills/react.svg'));
});

test('skill icon url is null when the skill has no icon', function () {
    $iconless = Skill::query()->where('slug', 'mysql')->firstOrFail();
    $project = portfolioProject(['is_published' => true]);
    $project->skills()->sync([$iconless->id]);

    $response = $this->getJson(route('api.portfolio.skills.index'))->assertOk();

    $mysql = collect($response->json('data'))->firstWhere('slug', 'mysql');

    expect($mysql)->not->toBeNull()
        ->and($mysql['icon_url'])->toBeNull();
});

test('sections index returns only published sections ordered by sort order', function () {
    ContentSection::query()->create(['key' => 'draft', 'title' => 'Draft', 'is_published' => false]);
    ContentSection::query()->create(['key' => 'services', 'title' => 'Services', 'sort_order' => 2, 'is_published' => true]);
    ContentSection::query()->create([
        'key' => 'about',
        'title' => 'About',
        'body_markdown' => '# Hello',
        'metadata' => ['tags' => ['bio']],
        'sort_order' => 1,
        'is_published' => true,
    ]);

    $this->getJson(route('api.portfolio.sections.index'))
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.key', 'about')
        ->assertJsonPath('data.0.body_markdown', '# Hello')
        ->assertJsonPath('data.0.metadata', ['tags' => ['bio']])
        ->assertJsonPath('data.1.key', 'services')
        ->assertJsonMissing(['key' => 'draft']);
});

test('section show returns a published section by key and 404s otherwise', function () {
    ContentSection::query()->create(['key' => 'about', 'title' => 'About', 'is_published' => true]);
    ContentSection::query()->create(['key' => 'draft', 'title' => 'Draft', 'is_published' => false]);

    $this->getJson(route('api.portfolio.sections.show', 'about'))
        ->assertOk()
        ->assertJsonPath('data.key', 'about')
        ->assertJsonPath('data.title', 'About');

    $this->getJson(route('api.portfolio.sections.show', 'draft'))->assertNotFound();
    $this->getJson(route('api.portfolio.sections.show', 'missing'))->assertNotFound();
});

test('portfolio api sends cors headers for allowed origins only', function () {
    $this->getJson(route('api.portfolio.projects.index'), [
        'Origin' => 'https://nouraboelsoud.com',
    ])->assertHeader('Access-Control-Allow-Origin', 'https://nouraboelsoud.com');

    $this->getJson(route('api.portfolio.projects.index'), [
        'Origin' => 'http://localhost:3000',
    ])->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000');

    $response = $this->getJson(route('api.portfolio.projects.index'), [
        'Origin' => 'https://evil.example.com',
    ])->assertOk();

    expect($response->headers->get('Access-Control-Allow-Origin'))->toBeNull();
});

test('portfolio api responses carry a public cache control header', function () {
    $response = $this->getJson(route('api.portfolio.projects.index'))->assertOk();

    expect($response->headers->get('Cache-Control'))
        ->toContain('public')
        ->toContain('max-age=60');
});

test('feedback index returns only published feedback ordered by sort order with shape', function () {
    $project = portfolioProject(['name' => 'IDesigns', 'is_published' => true]);

    Feedback::query()->create(['name' => 'Draft Person', 'quote' => 'Hidden.', 'is_published' => false]);
    Feedback::query()->create(['name' => 'Second', 'quote' => 'Second quote.', 'source' => 'direct', 'sort_order' => 2, 'is_published' => true]);
    Feedback::query()->create([
        'name' => 'Fuad',
        'role' => 'United Kingdom',
        'quote' => 'He delivered high quality work.',
        'source' => 'upwork',
        'rating' => 5,
        'project_id' => $project->id,
        'sort_order' => 1,
        'is_published' => true,
    ]);

    $this->getJson(route('api.portfolio.feedback.index'))
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Fuad')
        ->assertJsonPath('data.0.role', 'United Kingdom')
        ->assertJsonPath('data.0.quote', 'He delivered high quality work.')
        ->assertJsonPath('data.0.source', 'upwork')
        ->assertJsonPath('data.0.rating', 5)
        ->assertJsonPath('data.0.project.id', $project->id)
        ->assertJsonPath('data.0.project.name', 'IDesigns')
        ->assertJsonPath('data.1.name', 'Second')
        ->assertJsonPath('data.1.project', null)
        ->assertJsonPath('data.1.rating', null)
        ->assertJsonMissing(['name' => 'Draft Person']);
});
