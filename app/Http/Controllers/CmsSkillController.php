<?php

namespace App\Http\Controllers;

use App\Models\Skill;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CmsSkillController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('cms/skills', [
            'skills' => Skill::query()
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'icon']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:skills,name'],
        ]);

        Skill::query()->create($validated);

        return back();
    }

    public function update(Request $request, Skill $skill): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('skills', 'name')->ignore($skill->id)],
        ]);

        $skill->update($validated);

        return back();
    }

    public function uploadIcon(Request $request, Skill $skill): RedirectResponse
    {
        $request->validate([
            'icon' => ['required', 'image', 'max:2048'],
        ]);

        if ($skill->icon) {
            Storage::disk('public')->delete($skill->icon);
        }

        $skill->update(['icon' => $request->file('icon')->store('skills', 'public')]);

        return back();
    }

    public function destroy(Skill $skill): RedirectResponse
    {
        $skill->projects()->detach();

        if ($skill->icon) {
            Storage::disk('public')->delete($skill->icon);
        }

        $skill->delete();

        return back();
    }
}
