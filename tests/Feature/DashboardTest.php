<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page_when_visiting_overview()
    {
        $response = $this->get(route('overview'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_overview_page()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get(route('overview'));

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('overview')
            );
    }
}
