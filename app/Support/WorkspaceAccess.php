<?php

namespace App\Support;

use App\Models\Board;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class WorkspaceAccess
{
    public function __construct(private readonly User $user) {}

    public static function mainPlatformOwner(): ?User
    {
        return Cache::remember('workspace.main_platform_owner', 60, function (): ?User {
            return User::query()->platformOwners()->first();
        });
    }

    public static function forgetMainPlatformOwnerCache(): void
    {
        Cache::forget('workspace.main_platform_owner');
    }

    public function isPlatformOwner(): bool
    {
        if ($this->user->relationLoaded('clientMemberships')) {
            return $this->user->clientMemberships->isEmpty();
        }

        return ! $this->user->clientMemberships()->exists();
    }

    public function canAccessPlatform(): bool
    {
        return $this->isPlatformOwner();
    }

    public function clientRole(Client $client): ?string
    {
        return $this->clientMembership($client)?->normalizedRole();
    }

    public function belongsToClient(Client $client): bool
    {
        return $this->clientRole($client) !== null;
    }

    public function accessibleClientIds(): Collection
    {
        if ($this->isPlatformOwner()) {
            return collect();
        }

        return $this->user->clientMemberships()->pluck('client_id');
    }

    public function canAccessClient(Client $client): bool
    {
        return $this->isPlatformOwner() || $this->belongsToClient($client);
    }

    public function canManageClient(Client $client): bool
    {
        return $this->isPlatformOwner()
            || in_array($this->clientRole($client), ['owner', 'admin'], true);
    }

    public function canViewMembers(Client $client): bool
    {
        return $this->canManageClient($client)
            || $this->hasMembershipPermission($client, ClientPermissionCatalog::MEMBERS_READ)
            || $this->hasMembershipPermission($client, ClientPermissionCatalog::MEMBERS_WRITE);
    }

    public function canManageMembers(Client $client): bool
    {
        return $this->canManageClient($client)
            || $this->hasMembershipPermission($client, ClientPermissionCatalog::MEMBERS_WRITE);
    }

    public function canViewInternalClientProfile(Client $client): bool
    {
        return $this->isPlatformOwner();
    }

    public function canEditInternalClientProfile(Client $client): bool
    {
        return $this->isPlatformOwner();
    }

    public function hasProjectAccess(Project $project): bool
    {
        if (! $this->canAccessClient($project->client)) {
            return false;
        }

        if ($this->canManageClient($project->client)) {
            return true;
        }

        return $this->hasProjectMembership($project)
            && $this->canReadProjects($project->client);
    }

    public function canCreateProject(Client $client): bool
    {
        return $this->canManageClient($client)
            || $this->hasMembershipPermission($client, ClientPermissionCatalog::PROJECTS_WRITE);
    }

    public function canManageProject(Project $project): bool
    {
        return $this->canManageClient($project->client)
            || ($this->hasProjectMembership($project)
                && $this->hasMembershipPermission($project->client, ClientPermissionCatalog::PROJECTS_WRITE));
    }

    public function canViewIssues(Project $project): bool
    {
        return $this->canManageClient($project->client)
            || ($this->hasProjectMembership($project)
                && $this->hasMembershipPermission($project->client, ClientPermissionCatalog::ISSUES_READ));
    }

    public function canManageIssues(Project $project): bool
    {
        return $this->canManageClient($project->client)
            || ($this->hasProjectMembership($project)
                && $this->hasMembershipPermission($project->client, ClientPermissionCatalog::ISSUES_WRITE));
    }

    public function canViewBoards(Client $client): bool
    {
        return $this->canManageClient($client)
            || $this->hasMembershipPermission($client, ClientPermissionCatalog::BOARDS_READ)
            || $this->hasMembershipPermission($client, ClientPermissionCatalog::BOARDS_WRITE);
    }

    public function canCreateBoard(Project $project): bool
    {
        return $this->canManageClient($project->client)
            || ($this->hasProjectMembership($project)
                && $this->hasMembershipPermission($project->client, ClientPermissionCatalog::BOARDS_WRITE));
    }

    public function canManageBoard(Board $board): bool
    {
        $project = $board->relationLoaded('project') && $board->project !== null
            ? $board->project
            : $board->project()->with('client')->firstOrFail();
        $project->loadMissing('client');

        return $this->canManageClient($project->client)
            || ($this->hasProjectMembership($project)
                && ($this->hasBoardMembership($board) || $this->isBoardCreator($board))
                && $this->hasMembershipPermission($project->client, ClientPermissionCatalog::BOARDS_WRITE));
    }

    public function canViewStatuses(Client $client): bool
    {
        return $this->canManageClient($client)
            || $this->hasMembershipPermission($client, ClientPermissionCatalog::STATUSES_READ)
            || $this->hasMembershipPermission($client, ClientPermissionCatalog::STATUSES_WRITE);
    }

    public function canManageStatuses(Client $client): bool
    {
        return $this->canManageClient($client)
            || $this->hasMembershipPermission($client, ClientPermissionCatalog::STATUSES_WRITE);
    }

    public function canAccessClientFinance(Client $client): bool
    {
        return $this->canManageClient($client)
            || $this->hasMembershipPermission($client, ClientPermissionCatalog::FINANCE_READ)
            || $this->hasMembershipPermission($client, ClientPermissionCatalog::FINANCE_WRITE);
    }

    public function canManageClientFinance(Client $client): bool
    {
        return $this->canManageClient($client)
            || $this->hasMembershipPermission($client, ClientPermissionCatalog::FINANCE_WRITE);
    }

    public function canAccessProjectFinance(Project $project): bool
    {
        return $this->canAccessClientFinance($project->client)
            && ($this->canManageClient($project->client) || $this->hasProjectMembership($project));
    }

    public function canManageProjectFinance(Project $project): bool
    {
        return $this->canManageClientFinance($project->client)
            && ($this->canManageClient($project->client) || $this->hasProjectMembership($project));
    }

    public function scopeAccessibleFinanceProjects(Builder $query): Builder
    {
        if ($this->isPlatformOwner()) {
            return $query;
        }

        $adminClientIds = $this->user->clientMemberships()
            ->get()
            ->filter(fn (ClientMembership $membership) => in_array($membership->normalizedRole(), ['owner', 'admin'], true))
            ->pluck('client_id');
        $memberClientIds = $this->user->clientMemberships()
            ->with('permissions')
            ->get()
            ->filter(fn (ClientMembership $membership) => $membership->normalizedRole() === 'member'
                && in_array(ClientPermissionCatalog::FINANCE_READ, $membership->permissionNames(), true))
            ->pluck('client_id');

        if ($adminClientIds->isEmpty() && $memberClientIds->isEmpty()) {
            return $query->whereRaw('0 = 1');
        }

        return $query->where(function (Builder $financeQuery) use ($adminClientIds, $memberClientIds): void {
            if ($adminClientIds->isNotEmpty()) {
                $financeQuery->whereIn('client_id', $adminClientIds);
            }

            if ($memberClientIds->isNotEmpty()) {
                $method = $adminClientIds->isNotEmpty() ? 'orWhere' : 'where';

                $financeQuery->{$method}(function (Builder $flaggedQuery) use ($memberClientIds): void {
                    $flaggedQuery->whereIn('client_id', $memberClientIds)
                        ->whereHas('memberships', fn (Builder $membershipQuery) => $membershipQuery->where('user_id', $this->user->id));
                });
            }
        });
    }

    public function scopeAccessibleBoards(Builder $query, Client $client): Builder
    {
        if (! $this->canViewBoards($client)) {
            return $query->whereRaw('0 = 1');
        }

        $query->whereHas('project', function (Builder $projectQuery) use ($client): void {
            $projectQuery->where('client_id', $client->id);

            if (! $this->canManageClient($client)) {
                $projectQuery->whereHas('memberships', fn (Builder $membershipQuery) => $membershipQuery->where('user_id', $this->user->id));
            }
        });

        if ($this->canManageClient($client)) {
            return $query;
        }

        return $query->where(function (Builder $accessQuery): void {
            $accessQuery->whereHas('memberships', fn (Builder $membershipQuery) => $membershipQuery->where('user_id', $this->user->id))
                ->orWhere('created_by', $this->user->id);
        });
    }

    public function canAccessBoard(Board $board): bool
    {
        $project = $board->relationLoaded('project') && $board->project !== null
            ? $board->project
            : $board->project()->with('client')->firstOrFail();
        $project->loadMissing('client');

        if ($this->canManageClient($project->client)) {
            return true;
        }

        if (! $this->hasProjectMembership($project)) {
            return false;
        }

        if (! $this->hasMembershipPermission($project->client, ClientPermissionCatalog::BOARDS_READ)
            && ! $this->hasMembershipPermission($project->client, ClientPermissionCatalog::BOARDS_WRITE)) {
            return false;
        }

        return $this->hasBoardMembership($board) || $this->isBoardCreator($board);
    }

    public function canMoveIssueOnBoard(Board $board): bool
    {
        return $this->canManageBoard($board);
    }

    public function canCommentOnIssue(Issue $issue): bool
    {
        $project = $issue->project()->with('client')->firstOrFail();

        if ($this->canManageClient($project->client)) {
            return true;
        }

        if (! $this->hasProjectMembership($project)) {
            return false;
        }

        return $this->hasMembershipPermission($project->client, ClientPermissionCatalog::ISSUES_WRITE);
    }

    public function canUseAssistant(): bool
    {
        if ($this->isPlatformOwner()) {
            return true;
        }

        if ($this->user->ai_credits !== -1 && $this->user->ai_credits <= $this->user->ai_credits_used) {
            return false;
        }

        return $this->user->clientMemberships()
            ->with('permissions')
            ->get()
            ->contains(function (ClientMembership $membership): bool {
                return in_array($membership->normalizedRole(), ['owner', 'admin'], true)
                    || in_array(ClientPermissionCatalog::ASSISTANT_USE, $membership->permissionNames(), true);
            });
    }

    public function canAccessAssistantDebug(): bool
    {
        return $this->isPlatformOwner()
            || $this->user->clientMemberships()
                ->get()
                ->contains(fn (ClientMembership $membership) => in_array($membership->normalizedRole(), ['owner', 'admin'], true));
    }

    public function capabilities(): array
    {
        return [
            'platform' => $this->canAccessPlatform(),
            'assistant_debug' => $this->canAccessAssistantDebug(),
            'create_clients' => $this->canAccessPlatform(),
            'manage_client_tags' => $this->canAccessPlatform(),
            'manage_finance' => $this->canAccessPlatform(),
            'manage_tracking' => $this->canAccessPlatform(),
            'manage_cms' => $this->canAccessPlatform(),
            'manage_internal_client_profile' => $this->canAccessPlatform(),
            'use_assistant' => $this->canUseAssistant(),
        ];
    }

    public function clientPermissionNames(Client $client): array
    {
        return $this->clientMembership($client)?->permissionNames() ?? [];
    }

    private function clientMembership(Client $client): ?ClientMembership
    {
        if ($this->user->relationLoaded('clientMemberships')) {
            /** @var ClientMembership|null $membership */
            $membership = $this->user->clientMemberships->firstWhere('client_id', $client->id);

            return $membership;
        }

        return $this->user->clientMemberships()
            ->with('permissions')
            ->where('client_id', $client->id)
            ->first();
    }

    private function canReadProjects(Client $client): bool
    {
        return $this->canManageClient($client)
            || $this->hasMembershipPermission($client, ClientPermissionCatalog::PROJECTS_READ)
            || $this->hasMembershipPermission($client, ClientPermissionCatalog::PROJECTS_WRITE);
    }

    private function hasMembershipPermission(Client $client, string $permission): bool
    {
        $membership = $this->clientMembership($client);

        if (! $membership || $membership->normalizedRole() !== 'member') {
            return false;
        }

        return in_array($permission, $membership->permissionNames(), true);
    }

    private function hasProjectMembership(Project $project): bool
    {
        return $this->user->projectMemberships()
            ->where('project_id', $project->id)
            ->exists();
    }

    private function hasBoardMembership(Board $board): bool
    {
        return $this->user->boardMemberships()
            ->where('board_id', $board->id)
            ->exists();
    }

    private function isBoardCreator(Board $board): bool
    {
        return $board->created_by !== null && $board->created_by === $this->user->id;
    }
}
