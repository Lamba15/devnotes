<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable(['name', 'email', 'password', 'email_verified_at', 'openrouter_api_key', 'openrouter_model', 'openrouter_system_prompt'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'openrouter_api_key'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'openrouter_api_key' => 'encrypted',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function assistantThreads(): HasMany
    {
        return $this->hasMany(AssistantThread::class);
    }

    public function clientMemberships(): HasMany
    {
        return $this->hasMany(ClientMembership::class);
    }

    public function projectMemberships(): HasMany
    {
        return $this->hasMany(ProjectMembership::class);
    }

    public function boardMemberships(): HasMany
    {
        return $this->hasMany(BoardMembership::class);
    }

    public function isPlatformOwner(): bool
    {
        if ($this->relationLoaded('clientMemberships')) {
            /** @var Collection<int, ClientMembership> $memberships */
            $memberships = $this->getRelation('clientMemberships');

            return $memberships->isEmpty();
        }

        return ! $this->clientMemberships()->exists();
    }

    public function belongsToClient(Client $client): bool
    {
        return $this->clientRole($client) !== null;
    }

    public function clientRole(Client $client): ?string
    {
        if ($this->relationLoaded('clientMemberships')) {
            /** @var Collection<int, ClientMembership> $memberships */
            $memberships = $this->getRelation('clientMemberships');

            return $memberships
                ->firstWhere('client_id', $client->id)
                ?->role;
        }

        return $this->clientMemberships()
            ->where('client_id', $client->id)
            ->value('role');
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

    public function hasProjectAccess(Project $project): bool
    {
        if (! $this->canAccessClient($project->client)) {
            return false;
        }

        if ($this->canManageClient($project->client)) {
            return true;
        }

        return $this->projectMemberships()
            ->where('project_id', $project->id)
            ->exists();
    }

    public function canManageProject(Project $project): bool
    {
        return $this->canManageClient($project->client);
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

        return $this->boardMemberships()
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
            && $this->boardMemberships()->where('board_id', $board->id)->exists();
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
            || $this->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists();
    }
}
