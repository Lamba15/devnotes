<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\WorkspaceAccess;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable(['name', 'email', 'password', 'email_verified_at', 'avatar_path', 'job_title', 'timezone', 'ai_credits', 'ai_credits_used', 'openrouter_api_key', 'openrouter_model', 'openrouter_system_prompt'])]
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

    public function workspaceAccess(): WorkspaceAccess
    {
        return new WorkspaceAccess($this);
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
        return $this->workspaceAccess()->isPlatformOwner();
    }

    public function belongsToClient(Client $client): bool
    {
        return $this->workspaceAccess()->belongsToClient($client);
    }

    public function clientRole(Client $client): ?string
    {
        return $this->workspaceAccess()->clientRole($client);
    }

    public function canAccessClient(Client $client): bool
    {
        return $this->workspaceAccess()->canAccessClient($client);
    }

    public function canManageClient(Client $client): bool
    {
        return $this->workspaceAccess()->canManageClient($client);
    }

    public function canViewInternalClientProfile(Client $client): bool
    {
        return $this->workspaceAccess()->canViewInternalClientProfile($client);
    }

    public function canEditInternalClientProfile(Client $client): bool
    {
        return $this->workspaceAccess()->canEditInternalClientProfile($client);
    }

    public function hasProjectAccess(Project $project): bool
    {
        return $this->workspaceAccess()->hasProjectAccess($project);
    }

    public function canManageProject(Project $project): bool
    {
        return $this->workspaceAccess()->canManageProject($project);
    }

    public function canAccessBoard(Board $board): bool
    {
        return $this->workspaceAccess()->canAccessBoard($board);
    }

    public function canMoveIssueOnBoard(Board $board): bool
    {
        return $this->workspaceAccess()->canMoveIssueOnBoard($board);
    }

    public function canCommentOnIssue(Issue $issue): bool
    {
        return $this->workspaceAccess()->canCommentOnIssue($issue);
    }

    public function canAccessAssistantDebug(): bool
    {
        return $this->workspaceAccess()->canAccessAssistantDebug();
    }
}
