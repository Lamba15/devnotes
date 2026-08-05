<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function dashboardAnalyticsEvent(string $name, array $overrides = []): array
{
    return array_merge([
        'id' => (string) Str::uuid(),
        'name' => $name,
        'page_view_id' => (string) Str::uuid(),
        'path' => '/',
        'title' => 'Nour Abo Elsoud',
        'page_type' => 'home',
    ], $overrides);
}

function dashboardAnalyticsPayload(array $events, string $visitorId, string $sessionId): array
{
    return [
        'visitor_id' => $visitorId,
        'session_id' => $sessionId,
        'context' => [
            'language' => 'en-US',
            'timezone' => 'Africa/Cairo',
            'viewport_width' => 1280,
            'browser' => 'Chrome',
        ],
        'events' => $events,
    ];
}

function recordAnalyticsSession(
    $test,
    string $path,
    string $pageType,
    int $engagedSeconds = 0,
    ?string $eventName = null,
    ?string $contentId = null,
): void {
    $visitorId = (string) Str::uuid();
    $sessionId = (string) Str::uuid();
    $pageViewId = (string) Str::uuid();

    $events = [dashboardAnalyticsEvent('page_view', [
        'page_view_id' => $pageViewId,
        'path' => $path,
        'page_type' => $pageType,
        'content_id' => $contentId,
    ])];

    if ($engagedSeconds > 0) {
        $events[] = dashboardAnalyticsEvent('engagement', [
            'page_view_id' => $pageViewId,
            'path' => $path,
            'page_type' => $pageType,
            'content_id' => $contentId,
            'engaged_seconds' => $engagedSeconds,
            'scroll_depth' => 70,
        ]);
    }

    if ($eventName) {
        $events[] = dashboardAnalyticsEvent($eventName, [
            'page_view_id' => $pageViewId,
            'path' => $path,
            'page_type' => $pageType,
            'content_id' => $contentId,
        ]);
    }

    $test->withHeader('Origin', 'https://nouraboelsoud.com')
        ->postJson(route('api.analytics.events.store'), dashboardAnalyticsPayload($events, $visitorId, $sessionId))
        ->assertAccepted();
}

test('platform owner can view a reconciled website analytics dashboard', function () {
    recordAnalyticsSession($this, '/education', 'education', 5);
    recordAnalyticsSession(
        $this,
        '/education/presentations/intro-presentation',
        'lecture',
        42,
        'video_start',
        'intro-presentation',
    );
    recordAnalyticsSession($this, '/projects/68', 'project', 18, 'project_outbound_click', '68');

    $this->actingAs(User::factory()->create())
        ->get(route('cms.analytics.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('cms/analytics')
            ->where('filters.days', 30)
            ->where('filters.scope', 'all')
            ->where('summary.visitors', 3)
            ->where('summary.sessions', 3)
            ->where('summary.page_views', 3)
            ->where('summary.bounced_sessions', 1)
            ->where('summary.engaged_sessions', 2)
            ->where('summary.bounce_rate', 33.3)
            ->where('summary.engagement_rate', 66.7)
            ->where('education.landing_views', 1)
            ->where('education.lecture_views', 1)
            ->where('education.video_starts', 1)
            ->has('trend', 30)
            ->has('top_pages', 3)
            ->has('project_views', 1)
            ->has('sources')
            ->has('devices')
            ->has('events')
            ->has('definitions')
        );
});

test('analytics dashboard scope filters sessions and pages consistently', function () {
    recordAnalyticsSession($this, '/education', 'education', 5);
    recordAnalyticsSession($this, '/projects/68', 'project', 18, null, '68');

    $this->actingAs(User::factory()->create())
        ->get(route('cms.analytics.index', ['scope' => 'education', 'days' => 7]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.days', 7)
            ->where('filters.scope', 'education')
            ->where('summary.sessions', 1)
            ->where('summary.page_views', 1)
            ->where('education.landing_views', 1)
            ->where('education.lecture_views', 0)
            ->has('top_pages', 1)
            ->has('project_views', 0)
        );
});

test('scope rates ignore engagement and actions from pages outside that scope', function () {
    $visitorId = (string) Str::uuid();
    $sessionId = (string) Str::uuid();
    $homeViewId = (string) Str::uuid();
    $projectViewId = (string) Str::uuid();

    $events = [
        dashboardAnalyticsEvent('page_view', [
            'page_view_id' => $homeViewId,
            'path' => '/',
            'page_type' => 'home',
        ]),
        dashboardAnalyticsEvent('engagement', [
            'page_view_id' => $homeViewId,
            'path' => '/',
            'page_type' => 'home',
            'engaged_seconds' => 30,
        ]),
        dashboardAnalyticsEvent('contact_click', [
            'page_view_id' => $homeViewId,
            'path' => '/',
            'page_type' => 'home',
        ]),
        dashboardAnalyticsEvent('page_view', [
            'page_view_id' => $projectViewId,
            'path' => '/projects/68',
            'page_type' => 'project',
            'content_id' => '68',
        ]),
    ];

    $this->withHeader('Origin', 'https://nouraboelsoud.com')
        ->postJson(
            route('api.analytics.events.store'),
            dashboardAnalyticsPayload($events, $visitorId, $sessionId),
        )
        ->assertAccepted();

    $this->actingAs(User::factory()->create())
        ->get(route('cms.analytics.index', ['scope' => 'projects']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('summary.sessions', 1)
            ->where('summary.page_views', 1)
            ->where('summary.bounced_sessions', 1)
            ->where('summary.engaged_sessions', 0)
            ->where('summary.bounce_rate', 100)
            ->where('summary.engagement_rate', 0)
            ->where('summary.avg_engagement_seconds', 0)
            ->where('summary.key_events', 0)
        );
});

test('client scoped users cannot access website analytics', function () {
    $client = Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id]);
    $member = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    $this->actingAs($member)
        ->get('/cms/analytics')
        ->assertForbidden();
});
