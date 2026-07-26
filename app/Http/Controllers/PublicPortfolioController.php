<?php

namespace App\Http\Controllers;

use App\Http\Resources\Portfolio\ContentSectionResource;
use App\Http\Resources\Portfolio\FeedbackResource;
use App\Http\Resources\Portfolio\ProjectResource;
use App\Http\Resources\Portfolio\SkillResource;
use App\Models\ContentSection;
use App\Models\Feedback;
use App\Models\Project;
use App\Models\Skill;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class PublicPortfolioController extends Controller
{
    public function projects(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'category' => ['nullable', Rule::in(Project::PORTFOLIO_CATEGORIES)],
            'featured' => ['nullable', 'boolean'],
        ]);

        $projects = Project::query()
            ->published()
            ->with(['skills:id,name,slug,icon', 'links', 'gitRepos'])
            ->when(
                $validated['category'] ?? null,
                fn (Builder $query, string $category) => $query->where('portfolio_category', $category),
            )
            ->when(
                $request->boolean('featured'),
                fn (Builder $query) => $query->where('is_featured', true),
            )
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return ProjectResource::collection($projects);
    }

    public function project(Project $project): ProjectResource
    {
        abort_unless($project->is_published, 404);

        $project->load(['skills:id,name,slug,icon', 'links', 'gitRepos']);

        return new ProjectResource($project);
    }

    public function skills(): AnonymousResourceCollection
    {
        // All skills, alphabetical — the portfolio shows the full wall, not
        // only skills attached to published projects.
        $skills = Skill::query()
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'icon']);

        return SkillResource::collection($skills);
    }

    public function sections(): AnonymousResourceCollection
    {
        $sections = ContentSection::query()
            ->published()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return ContentSectionResource::collection($sections);
    }

    public function feedback(): AnonymousResourceCollection
    {
        $feedback = Feedback::query()
            ->published()
            ->with('project:id,name')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return FeedbackResource::collection($feedback);
    }

    public function section(string $key): ContentSectionResource
    {
        $section = ContentSection::query()
            ->published()
            ->where('key', $key)
            ->firstOrFail();

        return new ContentSectionResource($section);
    }
}
