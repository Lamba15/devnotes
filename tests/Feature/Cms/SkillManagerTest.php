<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('platform owner can view the skills manager', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('cms.skills.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('cms/skills')
            ->has('skills', 15)
            ->has('skills.0', fn (Assert $skill) => $skill
                ->has('id')
                ->has('name')
                ->has('slug')
                ->has('icon')
            )
        );
});

test('client scoped users cannot access the skills manager', function () {
    $client = Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id]);
    $member = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    $this->actingAs($member)->get(route('cms.skills.index'))->assertForbidden();
    $this->actingAs($member)->post(route('cms.skills.store'), ['name' => 'Nope'])->assertForbidden();
});

test('platform owner can create a skill and the slug is derived', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('cms.skills.store'), ['name' => 'Svelte Kit'])
        ->assertRedirect();

    $skill = Skill::query()->where('name', 'Svelte Kit')->firstOrFail();

    expect($skill->slug)->toBe('svelte-kit');
});

test('skill names must be unique', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('cms.skills.store'), ['name' => 'Laravel'])
        ->assertSessionHasErrors('name');
});

test('platform owner can rename a skill', function () {
    $skill = Skill::query()->where('slug', 'laravel')->firstOrFail();

    $this->actingAs(User::factory()->create())
        ->put(route('cms.skills.update', $skill), ['name' => 'Laravel Framework'])
        ->assertRedirect();

    expect($skill->fresh()->name)->toBe('Laravel Framework')
        ->and($skill->fresh()->slug)->toBe('laravel');
});

test('platform owner can upload and replace a skill icon', function () {
    Storage::fake('public');

    $skill = Skill::query()->where('slug', 'react')->firstOrFail();

    $this->actingAs(User::factory()->create())
        ->post(route('cms.skills.icon.upload', $skill), [
            'icon' => UploadedFile::fake()->image('react.png'),
        ])
        ->assertRedirect();

    $firstPath = $skill->fresh()->icon;

    expect($firstPath)->toStartWith('skills/');
    Storage::disk('public')->assertExists($firstPath);

    $this->actingAs(User::factory()->create())
        ->post(route('cms.skills.icon.upload', $skill), [
            'icon' => UploadedFile::fake()->image('react-2.png'),
        ])
        ->assertRedirect();

    Storage::disk('public')->assertMissing($firstPath);
    expect($skill->fresh()->icon)->not->toBe($firstPath);
});

test('platform owner can delete a skill and it detaches from projects', function () {
    $skill = Skill::query()->where('slug', 'laravel')->firstOrFail();
    $project = Project::factory()->create([
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $project->skills()->sync([$skill->id]);

    $this->actingAs(User::factory()->create())
        ->delete(route('cms.skills.destroy', $skill))
        ->assertRedirect();

    $this->assertDatabaseMissing('skills', ['id' => $skill->id]);
    $this->assertDatabaseMissing('project_skill', ['skill_id' => $skill->id]);
});
