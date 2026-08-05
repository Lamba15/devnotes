<?php

use App\Models\AnalyticsPageView;
use App\Models\AnalyticsSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function analyticsPayload(array $events, ?string $visitorId = null, ?string $sessionId = null): array
{
    return [
        'visitor_id' => $visitorId ?? (string) Str::uuid(),
        'session_id' => $sessionId ?? (string) Str::uuid(),
        'context' => [
            'language' => 'en-US',
            'timezone' => 'Africa/Cairo',
            'screen_width' => 1440,
            'viewport_width' => 1280,
            'browser' => 'Chrome',
        ],
        'events' => $events,
    ];
}

function analyticsEvent(string $name, array $overrides = []): array
{
    return array_merge([
        'id' => (string) Str::uuid(),
        'name' => $name,
        'page_view_id' => (string) Str::uuid(),
        'path' => '/education',
        'title' => 'Programming for 2nd Secondary',
        'page_type' => 'education',
        'content_id' => 'education',
        'content_name' => 'Programming for 2nd Secondary',
    ], $overrides);
}

test('public telemetry stores a hashed anonymous session and a sanitized page view', function () {
    $visitorId = (string) Str::uuid();
    $sessionId = (string) Str::uuid();
    $pageViewId = (string) Str::uuid();

    $this->withHeader('Origin', 'https://nouraboelsoud.com')
        ->postJson(route('api.analytics.events.store'), analyticsPayload([
            analyticsEvent('page_view', [
                'page_view_id' => $pageViewId,
                'path' => '/education?private=value#intro-video',
                'referrer_host' => 'www.google.com',
                'utm_source' => 'whatsapp',
                'utm_campaign' => 'intro-lesson',
            ]),
        ], $visitorId, $sessionId))
        ->assertAccepted()
        ->assertHeader('Access-Control-Allow-Origin', 'https://nouraboelsoud.com')
        ->assertJson(['accepted' => 1]);

    $session = AnalyticsSession::query()->firstOrFail();
    $pageView = AnalyticsPageView::query()->firstOrFail();

    expect($session->visitor_key)->not->toBe($visitorId)
        ->and($session->session_key)->not->toBe($sessionId)
        ->and($session->visitor_key)->toHaveLength(64)
        ->and($session->landing_path)->toBe('/education')
        ->and($session->referrer_host)->toBe('www.google.com')
        ->and($session->utm_source)->toBe('whatsapp')
        ->and($pageView->page_view_uuid)->toBe($pageViewId)
        ->and($pageView->path)->toBe('/education')
        ->and($pageView->page_type)->toBe('education');
});

test('engagement updates are cumulative and custom events are idempotent', function () {
    $visitorId = (string) Str::uuid();
    $sessionId = (string) Str::uuid();
    $pageViewId = (string) Str::uuid();
    $videoEventId = (string) Str::uuid();

    $send = fn (array $events) => $this->withHeader('Origin', 'https://nouraboelsoud.com')
        ->postJson(route('api.analytics.events.store'), analyticsPayload($events, $visitorId, $sessionId));

    $send([analyticsEvent('page_view', [
        'page_view_id' => $pageViewId,
        'path' => '/education/presentations/intro-presentation',
        'page_type' => 'lecture',
        'content_id' => 'intro-presentation',
    ])])->assertAccepted();

    $send([analyticsEvent('engagement', [
        'page_view_id' => $pageViewId,
        'engaged_seconds' => 18,
        'scroll_depth' => 62,
    ])])->assertAccepted();

    $send([analyticsEvent('engagement', [
        'page_view_id' => $pageViewId,
        'engaged_seconds' => 25,
        'scroll_depth' => 80,
    ])])->assertAccepted();

    $videoStart = analyticsEvent('video_start', [
        'id' => $videoEventId,
        'page_view_id' => $pageViewId,
        'path' => '/education/presentations/intro-presentation',
        'page_type' => 'lecture',
        'content_id' => 'intro-presentation',
        'label' => 'Introductory lesson',
    ]);

    $send([$videoStart])->assertAccepted();
    $send([$videoStart])->assertAccepted();

    $session = AnalyticsSession::query()->firstOrFail();
    $pageView = AnalyticsPageView::query()->firstOrFail();

    expect($session->page_view_count)->toBe(1)
        ->and($session->engaged_seconds)->toBe(25)
        ->and($session->max_scroll_depth)->toBe(80)
        ->and($session->event_count)->toBe(1)
        ->and($session->key_event_count)->toBe(1)
        ->and($pageView->engaged_seconds)->toBe(25)
        ->and($pageView->max_scroll_depth)->toBe(80);

    $this->assertDatabaseCount('analytics_events', 1);
});

test('telemetry rejects unsupported events and oversized batches', function () {
    $this->withHeader('Origin', 'https://nouraboelsoud.com')
        ->postJson(route('api.analytics.events.store'), analyticsPayload([
            analyticsEvent('typed_password'),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('events.0.name');

    $events = collect(range(1, 21))
        ->map(fn () => analyticsEvent('page_view'))
        ->all();

    $this->withHeader('Origin', 'https://nouraboelsoud.com')
        ->postJson(route('api.analytics.events.store'), analyticsPayload($events))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('events');
});
