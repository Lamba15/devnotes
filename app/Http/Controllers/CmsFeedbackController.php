<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CmsFeedbackController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('cms/feedback', [
            'feedback' => Feedback::query()
                ->with('project:id,name')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(['id', 'name', 'role', 'quote', 'source', 'rating', 'project_id', 'sort_order', 'is_published']),
            'projects' => Project::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Feedback::query()->create($this->validatedAttributes($request));

        return back();
    }

    public function update(Request $request, Feedback $feedback): RedirectResponse
    {
        $feedback->update($this->validatedAttributes($request));

        return back();
    }

    public function destroy(Feedback $feedback): RedirectResponse
    {
        $feedback->delete();

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedAttributes(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'max:255'],
            'quote' => ['required', 'string'],
            'source' => ['nullable', 'string', Rule::in(Feedback::SOURCES)],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'is_published' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        return [
            'name' => $validated['name'],
            'role' => $validated['role'] ?? null,
            'quote' => $validated['quote'],
            'source' => $validated['source'] ?? 'direct',
            'rating' => $validated['rating'] ?? null,
            'project_id' => $validated['project_id'] ?? null,
            'is_published' => $validated['is_published'] ?? false,
            'sort_order' => $validated['sort_order'] ?? 0,
        ];
    }
}
