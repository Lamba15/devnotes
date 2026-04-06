<?php

namespace App\Http\Controllers;

use App\Actions\Projects\CreateProject;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(Request $request, Client $client): Response
    {
        $user = $request->user();

        abort_unless($user->canAccessClient($client), 403);

        $projects = Project::query()
            ->with('status:id,name,slug')
            ->whereBelongsTo($client);

        if (! $user->canManageClient($client)) {
            $projects->whereHas('memberships', fn ($query) => $query->where('user_id', $user->id));
        }

        return Inertia::render('projects/index', [
            'client' => $client->only(['id', 'name']),
            'projects' => $projects->latest()->get(),
            'statuses' => ProjectStatus::query()
                ->where(function ($query) use ($client): void {
                    $query->whereNull('client_id')
                        ->orWhere('client_id', $client->id);
                })
                ->orderBy('name')
                ->get(['id', 'name', 'slug']),
            'can_create_projects' => $user->canManageClient($client),
        ]);
    }

    public function store(Request $request, Client $client, CreateProject $createProject): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'status_id' => ['required', 'integer', 'exists:project_statuses,id'],
            'description' => ['nullable', 'string'],
        ]);

        $createProject->handle($request->user(), $client, $validated);

        return to_route('clients.projects.index', $client);
    }
}
