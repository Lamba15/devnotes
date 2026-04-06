<?php

namespace App\Http\Controllers;

use App\Actions\Finance\CreateInvoice;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function store(Request $request, CreateInvoice $createInvoice): RedirectResponse
    {
        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'reference' => ['required', 'string', 'max:255'],
            'status' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric'],
            'issued_at' => ['nullable', 'date'],
            'due_at' => ['nullable', 'date'],
            'paid_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $project = Project::query()->findOrFail($validated['project_id']);

        $createInvoice->handle($request->user(), $project, $validated);

        return to_route('finance.index');
    }
}
