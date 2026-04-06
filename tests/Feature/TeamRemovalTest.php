<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamRemovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_team_routes_no_longer_exist(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/teams')->assertNotFound();
        $this->actingAs($user)->get('/settings/teams')->assertNotFound();
    }
}
