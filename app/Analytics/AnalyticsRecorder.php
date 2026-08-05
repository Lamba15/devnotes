<?php

namespace App\Analytics;

use App\Models\AnalyticsEvent;
use App\Models\AnalyticsPageView;
use App\Models\AnalyticsSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AnalyticsRecorder
{
    private const KEY_EVENTS = [
        'project_outbound_click',
        'whatsapp_click',
        'contact_click',
        'presentation_open',
        'video_start',
        'video_complete',
    ];

    public function record(array $payload, Request $request): int
    {
        $visitorKey = $this->hashIdentifier($payload['visitor_id']);
        $sessionKey = $this->hashIdentifier($payload['session_id']);
        $context = $payload['context'] ?? [];
        $accepted = 0;

        DB::transaction(function () use (
            $payload,
            $request,
            $visitorKey,
            $sessionKey,
            $context,
            &$accepted,
        ): void {
            $now = now();
            $firstEvent = $payload['events'][0];
            $session = AnalyticsSession::query()->firstOrCreate(
                ['session_key' => $sessionKey],
                [
                    'visitor_key' => $visitorKey,
                    'started_at' => $now,
                    'last_seen_at' => $now,
                    'landing_path' => $this->sanitizePath($firstEvent['path']),
                    'exit_path' => $this->sanitizePath($firstEvent['path']),
                    'referrer_host' => $this->sanitizeHost($firstEvent['referrer_host'] ?? null),
                    'referrer_path' => $this->sanitizeNullablePath($firstEvent['referrer_path'] ?? null),
                    'utm_source' => $this->sanitizeText($firstEvent['utm_source'] ?? null, 100),
                    'utm_medium' => $this->sanitizeText($firstEvent['utm_medium'] ?? null, 100),
                    'utm_campaign' => $this->sanitizeText($firstEvent['utm_campaign'] ?? null, 150),
                    'device_type' => $this->deviceType($context),
                    'browser' => $this->sanitizeText($context['browser'] ?? null, 40),
                    'language' => $this->sanitizeText($context['language'] ?? null, 20),
                    'timezone' => $this->sanitizeText($context['timezone'] ?? null, 64),
                    'country_code' => $this->countryCode($request),
                ],
            );

            foreach ($payload['events'] as $event) {
                $accepted++;
                $path = $this->sanitizePath($event['path']);
                $session->last_seen_at = $now;
                $session->exit_path = $path;

                if ($event['name'] === 'page_view') {
                    $this->recordPageView($session, $visitorKey, $event, $path, $now);
                } elseif ($event['name'] === 'engagement') {
                    $this->recordEngagement($session, $event);
                } else {
                    $this->recordEvent($session, $visitorKey, $event, $path, $now);
                }

                $session->save();
            }
        });

        return $accepted;
    }

    private function recordPageView(
        AnalyticsSession $session,
        string $visitorKey,
        array $event,
        string $path,
        $now,
    ): void {
        $pageView = AnalyticsPageView::query()->firstOrCreate(
            ['page_view_uuid' => $event['page_view_id']],
            [
                'analytics_session_id' => $session->id,
                'visitor_key' => $visitorKey,
                'occurred_at' => $now,
                'path' => $path,
                'title' => $this->sanitizeText($event['title'] ?? null, 255),
                'page_type' => $event['page_type'],
                'content_id' => $this->sanitizeText($event['content_id'] ?? null, 100),
                'content_name' => $this->sanitizeText($event['content_name'] ?? null, 255),
                'referrer_path' => $this->sanitizeNullablePath($event['referrer_path'] ?? null),
            ],
        );

        if ($pageView->wasRecentlyCreated) {
            $session->page_view_count++;
        }
    }

    private function recordEngagement(AnalyticsSession $session, array $event): void
    {
        $pageView = AnalyticsPageView::query()
            ->where('analytics_session_id', $session->id)
            ->where('page_view_uuid', $event['page_view_id'])
            ->lockForUpdate()
            ->first();

        if (! $pageView) {
            return;
        }

        $reportedSeconds = min((int) ($event['engaged_seconds'] ?? 0), 86400);
        $reportedScroll = min((int) ($event['scroll_depth'] ?? 0), 100);
        $secondsDelta = max(0, $reportedSeconds - $pageView->engaged_seconds);

        $pageView->engaged_seconds = max($pageView->engaged_seconds, $reportedSeconds);
        $pageView->max_scroll_depth = max($pageView->max_scroll_depth, $reportedScroll);
        $pageView->save();

        $session->engaged_seconds += $secondsDelta;
        $session->max_scroll_depth = max((int) $session->max_scroll_depth, $reportedScroll);
    }

    private function recordEvent(
        AnalyticsSession $session,
        string $visitorKey,
        array $event,
        string $path,
        $now,
    ): void {
        $pageView = AnalyticsPageView::query()
            ->where('analytics_session_id', $session->id)
            ->where('page_view_uuid', $event['page_view_id'])
            ->first();

        $analyticsEvent = AnalyticsEvent::query()->firstOrCreate(
            ['event_uuid' => $event['id']],
            [
                'analytics_session_id' => $session->id,
                'analytics_page_view_id' => $pageView?->id,
                'visitor_key' => $visitorKey,
                'occurred_at' => $now,
                'name' => $event['name'],
                'path' => $path,
                'page_type' => $event['page_type'],
                'content_id' => $this->sanitizeText($event['content_id'] ?? null, 100),
                'label' => $this->sanitizeText($event['label'] ?? null, 255),
                'target_host' => $this->sanitizeHost($event['target_host'] ?? null),
                'properties' => $this->sanitizeProperties($event['properties'] ?? null),
            ],
        );

        if (! $analyticsEvent->wasRecentlyCreated) {
            return;
        }

        $session->event_count++;

        if (in_array($event['name'], self::KEY_EVENTS, true)) {
            $session->key_event_count++;
        }
    }

    private function hashIdentifier(string $identifier): string
    {
        return hash_hmac('sha256', $identifier, (string) config('app.key'));
    }

    private function sanitizePath(string $value): string
    {
        $path = parse_url($value, PHP_URL_PATH);

        if (! is_string($path) || $path === '' || ! str_starts_with($path, '/')) {
            return '/';
        }

        return Str::limit($path, 500, '');
    }

    private function sanitizeNullablePath(?string $value): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        return $this->sanitizePath($value);
    }

    private function sanitizeHost(?string $value): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        $host = strtolower(trim($value));
        $host = preg_replace('/[^a-z0-9.:-]/', '', $host) ?: '';

        return $host === '' ? null : Str::limit($host, 255, '');
    }

    private function sanitizeText(mixed $value, int $limit): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : Str::limit($value, $limit, '');
    }

    private function sanitizeProperties(mixed $properties): ?array
    {
        if (! is_array($properties)) {
            return null;
        }

        return collect(array_slice($properties, 0, 8, true))
            ->mapWithKeys(function (mixed $value, mixed $key): array {
                $safeKey = Str::limit(preg_replace('/[^a-z0-9_\-]/i', '', (string) $key) ?: '', 40, '');

                if ($safeKey === '' || (! is_scalar($value) && $value !== null)) {
                    return [];
                }

                return [$safeKey => is_string($value) ? Str::limit($value, 255, '') : $value];
            })
            ->all() ?: null;
    }

    private function deviceType(array $context): ?string
    {
        $reported = $context['device_type'] ?? null;

        if (in_array($reported, ['desktop', 'tablet', 'mobile'], true)) {
            return $reported;
        }

        $width = (int) ($context['viewport_width'] ?? $context['screen_width'] ?? 0);

        return match (true) {
            $width <= 0 => null,
            $width < 768 => 'mobile',
            $width < 1100 => 'tablet',
            default => 'desktop',
        };
    }

    private function countryCode(Request $request): ?string
    {
        $country = strtoupper((string) $request->headers->get('cf-ipcountry', ''));

        return preg_match('/^[A-Z]{2}$/', $country) ? $country : null;
    }
}
