<?php

namespace App\Support;

use App\Models\Board;
use App\Models\Client;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class WorkspaceAccess
{
    public function __construct(private readonly User $user) {}

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
        if ($this->user->relationLoaded('clientMemberships')) {
            return $this->user->clientMemberships
                ->firstWhere('client_id', $client->id)
                ?->role;
        }

        return $this->user->clientMemberships()
            ->where('client_id', $client->id)
            ->value('role');
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

        return $this->user->projectMemberships()
            ->where('project_id', $project->id)
            ->exists();
    }

    public function canManageProject(Project $project): bool
    {
        return $this->canManageClient($project->client);
    }

    public function scopeAccessibleBoards(Builder $query, Client $client): Builder
    {
        if (! $this->canAccessClient($client)) {
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

        $role = $this->clientRole($client);

        if ($role === 'viewer') {
            return $query;
        }

        if ($role !== 'member') {
            return $query->whereRaw('0 = 1');
        }

        return $query->whereHas('memberships', fn (Builder $membershipQuery) => $membershipQuery->where('user_id', $this->user->id));
    }

    public function canAccessBoard(Board $board): bool
    {
        $project = $board->project()->with('client')->firstOrFail();

        if ($this->canManageProject($project)) {
            return true;
        }

        if (! $this->hasProjectAccess($project)) {
            return false;
        }

        $role = $this->clientRole($project->client);

        if ($role === 'viewer') {
            return true;
        }

        if ($role !== 'member') {
            return false;
        }

        return $this->user->boardMemberships()
            ->where('board_id', $board->id)
            ->exists();
    }

    public function canMoveIssueOnBoard(Board $board): bool
    {
        $project = $board->project()->with('client')->firstOrFail();

        if ($this->canManageProject($project)) {
            return true;
        }

        if (! $this->hasProjectAccess($project)) {
            return false;
        }

        return $this->clientRole($project->client) === 'member'
            && $this->user->boardMemberships()->where('board_id', $board->id)->exists();
    }

    public function canCommentOnIssue(Issue $issue): bool
    {
        $project = $issue->project()->with('client')->firstOrFail();

        if ($this->canManageProject($project)) {
            return true;
        }

        if (! $this->hasProjectAccess($project)) {
            return false;
        }

        return $this->clientRole($project->client) === 'member';
    }

    public function canAccessAssistantDebug(): bool
    {
        return $this->isPlatformOwner()
            || $this->user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists();
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
        ];
    }
}
