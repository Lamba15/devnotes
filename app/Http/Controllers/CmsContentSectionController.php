<?php

namespace App\Http\Controllers;

use App\Models\ContentSection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CmsContentSectionController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('cms/pages', [
            'sections' => ContentSection::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(['id', 'key', 'title', 'body_markdown', 'metadata', 'sort_order', 'is_published']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        ContentSection::query()->create($this->validatedAttributes($request));

        return back();
    }

    public function update(Request $request, ContentSection $contentSection): RedirectResponse
    {
        $contentSection->update($this->validatedAttributes($request, $contentSection));

        return back();
    }

    public function destroy(ContentSection $contentSection): RedirectResponse
    {
        $contentSection->delete();

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedAttributes(Request $request, ?ContentSection $section = null): array
    {
        $validated = $request->validate([
            'key' => [
                'required',
                'string',
                'max:255',
                'regex:/^[A-Za-z0-9._-]+$/',
                Rule::unique('content_sections', 'key')->ignore($section?->id),
            ],
            'title' => ['required', 'string', 'max:255'],
            'body_markdown' => ['nullable', 'string'],
            'metadata' => ['nullable', 'json'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_published' => ['nullable', 'boolean'],
        ]);

        return [
            'key' => $validated['key'],
            'title' => $validated['title'],
            'body_markdown' => $validated['body_markdown'] ?? null,
            'metadata' => isset($validated['metadata']) ? json_decode($validated['metadata'], true) : null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_published' => $validated['is_published'] ?? false,
        ];
    }
}
