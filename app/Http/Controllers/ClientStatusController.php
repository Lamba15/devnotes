<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ProjectStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientStatusController extends Controller
{
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

        ProjectStatus::query()->create([
            'client_id' => $client->id,
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'is_system' => false,
        ]);

        return to_route('clients.statuses.index', $client);
    }

    public function edit(Request $request, Client $client, ProjectStatus $status): Response
    {
        abort_unless($request->user()->canManageClient($client), 403);
        abort_unless($status->client_id === $client->id, 404);

        return Inertia::render('clients/statuses-edit', [
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

        $status->update($validated);

        return to_route('clients.statuses.index', $client);
    }

    public function destroy(Request $request, Client $client, ProjectStatus $status): RedirectResponse
    {
        abort_unless($request->user()->canManageClient($client), 403);
        abort_unless($status->client_id === $client->id, 404);

        $status->delete();

        return to_route('clients.statuses.index', $client);
    }
}
