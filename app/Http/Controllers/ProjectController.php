<?php

namespace App\Http\Controllers;

use App\Actions\Projects\CreateProject;
use App\Actions\Projects\DeleteProject;
use App\Actions\Projects\UpdateProject;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function create(Request $request, Client $client): Response
    {
        $user = $request->user();

        abort_unless($user->canAccessClient($client), 403);

        return Inertia::render('projects/create', [
            'client' => $client->only(['id', 'name']),
            'statuses' => ProjectStatus::query()
                ->where(function ($query) use ($client): void {
                    $query->whereNull('client_id')
                        ->orWhere('client_id', $client->id);
                })
                ->orderBy('name')
                ->get(['id', 'name', 'slug']),
        ]);
    }

    public function edit(Request $request, Client $client, Project $project): Response
    {
        $user = $request->user();

        abort_unless($user->canManageClient($client), 403);
        abort_unless($project->client_id === $client->id, 404);

        return Inertia::render('projects/edit', [
            'client' => $client->only(['id', 'name']),
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'status_id' => $project->status_id,
                'budget' => $project->budget,
                'currency' => $project->currency,
            ],
            'statuses' => ProjectStatus::query()
                ->where(function ($query) use ($client): void {
                    $query->whereNull('client_id')
                        ->orWhere('client_id', $client->id);
                })
                ->orderBy('name')
                ->get(['id', 'name', 'slug']),
        ]);
    }

    public function show(Request $request, Client $client, Project $project): Response
    {
        $user = $request->user();

        abort_unless($project->client_id === $client->id, 404);
        abort_unless($user->hasProjectAccess($project), 403);

        $project->load('status:id,name,slug');

        return Inertia::render('projects/show', [
            'client' => $client->only(['id', 'name']),
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'status' => $project->status?->only(['id', 'name', 'slug']),
                'budget' => $project->budget,
                'currency' => $project->currency,
            ],
            'summary' => [
                'issues_count' => $project->issues()->count(),
                'boards_count' => $project->boards()->count(),
            ],
            'can_manage_project' => $user->canManageProject($project),
        ]);
    }

    public function index(Request $request, Client $client): Response
    {
        $user = $request->user();
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:name,description,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        abort_unless($user->canAccessClient($client), 403);

        $projects = Project::query()
            ->with('status:id,name,slug')
            ->whereBelongsTo($client);

        if (! $user->canManageClient($client)) {
            $projects->whereHas('memberships', fn ($query) => $query->where('user_id', $user->id));
        }

        if ($search !== '') {
            $projects->where(function ($query) use ($search): void {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $paginatedProjects = $projects
            ->orderBy($sortBy, $sortDirection)
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('projects/index', [
            'client' => $client->only(['id', 'name']),
            'projects' => $paginatedProjects->items(),
            'pagination' => [
                'current_page' => $paginatedProjects->currentPage(),
                'last_page' => $paginatedProjects->lastPage(),
                'per_page' => $paginatedProjects->perPage(),
                'total' => $paginatedProjects->total(),
            ],
            'statuses' => ProjectStatus::query()
                ->where(function ($query) use ($client): void {
                    $query->whereNull('client_id')
                        ->orWhere('client_id', $client->id);
                })
                ->orderBy('name')
                ->get(['id', 'name', 'slug']),
            'can_create_projects' => $user->canManageClient($client),
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ],
        ]);
    }

    public function store(Request $request, Client $client, CreateProject $createProject): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'status_id' => ['required', 'integer', 'exists:project_statuses,id'],
            'description' => ['nullable', 'string'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        $createProject->handle($request->user(), $client, $validated);

        return to_route('clients.projects.index', $client);
    }

    public function update(Request $request, Client $client, Project $project, UpdateProject $updateProject): RedirectResponse
    {
        abort_unless($project->client_id === $client->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'status_id' => ['required', 'integer', 'exists:project_statuses,id'],
            'description' => ['nullable', 'string'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        $updateProject->handle($request->user(), $project, $validated);

        return to_route('clients.projects.index', $client);
    }

    public function destroy(Request $request, Client $client, Project $project, DeleteProject $deleteProject): RedirectResponse
    {
        abort_unless($project->client_id === $client->id, 404);

        $deleteProject->handle($request->user(), $project);

        return to_route('clients.projects.index', $client);
    }
}
