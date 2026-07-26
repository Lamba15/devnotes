<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Feedback;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('platform owner can view the feedback manager', function () {
    Feedback::query()->create([
        'name' => 'Fuad',
        'quote' => 'Great work.',
        'source' => 'upwork',
        'is_published' => true,
    ]);

    $this->actingAs(User::factory()->create())
        ->get(route('cms.feedback.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('cms/feedback')
            ->has('feedback', 1)
            ->has('feedback.0', fn (Assert $row) => $row
                ->has('id')
                ->where('name', 'Fuad')
                ->where('quote', 'Great work.')
                ->where('source', 'upwork')
                ->where('is_published', true)
                ->has('role')
                ->has('rating')
                ->has('sort_order')
                ->has('project_id')
                ->has('project')
            )
            ->has('projects')
        );
});

test('client scoped users cannot manage feedback', function () {
    $client = Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id]);
    $member = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    $this->actingAs($member)->get(route('cms.feedback.index'))->assertForbidden();
    $this->actingAs($member)->post(route('cms.feedback.store'), ['name' => 'X', 'quote' => 'Y'])->assertForbidden();
});

test('platform owner can create feedback with all fields', function () {
    $project = Project::factory()->create();

    $this->actingAs(User::factory()->create())
        ->post(route('cms.feedback.store'), [
            'name' => 'Fuad',
            'role' => 'United Kingdom',
            'quote' => 'He delivered high quality work.',
            'source' => 'upwork',
            'rating' => 5,
            'project_id' => $project->id,
            'sort_order' => 2,
            'is_published' => true,
        ])
        ->assertRedirect();

    $feedback = Feedback::query()->where('name', 'Fuad')->firstOrFail();

    expect($feedback->role)->toBe('United Kingdom')
        ->and($feedback->quote)->toBe('He delivered high quality work.')
        ->and($feedback->source)->toBe('upwork')
        ->and($feedback->rating)->toBe(5)
        ->and($feedback->project_id)->toBe($project->id)
        ->and($feedback->sort_order)->toBe(2)
        ->and($feedback->is_published)->toBeTrue();
});

test('feedback defaults to direct source unpublished order zero', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('cms.feedback.store'), [
            'name' => 'Amina',
            'quote' => 'Direct note.',
        ])
        ->assertRedirect();

    $feedback = Feedback::query()->where('name', 'Amina')->firstOrFail();

    expect($feedback->source)->toBe('direct')
        ->and($feedback->is_published)->toBeFalse()
        ->and($feedback->sort_order)->toBe(0)
        ->and($feedback->rating)->toBeNull()
        ->and($feedback->project_id)->toBeNull();
});

test('feedback validation guards quote source and rating', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('cms.feedback.store'), ['name' => 'No quote'])
        ->assertSessionHasErrors('quote');

    $this->actingAs($user)
        ->post(route('cms.feedback.store'), ['name' => 'X', 'quote' => 'Y', 'source' => 'linkedin'])
        ->assertSessionHasErrors('source');

    $this->actingAs($user)
        ->post(route('cms.feedback.store'), ['name' => 'X', 'quote' => 'Y', 'rating' => 6])
        ->assertSessionHasErrors('rating');

    $this->actingAs($user)
        ->post(route('cms.feedback.store'), ['name' => 'X', 'quote' => 'Y', 'rating' => 0])
        ->assertSessionHasErrors('rating');
});

test('platform owner can update feedback', function () {
    $feedback = Feedback::query()->create([
        'name' => 'Lance',
        'quote' => 'Original quote.',
        'source' => 'direct',
    ]);

    $this->actingAs(User::factory()->create())
        ->put(route('cms.feedback.update', $feedback), [
            'name' => 'Lance',
            'quote' => 'Updated quote.',
            'source' => 'upwork',
            'rating' => 4,
            'is_published' => true,
        ])
        ->assertRedirect();

    $feedback->refresh();

    expect($feedback->quote)->toBe('Updated quote.')
        ->and($feedback->source)->toBe('upwork')
        ->and($feedback->rating)->toBe(4)
        ->and($feedback->is_published)->toBeTrue();
});

test('platform owner can delete feedback', function () {
    $feedback = Feedback::query()->create([
        'name' => 'Tormod',
        'quote' => 'Will re-hire.',
    ]);

    $this->actingAs(User::factory()->create())
        ->delete(route('cms.feedback.destroy', $feedback))
        ->assertRedirect();

    $this->assertDatabaseMissing('feedback', ['id' => $feedback->id]);
});

test('feedback keeps its row when the linked project is deleted', function () {
    $project = Project::factory()->create();
    $feedback = Feedback::query()->create([
        'name' => 'Fuad',
        'quote' => 'Great work.',
        'project_id' => $project->id,
    ]);

    $project->delete();

    expect($feedback->fresh()->project_id)->toBeNull();
});
