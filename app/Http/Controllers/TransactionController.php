<?php

namespace App\Http\Controllers;

use App\Actions\Finance\CreateTransaction;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function store(Request $request, CreateTransaction $createTransaction): RedirectResponse
    {
        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric'],
            'occurred_at' => ['required', 'date'],
        ]);

        $project = Project::query()->findOrFail($validated['project_id']);

        $createTransaction->handle($request->user(), $project, $validated);

        return to_route('finance.index');
    }
}
