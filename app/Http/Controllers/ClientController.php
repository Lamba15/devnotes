<?php

namespace App\Http\Controllers;

use App\Actions\Clients\CreateClient;
use App\Models\Behavior;
use App\Models\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('clients/index', [
            'clients' => Client::query()
                ->with('behavior:id,name,slug')
                ->latest()
                ->get(),
            'behaviors' => Behavior::query()
                ->orderBy('name')
                ->get(['id', 'name', 'slug']),
        ]);
    }

    public function store(Request $request, CreateClient $createClient): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'behavior_id' => ['nullable', 'integer', 'exists:behaviors,id'],
        ]);

        $createClient->handle($request->user(), $validated);

        return to_route('clients.index');
    }
}
