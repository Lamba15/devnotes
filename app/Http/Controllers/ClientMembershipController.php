<?php

namespace App\Http\Controllers;

use App\Actions\Clients\CreateClientUser;
use App\Actions\Clients\DeleteClientMembership;
use App\Actions\Clients\UpdateClientMembership;
use App\Models\Client;
use App\Models\ClientMembership;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientMembershipController extends Controller
{
    private const ROLES = ['owner', 'admin', 'member', 'viewer'];

    public function create(Request $request, Client $client): Response
    {
        abort_unless($request->user()->canAccessClient($client), 403);

        return Inertia::render('clients/members/create', [
            'client' => $client->only(['id', 'name']),
            'roles' => collect(self::ROLES)->map(fn (string $role) => [
                'label' => ucfirst($role),
                'value' => $role,
            ])->all(),
        ]);
    }

    public function edit(Request $request, Client $client, ClientMembership $membership): Response
    {
        abort_unless($request->user()->canManageClient($client), 403);
        abort_unless($membership->client_id === $client->id, 404);

        return Inertia::render('clients/members/edit', [
            'client' => $client->only(['id', 'name']),
            'membership' => [
                'id' => $membership->id,
                'role' => $membership->role,
                'user' => $membership->user->only(['id', 'name', 'email']),
            ],
            'roles' => collect(self::ROLES)->map(fn (string $role) => [
                'label' => ucfirst($role),
                'value' => $role,
            ])->all(),
        ]);
    }

    public function index(Request $request, Client $client): Response
    {
        abort_unless($request->user()->canAccessClient($client), 403);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:name,email,role,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        $query = $client->memberships()
            ->with('user:id,name,email,email_verified_at')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($membershipQuery) use ($search): void {
                    $membershipQuery->where('role', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
                });
            });

        if ($sortBy === 'name' || $sortBy === 'email') {
            $query->join('users', 'users.id', '=', 'client_memberships.user_id')
                ->orderBy("users.{$sortBy}", $sortDirection)
                ->select('client_memberships.*');
        } else {
            $query->orderBy($sortBy, $sortDirection);
        }

        $memberships = $query->paginate(15)->withQueryString();

        return Inertia::render('clients/members/index', [
            'client' => $client->only(['id', 'name']),
            'memberships' => collect($memberships->items())
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
            'pagination' => [
                'current_page' => $memberships->currentPage(),
                'last_page' => $memberships->lastPage(),
                'per_page' => $memberships->perPage(),
                'total' => $memberships->total(),
            ],
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ],
            'roles' => collect(self::ROLES)->map(fn (string $role) => [
                'label' => ucfirst($role),
                'value' => $role,
            ])->all(),
            'can_manage_members' => $request->user()->canManageClient($client),
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

    public function update(Request $request, Client $client, ClientMembership $membership, UpdateClientMembership $updateClientMembership): RedirectResponse
    {
        abort_unless($membership->client_id === $client->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', 'in:'.implode(',', self::ROLES)],
        ]);

        $updateClientMembership->handle($request->user(), $membership, $validated);

        return to_route('clients.members.index', $client);
    }

    public function destroy(Request $request, Client $client, ClientMembership $membership, DeleteClientMembership $deleteClientMembership): RedirectResponse
    {
        abort_unless($membership->client_id === $client->id, 404);

        $deleteClientMembership->handle($request->user(), $membership);

        return to_route('clients.members.index', $client);
    }
}
