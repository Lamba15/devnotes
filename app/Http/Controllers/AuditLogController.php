<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Client;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Inertia\Inertia;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $event = $this->filterValues($request, 'event');
        $source = $this->filterValues($request, 'source');
        $userIds = $this->filterValues($request, 'user_id');
        $subjectTypes = $this->filterValues($request, 'subject_type');
        $clientIds = $this->filterValues($request, 'client_id');
        $query = AuditLog::query()
            ->with('user:id,name,email')
            ->orderByDesc('created_at');

        $this->applyFilters($query, $request);

        $paginated = $query->paginate(8);
        $logs = $paginated->items();
        $pagination = [
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ];

        return Inertia::render('audit-logs/index', [
            'logs' => $logs,
            'pagination' => $pagination,
            'filters' => [
                'search' => $request->input('search', ''),
                'event' => $event,
                'source' => $source,
                'user_id' => $userIds,
                'subject_type' => $subjectTypes,
                'client_id' => $clientIds,
            ],
            'event_options' => $this->eventOptions($request),
            'source_options' => $this->sourceOptions($request),
            'user_options' => $this->userOptions($request),
            'subject_type_options' => $this->subjectTypeOptions($request),
            'client_options' => $this->clientOptions($request),
        ]);
    }

    private function applyFilters(Builder $query, Request $request, ?string $exclude = null): void
    {
        if ($exclude !== 'search' && ($search = $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('event', 'like', "%{$search}%")
                    ->orWhere('source', 'like', "%{$search}%")
                    ->orWhere('subject_type', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        if ($exclude !== 'event' && ($event = $this->filterValues($request, 'event')) !== []) {
            $query->whereIn('event', $event);
        }

        if ($exclude !== 'source' && ($source = $this->filterValues($request, 'source')) !== []) {
            $query->whereIn('source', $source);
        }

        if ($exclude !== 'user_id' && ($userIds = $this->filterValues($request, 'user_id')) !== []) {
            $query->whereIn('user_id', array_map('intval', $userIds));
        }

        if ($exclude !== 'subject_type' && ($subjectTypes = $this->filterValues($request, 'subject_type')) !== []) {
            $query->whereIn('subject_type', $subjectTypes);
        }

        if ($exclude !== 'client_id' && ($clientIds = $this->filterValues($request, 'client_id')) !== []) {
            $normalizedClientIds = array_map('intval', $clientIds);

            $query->where(function ($q) use ($normalizedClientIds) {
                $q->where(function ($q2) use ($normalizedClientIds) {
                    $q2->where('subject_type', Client::class)
                        ->whereIn('subject_id', $normalizedClientIds);
                });

                foreach ($normalizedClientIds as $clientId) {
                    $q->orWhereJsonContains('metadata_json->client_id', $clientId);
                }
            });
        }
    }

    private function scopedQuery(Request $request, string $excludeFilter): Builder
    {
        $query = AuditLog::query();
        $this->applyFilters($query, $request, $excludeFilter);

        return $query;
    }

    private function eventOptions(Request $request): array
    {
        return $this->scopedQuery($request, 'event')
            ->select('event')
            ->whereNotNull('event')
            ->where('event', '!=', '')
            ->distinct()
            ->orderBy('event')
            ->pluck('event')
            ->all();
    }

    private function sourceOptions(Request $request): array
    {
        return $this->scopedQuery($request, 'source')
            ->select('source')
            ->whereNotNull('source')
            ->where('source', '!=', '')
            ->distinct()
            ->orderBy('source')
            ->pluck('source')
            ->all();
    }

    private function userOptions(Request $request): array
    {
        $userIds = $this->scopedQuery($request, 'user_id')
            ->select('user_id')
            ->whereNotNull('user_id')
            ->distinct();

        return User::query()
            ->whereIn('id', $userIds)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])
            ->all();
    }

    private function subjectTypeOptions(Request $request): array
    {
        return $this->scopedQuery($request, 'subject_type')
            ->select('subject_type')
            ->whereNotNull('subject_type')
            ->where('subject_type', '!=', '')
            ->distinct()
            ->orderBy('subject_type')
            ->pluck('subject_type')
            ->map(fn ($t) => ['value' => $t, 'label' => class_basename($t)])
            ->all();
    }

    private function clientOptions(Request $request): array
    {
        $scoped = $this->scopedQuery($request, 'client_id');

        // Collect client IDs from direct Client subjects
        $directIds = (clone $scoped)
            ->where('subject_type', Client::class)
            ->whereNotNull('subject_id')
            ->distinct()
            ->pluck('subject_id');

        // Collect client IDs stored in metadata_json->client_id
        $metaIds = (clone $scoped)
            ->whereNotNull('metadata_json')
            ->whereRaw("json_extract(metadata_json, '$.client_id') is not null")
            ->selectRaw("json_extract(metadata_json, '$.client_id') as cid")
            ->distinct()
            ->pluck('cid');

        $allIds = $directIds->merge($metaIds)->unique()->filter();

        return Client::query()
            ->whereIn('id', $allIds)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])
            ->all();
    }

    private function filterValues(Request $request, string $key): array
    {
        return collect(Arr::wrap($request->input($key)))
            ->filter(fn ($value) => is_scalar($value))
            ->map(fn ($value) => trim((string) $value))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
