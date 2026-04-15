<?php

namespace App\Http\Controllers;

use App\Actions\Projects\CreateProject;
use App\Actions\Projects\DeleteProject;
use App\Actions\Projects\UpdateProject;
use App\Models\AuditLog;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\Skill;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function all(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:name,client_name,description,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        $projects = Project::query()
            ->with(['client:id,name', 'status:id,name,slug'])
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($projectQuery) use ($search): void {
                    $projectQuery->where('projects.name', 'like', "%{$search}%")
                        ->orWhere('projects.description', 'like', "%{$search}%")
                        ->orWhereHas('client', fn ($clientQuery) => $clientQuery->where('name', 'like', "%{$search}%"));
                });
            });

        $paginatedProjects = match ($sortBy) {
            'client_name' => $projects
                ->orderBy(
                    Client::query()
                        ->select('name')
                        ->whereColumn('clients.id', 'projects.client_id'),
                    $sortDirection,
                )
                ->paginate(15)
                ->withQueryString(),
            default => $projects
                ->orderBy("projects.{$sortBy}", $sortDirection)
                ->paginate(15)
                ->withQueryString(),
        };

        return Inertia::render('projects/all', [
            'projects' => collect($paginatedProjects->items())
                ->map(fn (Project $project) => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'description' => $project->description,
                    'image_path' => $project->image_path,
                    'status' => $project->status?->only(['id', 'name', 'slug']),
                    'client' => $project->client?->only(['id', 'name']),
                ])
                ->all(),
            'pagination' => [
                'current_page' => $paginatedProjects->currentPage(),
                'last_page' => $paginatedProjects->lastPage(),
                'per_page' => $paginatedProjects->perPage(),
                'total' => $paginatedProjects->total(),
            ],
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ],
        ]);
    }

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
            'skills' => Skill::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function edit(Request $request, Client $client, Project $project): Response
    {
        $user = $request->user();

        abort_unless($user->canManageClient($client), 403);
        abort_unless($project->client_id === $client->id, 404);

        $project->load(['skills:id,name', 'links', 'gitRepos']);

        return Inertia::render('projects/edit', [
            'client' => $client->only(['id', 'name']),
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'markdown_description' => $project->markdown_description,
                'hosting' => $project->hosting,
                'status_id' => $project->status_id,
                'budget' => $project->budget,
                'currency' => $project->currency,
                'image_path' => $project->image_path,
                'skills' => $project->skills->map(fn (Skill $skill) => ['id' => $skill->id, 'name' => $skill->name])->all(),
                'links' => $project->links->map(fn ($link) => [
                    'id' => $link->id,
                    'label' => $link->label,
                    'url' => $link->url,
                    'position' => $link->position,
                ])->all(),
                'git_repos' => $project->gitRepos->map(fn ($repo) => [
                    'id' => $repo->id,
                    'name' => $repo->name,
                    'repo_url' => $repo->repo_url,
                    'wakatime_badge_url' => $repo->wakatime_badge_url,
                    'position' => $repo->position,
                ])->all(),
            ],
            'statuses' => ProjectStatus::query()
                ->where(function ($query) use ($client): void {
                    $query->whereNull('client_id')
                        ->orWhere('client_id', $client->id);
                })
                ->orderBy('name')
                ->get(['id', 'name', 'slug']),
            'skills' => Skill::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(Request $request, Client $client, Project $project): Response
    {
        $user = $request->user();

        abort_unless($project->client_id === $client->id, 404);
        abort_unless($user->hasProjectAccess($project), 403);

        $project->load(['status:id,name,slug', 'skills:id,name', 'links', 'gitRepos']);

        return Inertia::render('projects/show', [
            'client' => $client->only(['id', 'name']),
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'markdown_description' => $project->markdown_description,
                'hosting' => $project->hosting,
                'status' => $project->status?->only(['id', 'name', 'slug']),
                'budget' => $project->budget,
                'currency' => $project->currency,
                'image_path' => $project->image_path,
                'skills' => $project->skills->map(fn (Skill $skill) => ['id' => $skill->id, 'name' => $skill->name])->all(),
                'links' => $project->links->map(fn ($link) => [
                    'id' => $link->id,
                    'label' => $link->label,
                    'url' => $link->url,
                ])->all(),
                'git_repos' => $project->gitRepos->map(fn ($repo) => [
                    'id' => $repo->id,
                    'name' => $repo->name,
                    'repo_url' => $repo->repo_url,
                    'wakatime_badge_url' => $repo->wakatime_badge_url,
                ])->all(),
            ],
            'secrets' => $user->canAccessPlatform()
                ? $project->secrets()
                    ->get(['id', 'label', 'description', 'updated_at'])
                    ->map(fn ($secret) => [
                        'id' => $secret->id,
                        'label' => $secret->label,
                        'description' => $secret->description,
                        'updated_at' => $secret->updated_at?->toISOString(),
                    ])
                    ->all()
                : [],
            'summary' => [
                'issues_count' => $project->issues()->count(),
                'boards_count' => $project->boards()->count(),
            ],
            'can_manage_project' => $user->canManageProject($project),
            'can_manage_secrets' => $user->canAccessPlatform(),
        ]);
    }

    public function index(Request $request, Client $client): Response
    {
        $user = $request->user();
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:name,description,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'status' => ['array'],
            'status.*' => ['string', 'max:255'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';
        $statusFilter = collect(Arr::wrap($request->input('status')))
            ->filter(fn ($value) => is_scalar($value))
            ->map(fn ($value) => trim((string) $value))
            ->filter()
            ->unique()
            ->values()
            ->all();

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

        if ($statusFilter !== []) {
            $projects->whereHas('status', fn ($query) => $query->whereIn('slug', $statusFilter));
        }

        $paginatedProjects = $projects
            ->orderBy($sortBy, $sortDirection)
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('projects/index', [
            'client' => $client->only(['id', 'name']),
            'projects' => collect($paginatedProjects->items())
                ->map(fn (Project $project) => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'description' => $project->description,
                    'image_path' => $project->image_path,
                    'status' => $project->status?->only(['id', 'name', 'slug']),
                ])
                ->all(),
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
            'status_filter_options' => ProjectStatus::query()
                ->where(function ($query) use ($client): void {
                    $query->whereNull('client_id')
                        ->orWhere('client_id', $client->id);
                })
                ->orderBy('name')
                ->get(['name', 'slug'])
                ->map(fn (ProjectStatus $status) => [
                    'label' => $status->name,
                    'value' => $status->slug,
                ])
                ->all(),
            'can_create_projects' => $user->canManageClient($client),
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
                'status' => $statusFilter,
            ],
        ]);
    }

    public function store(Request $request, Client $client, CreateProject $createProject): RedirectResponse
    {
        $validated = $request->validate(self::projectValidationRules());

        $createProject->handle($request->user(), $client, $validated);

        return to_route('clients.projects.index', $client);
    }

    public function update(Request $request, Client $client, Project $project, UpdateProject $updateProject): RedirectResponse
    {
        abort_unless($project->client_id === $client->id, 404);

        $validated = $request->validate(self::projectValidationRules());

        $updateProject->handle($request->user(), $project, $validated);

        return to_route('clients.projects.index', $client);
    }

    /**
     * @return array<string, array<int, string>>
     */
    private static function projectValidationRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'status_id' => ['required', 'integer', 'exists:project_statuses,id'],
            'description' => ['nullable', 'string'],
            'markdown_description' => ['nullable', 'string'],
            'hosting' => ['nullable', 'string', 'max:255'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'skills' => ['nullable', 'array'],
            'skills.*' => ['nullable'],
            'links' => ['nullable', 'array'],
            'links.*.label' => ['nullable', 'string', 'max:255'],
            'links.*.url' => ['required_with:links.*', 'string', 'max:2048'],
            'git_repos' => ['nullable', 'array'],
            'git_repos.*.name' => ['required_with:git_repos.*', 'string', 'max:255'],
            'git_repos.*.repo_url' => ['required_with:git_repos.*', 'string', 'max:2048'],
            'git_repos.*.wakatime_badge_url' => ['nullable', 'string', 'max:2048'],
        ];
    }

    public function destroy(Request $request, Client $client, Project $project, DeleteProject $deleteProject): RedirectResponse
    {
        abort_unless($project->client_id === $client->id, 404);

        $deleteProject->handle($request->user(), $project);

        return to_route('clients.projects.index', $client);
    }

    public function uploadImage(Request $request, Client $client, Project $project): RedirectResponse
    {
        abort_unless($project->client_id === $client->id, 404);
        abort_unless($request->user()->canManageProject($project), 403);

        $request->validate([
            'image' => ['required', 'image', 'max:2048'],
        ]);

        if ($project->image_path) {
            Storage::disk('public')->delete($project->image_path);
        }

        $path = $request->file('image')->store('projects', 'public');
        $project->update(['image_path' => $path]);

        AuditLog::query()->create([
            'user_id' => $request->user()->id,
            'event' => 'project.image_uploaded',
            'source' => 'web',
            'subject_type' => Project::class,
            'subject_id' => $project->id,
        ]);

        return back();
    }

    public function removeImage(Request $request, Client $client, Project $project): RedirectResponse
    {
        abort_unless($project->client_id === $client->id, 404);
        abort_unless($request->user()->canManageProject($project), 403);

        if ($project->image_path) {
            Storage::disk('public')->delete($project->image_path);
            $project->update(['image_path' => null]);

            AuditLog::query()->create([
                'user_id' => $request->user()->id,
                'event' => 'project.image_removed',
                'source' => 'web',
                'subject_type' => Project::class,
                'subject_id' => $project->id,
            ]);
        }

        return back();
    }
}
