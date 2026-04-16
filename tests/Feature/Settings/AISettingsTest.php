<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\PlatformAiConfig;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('platform owner can access AI settings page', function () {
    $owner = User::factory()->create();

    $this->actingAs($owner)
        ->get(route('ai-settings.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/ai')
        );
});

test('client scoped user cannot access AI settings page', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $member = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'admin',
    ]);

    $this->actingAs($member)
        ->get(route('ai-settings.edit'))
        ->assertForbidden();
});

test('platform owner saving AI settings stores config centrally not on user', function () {
    $owner = User::factory()->create();

    $this->actingAs($owner)
        ->patch(route('ai-settings.update'), [
            'openrouter_api_key' => 'sk-or-v1-test-key',
            'openrouter_model' => 'anthropic/claude-sonnet-4',
            'openrouter_system_prompt' => 'Custom system prompt',
        ])
        ->assertRedirect(route('ai-settings.edit'));

    $config = PlatformAiConfig::query()->firstOrFail();

    expect($config->openrouter_api_key)->toBe('sk-or-v1-test-key');
    expect($config->openrouter_model)->toBe('anthropic/claude-sonnet-4');
    expect($config->openrouter_system_prompt)->toBe('Custom system prompt');

    // Not saved on user record
    expect($owner->fresh()->openrouter_api_key)->toBeNull();
    expect($owner->fresh()->openrouter_model)->toBeNull();
});

test('AI settings page shows current platform config', function () {
    $owner = User::factory()->create();

    PlatformAiConfig::query()->create([
        'openrouter_api_key' => 'sk-or-v1-existing',
        'openrouter_model' => 'anthropic/claude-sonnet-4',
        'openrouter_system_prompt' => 'Existing prompt',
    ]);

    $this->actingAs($owner)
        ->get(route('ai-settings.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/ai')
            ->where('hasOpenRouterApiKey', true)
            ->where('openRouterModel', 'anthropic/claude-sonnet-4')
            ->where('openRouterSystemPrompt', 'Existing prompt')
        );
});

test('updating AI settings preserves existing API key when blank is submitted', function () {
    $owner = User::factory()->create();

    PlatformAiConfig::query()->create([
        'openrouter_api_key' => 'sk-or-v1-keep-this',
        'openrouter_model' => 'anthropic/claude-sonnet-4',
    ]);

    $this->actingAs($owner)
        ->patch(route('ai-settings.update'), [
            'openrouter_api_key' => '',
            'openrouter_model' => 'openai/gpt-5',
            'openrouter_system_prompt' => '',
        ])
        ->assertRedirect(route('ai-settings.edit'));

    $config = PlatformAiConfig::query()->firstOrFail();

    expect($config->openrouter_api_key)->toBe('sk-or-v1-keep-this');
    expect($config->openrouter_model)->toBe('openai/gpt-5');
});
