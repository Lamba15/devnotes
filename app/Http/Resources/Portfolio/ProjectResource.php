<?php

namespace App\Http\Resources\Portfolio;

use App\Models\Project;
use App\Models\ProjectGitRepo;
use App\Models\ProjectLink;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Project
 */
class ProjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'markdown_description' => $this->markdown_description,
            'hosting' => $this->hosting,
            'cover_url' => $this->image_path ? Storage::disk('public')->url($this->image_path) : null,
            'starts_at' => $this->starts_at?->toDateString(),
            'ends_at' => $this->ends_at?->toDateString(),
            'is_featured' => $this->is_featured,
            'portfolio_category' => $this->portfolio_category,
            'skills' => SkillResource::collection($this->whenLoaded('skills')),
            'links' => $this->whenLoaded('links', fn () => $this->links->map(fn (ProjectLink $link) => [
                'label' => $link->label,
                'url' => $link->url,
                'position' => $link->position,
            ])->all()),
            'git_repos' => $this->whenLoaded('gitRepos', fn () => $this->gitRepos->map(fn (ProjectGitRepo $repo) => [
                'name' => $repo->name,
                'repo_url' => $repo->repo_url,
                'wakatime_badge_url' => $repo->wakatime_badge_url,
                'position' => $repo->position,
            ])->all()),
        ];
    }
}
