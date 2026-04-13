<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $portalMembership = $user && ! $user->isPlatformOwner()
            ? $user->clientMemberships()
                ->with(['client:id,name', 'permissions'])
                ->orderBy('id')
                ->first()
            : null;

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user ? [
                    ...$user->toArray(),
                    'capabilities' => $user->workspaceAccess()->capabilities(),
                    'portal_context' => $user->isPlatformOwner()
                        ? null
                        : [
                            'client_id' => $portalMembership?->client_id,
                            'client_name' => $portalMembership?->client?->name,
                            'role' => $portalMembership?->normalizedRole(),
                            'permissions' => $portalMembership?->permissionNames() ?? [],
                            'can_access_finance' => $portalMembership
                                ? $user->canAccessClientFinance($portalMembership->client)
                                : false,
                            'can_view_members' => $portalMembership
                                ? $user->canViewMembers($portalMembership->client)
                                : false,
                            'can_manage_members' => $portalMembership
                                ? $user->canManageMembers($portalMembership->client)
                                : false,
                        ],
                ] : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
