<?php

namespace App\Http\Controllers;

use App\Actions\Boards\CreateBoardMembership;
use App\Actions\Boards\DeleteBoardMembership;
use App\Http\Concerns\BuildsBreadcrumbs;
use App\Models\Board;
use App\Models\BoardMembership;
use App\Models\Client;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BoardMembershipController extends Controller
{
    use BuildsBreadcrumbs;

    public function index(Request $request, Client $client, Board $board): Response
    {
        $board->loadMissing('project');

        abort_unless($board->project?->client_id === $client->id, 404);
        abort_unless($request->user()->canAccessBoard($board), 403);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:name,email,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        $query = $board->memberships()
            ->with('user:id,name,email,avatar_path')
            ->when($search !== '', function ($query) use ($search): void {
                $query->whereHas('user', fn ($userQuery) => $userQuery
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"));
            });

        if ($sortBy === 'name' || $sortBy === 'email') {
            $query->join('users', 'users.id', '=', 'board_memberships.user_id')
                ->orderBy("users.{$sortBy}", $sortDirection)
                ->select('board_memberships.*');
        } else {
            $query->orderBy($sortBy, $sortDirection);
        }

        $memberships = $query->paginate(15)->withQueryString();

        return Inertia::render('boards/members/index', [
            'breadcrumbs' => $this->breadcrumbs(
                $this->clientsCrumb(),
                $this->clientCrumb($client),
                $this->boardsCrumb($client),
                $this->crumb($board->name, "/clients/{$client->id}/projects/{$board->project_id}/boards/{$board->id}"),
                $this->crumb('Members', "/clients/{$client->id}/boards/{$board->id}/members"),
            ),
            'client' => $client->only(['id', 'name']),
            'board' => [
                'id' => $board->id,
                'name' => $board->name,
                'project_id' => $board->project_id,
            ],
            'project' => $board->project->only(['id', 'name']),
            'memberships' => collect($memberships->items())
                ->map(fn (BoardMembership $membership) => [
                    'id' => $membership->id,
                    'created_at' => $membership->created_at?->toISOString(),
                    'user' => [
                        'id' => $membership->user->id,
                        'name' => $membership->user->name,
                        'email' => $membership->user->email,
                        'avatar_path' => $membership->user->avatar_path,
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
            'can_manage_members' => $request->user()->canManageProject($board->project) || $request->user()->canManageBoard($board),
        ]);
    }

    public function create(Request $request, Client $client, Board $board): Response
    {
        $board->loadMissing('project');

        abort_unless($board->project?->client_id === $client->id, 404);
        abort_unless(
            $request->user()->canManageProject($board->project) || $request->user()->canManageBoard($board),
            403,
        );

        $eligibleUsers = User::query()
            ->whereHas('clientMemberships', fn ($q) => $q->where('client_id', $client->id))
            ->whereDoesntHave('boardMemberships', fn ($q) => $q->where('board_id', $board->id))
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return Inertia::render('boards/members/create', [
            'breadcrumbs' => $this->breadcrumbs(
                $this->clientsCrumb(),
                $this->clientCrumb($client),
                $this->boardsCrumb($client),
                $this->crumb($board->name, "/clients/{$client->id}/projects/{$board->project_id}/boards/{$board->id}"),
                $this->crumb('Members', "/clients/{$client->id}/boards/{$board->id}/members"),
                $this->crumb('Add Member', "/clients/{$client->id}/boards/{$board->id}/members/create"),
            ),
            'client' => $client->only(['id', 'name']),
            'board' => [
                'id' => $board->id,
                'name' => $board->name,
            ],
            'project' => $board->project->only(['id', 'name']),
            'eligible_users' => $eligibleUsers->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ])->all(),
        ]);
    }

    public function store(
        Request $request,
        Client $client,
        Board $board,
        CreateBoardMembership $createBoardMembership,
    ): RedirectResponse {
        $board->loadMissing('project');

        abort_unless($board->project?->client_id === $client->id, 404);

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $createBoardMembership->handle($request->user(), $board, (int) $validated['user_id']);

        return to_route('clients.boards.members.index', [$client, $board]);
    }

    public function destroy(
        Request $request,
        Client $client,
        Board $board,
        BoardMembership $membership,
        DeleteBoardMembership $deleteBoardMembership,
    ): RedirectResponse {
        $board->loadMissing('project');

        abort_unless($board->project?->client_id === $client->id, 404);
        abort_unless($membership->board_id === $board->id, 404);

        $deleteBoardMembership->handle($request->user(), $membership);

        return to_route('clients.boards.members.index', [$client, $board]);
    }
}
