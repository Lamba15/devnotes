<?php

namespace App\Http\Controllers;

use App\Models\AnalyticsEvent;
use App\Models\AnalyticsPageView;
use App\Models\AnalyticsSession;
use App\Models\Project;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CmsAnalyticsController extends Controller
{
    private const SCOPES = [
        'all' => null,
        'portfolio' => ['home', 'projects_index', 'project'],
        'projects' => ['project'],
        'education' => ['education', 'lecture'],
        'lectures' => ['lecture'],
    ];

    private const MEANINGFUL_EVENTS = [
        'project_outbound_click',
        'whatsapp_click',
        'contact_click',
        'presentation_open',
        'video_start',
        'video_complete',
    ];

    public function __invoke(Request $request): Response
    {
        $days = in_array((int) $request->integer('days', 30), [7, 30, 90], true)
            ? (int) $request->integer('days', 30)
            : 30;
        $scope = array_key_exists((string) $request->query('scope', 'all'), self::SCOPES)
            ? (string) $request->query('scope', 'all')
            : 'all';
        $start = CarbonImmutable::now()->startOfDay()->subDays($days - 1);
        $end = CarbonImmutable::now()->endOfDay();
        $pageTypes = self::SCOPES[$scope];

        $sessionsQuery = AnalyticsSession::query()
            ->whereBetween('started_at', [$start, $end]);

        if ($pageTypes !== null) {
            $matchingSessionIds = AnalyticsPageView::query()
                ->whereBetween('occurred_at', [$start, $end])
                ->whereIn('page_type', $pageTypes)
                ->select('analytics_session_id');

            $sessionsQuery->whereIn('id', $matchingSessionIds);
        }

        $sessions = $sessionsQuery
            ->orderBy('started_at')
            ->get();
        $sessionIds = $sessions->pluck('id');

        $pageViewsQuery = AnalyticsPageView::query()
            ->whereIn('analytics_session_id', $sessionIds)
            ->whereBetween('occurred_at', [$start, $end]);
        $eventsQuery = AnalyticsEvent::query()
            ->whereIn('analytics_session_id', $sessionIds)
            ->whereBetween('occurred_at', [$start, $end]);

        if ($pageTypes !== null) {
            $pageViewsQuery->whereIn('page_type', $pageTypes);
            $eventsQuery->whereIn('page_type', $pageTypes);
        }

        $pageViews = $pageViewsQuery->orderBy('occurred_at')->get();
        $events = $eventsQuery->orderBy('occurred_at')->get();
        $sessionStats = $this->sessionStats($sessions, $pageViews, $events);
        $sessionCount = $sessions->count();
        $bouncedSessions = $sessionStats->where('bounced', true)->count();
        $engagedSessions = $sessionStats->where('engaged', true)->count();

        return Inertia::render('cms/analytics', [
            'filters' => [
                'days' => $days,
                'scope' => $scope,
                'from' => $start->toDateString(),
                'to' => $end->toDateString(),
            ],
            'summary' => [
                'visitors' => $sessions->pluck('visitor_key')->unique()->count(),
                'sessions' => $sessionCount,
                'page_views' => $pageViews->count(),
                'views_per_session' => $this->rate($pageViews->count(), $sessionCount, 2),
                'bounced_sessions' => $bouncedSessions,
                'engaged_sessions' => $engagedSessions,
                'bounce_rate' => $this->rate($bouncedSessions * 100, $sessionCount),
                'engagement_rate' => $this->rate($engagedSessions * 100, $sessionCount),
                'avg_engagement_seconds' => $this->rate($sessionStats->sum('engaged_seconds'), $sessionCount),
                'key_events' => $sessionStats->sum('key_event_count'),
            ],
            'trend' => $this->trend($sessions, $sessionStats, $pageViews, $start, $days),
            'education' => $this->educationSummary($pageViews, $events),
            'top_pages' => $this->topPages($pageViews),
            'project_views' => $this->projectViews($pageViews),
            'sources' => $this->breakdown(
                $sessions,
                fn (AnalyticsSession $session) => $this->sourceLabel($session),
            ),
            'devices' => $this->breakdown(
                $sessions,
                fn (AnalyticsSession $session) => ucfirst($session->device_type ?: 'Unknown'),
            ),
            'events' => $events
                ->groupBy('name')
                ->map(fn (Collection $group, string $name) => [
                    'name' => $name,
                    'label' => $this->eventLabel($name),
                    'count' => $group->count(),
                ])
                ->sortByDesc('count')
                ->values()
                ->all(),
            'freshness' => [
                'last_event_at' => $sessions->max('last_seen_at')?->toIso8601String(),
                'retention_months' => 13,
            ],
            'definitions' => [
                'visitor' => 'Anonymous browser, deduplicated with a locally generated ID stored only as a server-side hash.',
                'session' => 'Activity grouped by a rolling 30-minute inactivity window.',
                'bounce_rate' => 'Sessions with one page view, under 10 active seconds, and no meaningful action.',
                'engagement_rate' => 'Sessions with 10+ active seconds, 2+ page views, or a meaningful action.',
                'engagement_time' => 'Time while the tab is visible and the visitor was recently active.',
            ],
        ]);
    }

    private function trend(
        Collection $sessions,
        Collection $sessionStats,
        Collection $pageViews,
        CarbonImmutable $start,
        int $days,
    ): array {
        $sessionsByDay = $sessions->groupBy(fn (AnalyticsSession $session) => $session->started_at->toDateString());
        $viewsByDay = $pageViews->groupBy(fn (AnalyticsPageView $view) => $view->occurred_at->toDateString());

        return collect(range(0, $days - 1))
            ->map(function (int $offset) use ($start, $sessionsByDay, $sessionStats, $viewsByDay): array {
                $date = $start->addDays($offset);
                $daySessions = $sessionsByDay->get($date->toDateString(), collect());
                $dayViews = $viewsByDay->get($date->toDateString(), collect());
                $engaged = $daySessions->filter(
                    fn (AnalyticsSession $session) => (bool) data_get(
                        $sessionStats->get($session->id),
                        'engaged',
                        false,
                    ),
                )->count();

                return [
                    'date' => $date->toDateString(),
                    'label' => $date->format('M j'),
                    'visitors' => $daySessions->pluck('visitor_key')->unique()->count(),
                    'sessions' => $daySessions->count(),
                    'page_views' => $dayViews->count(),
                    'engaged_sessions' => $engaged,
                ];
            })
            ->all();
    }

    private function sessionStats(
        Collection $sessions,
        Collection $pageViews,
        Collection $events,
    ): Collection {
        $viewsBySession = $pageViews->groupBy('analytics_session_id');
        $eventsBySession = $events->groupBy('analytics_session_id');

        return $sessions->mapWithKeys(function (AnalyticsSession $session) use ($viewsBySession, $eventsBySession): array {
            $sessionViews = $viewsBySession->get($session->id, collect());
            $sessionEvents = $eventsBySession->get($session->id, collect());
            $pageViewCount = $sessionViews->count();
            $engagedSeconds = (int) $sessionViews->sum('engaged_seconds');
            $keyEventCount = $sessionEvents->whereIn('name', self::MEANINGFUL_EVENTS)->count();

            return [$session->id => [
                'engaged_seconds' => $engagedSeconds,
                'key_event_count' => $keyEventCount,
                'bounced' => $pageViewCount === 1 && $engagedSeconds < 10 && $keyEventCount === 0,
                'engaged' => $pageViewCount >= 2 || $engagedSeconds >= 10 || $keyEventCount > 0,
            ]];
        });
    }

    private function educationSummary(Collection $pageViews, Collection $events): array
    {
        return [
            'landing_views' => $pageViews->where('page_type', 'education')->count(),
            'lecture_views' => $pageViews->where('page_type', 'lecture')->count(),
            'video_starts' => $events->where('name', 'video_start')->count(),
            'video_completions' => $events->where('name', 'video_complete')->count(),
            'presentation_opens' => $events->where('name', 'presentation_open')->count(),
            'whatsapp_clicks' => $events->where('name', 'whatsapp_click')->count(),
        ];
    }

    private function topPages(Collection $pageViews): array
    {
        return $pageViews
            ->groupBy('path')
            ->map(function (Collection $views, string $path): array {
                $sample = $views->first();

                return [
                    'path' => $path,
                    'title' => $sample->content_name ?: $sample->title ?: $path,
                    'page_type' => $sample->page_type,
                    'views' => $views->count(),
                    'visitors' => $views->pluck('visitor_key')->unique()->count(),
                    'avg_engagement_seconds' => round((float) $views->avg('engaged_seconds'), 1),
                    'avg_scroll_depth' => round((float) $views->avg('max_scroll_depth'), 1),
                ];
            })
            ->sortByDesc('views')
            ->take(20)
            ->values()
            ->all();
    }

    private function projectViews(Collection $pageViews): array
    {
        $projectViews = $pageViews->where('page_type', 'project');
        $projectIds = $projectViews->pluck('content_id')
            ->filter(fn ($id) => is_numeric($id))
            ->map(fn ($id) => (int) $id)
            ->unique();
        $projectNames = Project::query()
            ->whereIn('id', $projectIds)
            ->pluck('name', 'id');

        return $projectViews
            ->groupBy(fn (AnalyticsPageView $view) => $view->content_id ?: $view->path)
            ->map(function (Collection $views, string $key) use ($projectNames): array {
                $sample = $views->first();
                $projectId = is_numeric($sample->content_id) ? (int) $sample->content_id : null;

                return [
                    'project_id' => $projectId,
                    'name' => $projectNames->get($projectId) ?: $sample->content_name ?: "Project {$key}",
                    'path' => $sample->path,
                    'views' => $views->count(),
                    'visitors' => $views->pluck('visitor_key')->unique()->count(),
                    'avg_engagement_seconds' => round((float) $views->avg('engaged_seconds'), 1),
                    'avg_scroll_depth' => round((float) $views->avg('max_scroll_depth'), 1),
                ];
            })
            ->sortByDesc('views')
            ->values()
            ->all();
    }

    private function breakdown(Collection $items, callable $label): array
    {
        return $items
            ->groupBy($label)
            ->map(fn (Collection $group, string $name) => [
                'label' => $name,
                'count' => $group->count(),
                'percentage' => $this->rate($group->count() * 100, $items->count()),
            ])
            ->sortByDesc('count')
            ->values()
            ->take(10)
            ->all();
    }

    private function sourceLabel(AnalyticsSession $session): string
    {
        if ($session->utm_source) {
            return Str::headline($session->utm_source);
        }

        $host = strtolower((string) $session->referrer_host);

        return match (true) {
            $host === '' => 'Direct / unknown',
            str_contains($host, 'google.') => 'Google',
            str_contains($host, 'facebook.') || str_contains($host, 'fb.') => 'Facebook',
            str_contains($host, 'instagram.') => 'Instagram',
            str_contains($host, 'linkedin.') => 'LinkedIn',
            str_contains($host, 'youtube.') || str_contains($host, 'youtu.be') => 'YouTube',
            str_contains($host, 'whatsapp.') => 'WhatsApp',
            default => $host,
        };
    }

    private function eventLabel(string $name): string
    {
        return match ($name) {
            'navigation_click' => 'Internal navigation',
            'external_link_click' => 'External link',
            'project_outbound_click' => 'Project website visit',
            'whatsapp_click' => 'WhatsApp click',
            'contact_click' => 'Contact click',
            'cta_click' => 'Call-to-action click',
            'presentation_open' => 'Presentation open',
            'video_start' => 'Video start',
            'video_progress' => 'Video milestone',
            'video_complete' => 'Video complete',
            default => Str::headline($name),
        };
    }

    private function rate(int|float $numerator, int|float $denominator, int $precision = 1): float
    {
        return $denominator > 0 ? round($numerator / $denominator, $precision) : 0.0;
    }
}
