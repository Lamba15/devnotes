<?php

namespace App\Http\Controllers;

use App\Actions\Clients\CreateClientUser;
use App\Models\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientMembershipController extends Controller
{
    private const ROLES = ['owner', 'admin', 'member', 'viewer'];

    public function index(Client $client): Response
    {
        return Inertia::render('clients/members/index', [
            'client' => $client->only(['id', 'name']),
            'memberships' => $client->memberships()
                ->with('user:id,name,email,email_verified_at')
                ->latest()
                ->get()
                ->map(fn ($membership) => [
                    'id' => $membership->id,
                    'role' => $membership->role,
                    'created_at' => $membership->created_at?->toISOString(),
                    'user' => [
                        'id' => $membership->user->id,
                        'name' => $membership->user->name,
                        'email' => $membership->user->email,
                        'email_verified_at' => $membership->user->email_verified_at?->toISOString(),
                    ],
                ]),
            'roles' => collect(self::ROLES)->map(fn (string $role) => [
                'label' => ucfirst($role),
                'value' => $role,
            ])->all(),
        ]);
    }

    public function store(
        Request $request,
        Client $client,
        CreateClientUser $createClientUser,
    ): RedirectResponse {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:'.implode(',', self::ROLES)],
        ]);

        $createClientUser->handle($request->user(), $client, $validated);

        return to_route('clients.members.index', $client);
    }
}
