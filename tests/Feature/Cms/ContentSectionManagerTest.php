<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\ContentSection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('platform owner can view the content sections manager', function () {
    ContentSection::query()->create([
        'key' => 'about',
        'title' => 'About',
        'is_published' => true,
    ]);

    $this->actingAs(User::factory()->create())
        ->get(route('cms.pages.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('cms/pages')
            ->has('sections', 1)
            ->has('sections.0', fn (Assert $section) => $section
                ->has('id')
                ->where('key', 'about')
                ->where('title', 'About')
                ->where('is_published', true)
                ->has('body_markdown')
                ->has('metadata')
                ->has('sort_order')
            )
        );
});

test('client scoped users cannot manage content sections', function () {
    $client = Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id]);
    $member = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    $this->actingAs($member)->get(route('cms.pages.index'))->assertForbidden();
    $this->actingAs($member)->post(route('cms.pages.store'), ['key' => 'about', 'title' => 'About'])->assertForbidden();
});

test('platform owner can create a content section with markdown and metadata', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('cms.pages.store'), [
            'key' => 'dwell.dwellegypt',
            'title' => 'Dwell Egypt',
            'body_markdown' => "# Case study\n\nBody text.",
            'metadata' => '{"live_url":"https://dwellegypt.com","tags":["erp"]}',
            'sort_order' => 2,
            'is_published' => true,
        ])
        ->assertRedirect();

    $section = ContentSection::query()->where('key', 'dwell.dwellegypt')->firstOrFail();

    expect($section->title)->toBe('Dwell Egypt')
        ->and($section->body_markdown)->toBe("# Case study\n\nBody text.")
        ->and($section->metadata)->toBe(['live_url' => 'https://dwellegypt.com', 'tags' => ['erp']])
        ->and($section->sort_order)->toBe(2)
        ->and($section->is_published)->toBeTrue();
});

test('content section keys are validated', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('cms.pages.store'), ['key' => 'bad key!', 'title' => 'Nope'])
        ->assertSessionHasErrors('key');

    $this->actingAs($user)
        ->post(route('cms.pages.store'), ['title' => 'Missing key'])
        ->assertSessionHasErrors('key');

    ContentSection::query()->create(['key' => 'about', 'title' => 'About']);

    $this->actingAs($user)
        ->post(route('cms.pages.store'), ['key' => 'about', 'title' => 'Duplicate'])
        ->assertSessionHasErrors('key');
});

test('content section metadata must be valid json', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('cms.pages.store'), [
            'key' => 'services',
            'title' => 'Services',
            'metadata' => '{not json',
        ])
        ->assertSessionHasErrors('metadata');
});

test('platform owner can update a content section', function () {
    $section = ContentSection::query()->create([
        'key' => 'education',
        'title' => 'Education',
    ]);

    $this->actingAs(User::factory()->create())
        ->put(route('cms.pages.update', $section), [
            'key' => 'education',
            'title' => 'Teaching',
            'body_markdown' => 'Updated body.',
            'is_published' => true,
        ])
        ->assertRedirect();

    $section->refresh();

    expect($section->title)->toBe('Teaching')
        ->and($section->body_markdown)->toBe('Updated body.')
        ->and($section->is_published)->toBeTrue()
        ->and($section->sort_order)->toBe(0);
});

test('platform owner can delete a content section', function () {
    $section = ContentSection::query()->create([
        'key' => 'services',
        'title' => 'Services',
    ]);

    $this->actingAs(User::factory()->create())
        ->delete(route('cms.pages.destroy', $section))
        ->assertRedirect();

    $this->assertDatabaseMissing('content_sections', ['id' => $section->id]);
});
