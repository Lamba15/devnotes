<?php

namespace App\Http\Controllers;

use App\Actions\Secrets\CreateSecretEntry;
use App\Actions\Secrets\DeleteSecretEntry;
use App\Actions\Secrets\RevealSecretEntry;
use App\Actions\Secrets\UpdateSecretEntry;
use App\Models\Client;
use App\Models\SecretEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientSecretController extends Controller
{
    public function create(Request $request, Client $client): Response
    {
        abort_unless($request->user()->canAccessPlatform(), 403);

        return Inertia::render('clients/secrets/create', [
            'client' => $client->only(['id', 'name']),
        ]);
    }

    public function store(Request $request, Client $client, CreateSecretEntry $createSecretEntry): RedirectResponse
    {
        abort_unless($request->user()->canAccessPlatform(), 403);

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'secret_value' => ['required', 'string'],
        ]);

        $createSecretEntry->handle($request->user(), $client, $validated);

        return to_route('clients.show', $client);
    }

    public function edit(Request $request, Client $client, SecretEntry $secret): Response
    {
        abort_unless($request->user()->canAccessPlatform(), 403);
        abort_unless($secret->secretable_type === Client::class && $secret->secretable_id === $client->id, 404);

        return Inertia::render('clients/secrets/edit', [
            'client' => $client->only(['id', 'name']),
            'secret' => [
                'id' => $secret->id,
                'label' => $secret->label,
                'description' => $secret->description,
            ],
        ]);
    }

    public function update(Request $request, Client $client, SecretEntry $secret, UpdateSecretEntry $updateSecretEntry): RedirectResponse
    {
        abort_unless($request->user()->canAccessPlatform(), 403);
        abort_unless($secret->secretable_type === Client::class && $secret->secretable_id === $client->id, 404);

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'secret_value' => ['nullable', 'string'],
        ]);

        $updateSecretEntry->handle($request->user(), $secret, $validated);

        return to_route('clients.show', $client);
    }

    public function destroy(Request $request, Client $client, SecretEntry $secret, DeleteSecretEntry $deleteSecretEntry): RedirectResponse
    {
        abort_unless($request->user()->canAccessPlatform(), 403);
        abort_unless($secret->secretable_type === Client::class && $secret->secretable_id === $client->id, 404);

        $deleteSecretEntry->handle($request->user(), $secret);

        return to_route('clients.show', $client);
    }

    public function reveal(Request $request, Client $client, SecretEntry $secret, RevealSecretEntry $revealSecretEntry): JsonResponse
    {
        abort_unless($request->user()->canAccessPlatform(), 403);
        abort_unless($secret->secretable_type === Client::class && $secret->secretable_id === $client->id, 404);

        return response()->json([
            'id' => $secret->id,
            'secret_value' => $revealSecretEntry->handle($request->user(), $secret),
        ]);
    }
}
