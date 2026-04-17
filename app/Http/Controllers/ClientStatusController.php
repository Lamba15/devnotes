<?php

namespace App\Http\Controllers;

use App\Http\Concerns\BuildsBreadcrumbs;
use App\Models\AuditLog;
use App\Models\Client;
use App\Models\ProjectStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientStatusController extends Controller
{
    use BuildsBreadcrumbs;

    public function index(Request $request, Client $client): Response
    {
        abort_unless($request->user()->canAccessClient($client), 403);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:name,slug,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        $statuses = ProjectStatus::query()
            ->where(function ($query) use ($client): void {
                $query->whereNull('client_id')
                    ->orWhere('client_id', $client->id);
            })
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($statusQuery) use ($search): void {
                    $statusQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%");
                });
            })
            ->orderBy($sortBy, $sortDirection)
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('clients/statuses', [
            'breadcrumbs' => $this->breadcrumbs(
                $this->clientsCrumb(),
                $this->clientCrumb($client),
                $this->statusesCrumb($client),
            ),
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'behavior' => $client->behavior?->only(['id', 'name', 'slug']),
            ],
            'statuses' => $statuses->items(),
            'pagination' => [
                'current_page' => $statuses->currentPage(),
                'last_page' => $statuses->lastPage(),
                'per_page' => $statuses->perPage(),
                'total' => $statuses->total(),
            ],
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ],
            'can_manage_statuses' => $request->user()->canManageClient($client),
        ]);
    }

    public function create(Request $request, Client $client): Response
    {
        abort_unless($request->user()->canManageClient($client), 403);

        return Inertia::render('clients/statuses-create', [
            'breadcrumbs' => $this->breadcrumbs(
                $this->clientsCrumb(),
                $this->clientCrumb($client),
                $this->statusesCrumb($client),
                $this->crumb('New Status', "/clients/{$client->id}/statuses/create"),
            ),
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'behavior' => $client->behavior?->only(['id', 'name', 'slug']),
            ],
        ]);
    }

    public function store(Request $request, Client $client): RedirectResponse
    {
        abort_unless($request->user()->canManageClient($client), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:project_statuses,slug'],
        ]);

        $status = ProjectStatus::query()->create([
            'client_id' => $client->id,
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'is_system' => false,
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()->id,
            'event' => 'project_status.created',
            'source' => 'web',
            'subject_type' => ProjectStatus::class,
            'subject_id' => $status->id,
            'after_json' => $status->toArray(),
        ]);

        return to_route('clients.statuses.index', $client);
    }

    public function edit(Request $request, Client $client, ProjectStatus $status): Response
    {
        abort_unless($request->user()->canManageClient($client), 403);
        abort_unless($status->client_id === $client->id, 404);

        return Inertia::render('clients/statuses-edit', [
            'breadcrumbs' => $this->breadcrumbs(
                $this->clientsCrumb(),
                $this->clientCrumb($client),
                $this->statusesCrumb($client),
                $this->crumb($status->name, "/clients/{$client->id}/statuses/{$status->id}/edit"),
            ),
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'behavior' => $client->behavior?->only(['id', 'name', 'slug']),
            ],
            'status' => $status->only(['id', 'name', 'slug']),
        ]);
    }

    public function update(Request $request, Client $client, ProjectStatus $status): RedirectResponse
    {
        abort_unless($request->user()->canManageClient($client), 403);
        abort_unless($status->client_id === $client->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:project_statuses,slug,'.$status->id],
        ]);

        $before = $status->toArray();
        $status->update($validated);

        AuditLog::query()->create([
            'user_id' => $request->user()->id,
            'event' => 'project_status.updated',
            'source' => 'web',
            'subject_type' => ProjectStatus::class,
            'subject_id' => $status->id,
            'before_json' => $before,
            'after_json' => $status->fresh()->toArray(),
        ]);

        return to_route('clients.statuses.index', $client);
    }

    public function destroy(Request $request, Client $client, ProjectStatus $status): RedirectResponse
    {
        abort_unless($request->user()->canManageClient($client), 403);
        abort_unless($status->client_id === $client->id, 404);

        $statusData = $status->toArray();
        $statusId = $status->id;
        $status->delete();

        AuditLog::query()->create([
            'user_id' => $request->user()->id,
            'event' => 'project_status.deleted',
            'source' => 'web',
            'subject_type' => ProjectStatus::class,
            'subject_id' => $statusId,
            'before_json' => $statusData,
        ]);

        return to_route('clients.statuses.index', $client);
    }
}
