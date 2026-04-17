<?php

namespace App\Http\Controllers;

use App\Actions\Secrets\CreateSecretEntry;
use App\Actions\Secrets\DeleteSecretEntry;
use App\Actions\Secrets\RevealSecretEntry;
use App\Actions\Secrets\UpdateSecretEntry;
use App\Http\Concerns\BuildsBreadcrumbs;
use App\Models\Client;
use App\Models\Project;
use App\Models\SecretEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectSecretController extends Controller
{
    use BuildsBreadcrumbs;

    public function create(Request $request, Client $client, Project $project): Response
    {
        abort_unless($request->user()->canAccessPlatform(), 403);
        abort_unless($project->client_id === $client->id, 404);

        return Inertia::render('projects/secrets/create', [
            'breadcrumbs' => $this->breadcrumbs(
                $this->clientsCrumb(),
                $this->clientCrumb($client),
                $this->projectsCrumb($client),
                $this->projectCrumb($client, $project),
                $this->crumb('New Secret', "/clients/{$client->id}/projects/{$project->id}/secrets/create"),
            ),
            'client' => $client->only(['id', 'name']),
            'project' => $project->only(['id', 'name']),
        ]);
    }

    public function store(Request $request, Client $client, Project $project, CreateSecretEntry $createSecretEntry): RedirectResponse
    {
        abort_unless($request->user()->canAccessPlatform(), 403);
        abort_unless($project->client_id === $client->id, 404);

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'secret_value' => ['required', 'string'],
        ]);

        $createSecretEntry->handle($request->user(), $project, $validated);

        return to_route('clients.projects.show', [$client, $project]);
    }

    public function edit(Request $request, Client $client, Project $project, SecretEntry $secret): Response
    {
        abort_unless($request->user()->canAccessPlatform(), 403);
        abort_unless($project->client_id === $client->id, 404);
        abort_unless($secret->secretable_type === Project::class && $secret->secretable_id === $project->id, 404);

        return Inertia::render('projects/secrets/edit', [
            'breadcrumbs' => $this->breadcrumbs(
                $this->clientsCrumb(),
                $this->clientCrumb($client),
                $this->projectsCrumb($client),
                $this->projectCrumb($client, $project),
                $this->crumb($secret->label, "/clients/{$client->id}/projects/{$project->id}/secrets/{$secret->id}/edit"),
            ),
            'client' => $client->only(['id', 'name']),
            'project' => $project->only(['id', 'name']),
            'secret' => [
                'id' => $secret->id,
                'label' => $secret->label,
                'description' => $secret->description,
            ],
        ]);
    }

    public function update(Request $request, Client $client, Project $project, SecretEntry $secret, UpdateSecretEntry $updateSecretEntry): RedirectResponse
    {
        abort_unless($request->user()->canAccessPlatform(), 403);
        abort_unless($project->client_id === $client->id, 404);
        abort_unless($secret->secretable_type === Project::class && $secret->secretable_id === $project->id, 404);

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'secret_value' => ['nullable', 'string'],
        ]);

        $updateSecretEntry->handle($request->user(), $secret, $validated);

        return to_route('clients.projects.show', [$client, $project]);
    }

    public function destroy(Request $request, Client $client, Project $project, SecretEntry $secret, DeleteSecretEntry $deleteSecretEntry): RedirectResponse
    {
        abort_unless($request->user()->canAccessPlatform(), 403);
        abort_unless($project->client_id === $client->id, 404);
        abort_unless($secret->secretable_type === Project::class && $secret->secretable_id === $project->id, 404);

        $deleteSecretEntry->handle($request->user(), $secret);

        return to_route('clients.projects.show', [$client, $project]);
    }

    public function reveal(Request $request, Client $client, Project $project, SecretEntry $secret, RevealSecretEntry $revealSecretEntry): JsonResponse
    {
        abort_unless($request->user()->canAccessPlatform(), 403);
        abort_unless($project->client_id === $client->id, 404);
        abort_unless($secret->secretable_type === Project::class && $secret->secretable_id === $project->id, 404);

        return response()->json([
            'id' => $secret->id,
            'secret_value' => $revealSecretEntry->handle($request->user(), $secret),
        ]);
    }
}
