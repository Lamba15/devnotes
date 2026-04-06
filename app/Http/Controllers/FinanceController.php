<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Project;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $manageableClientIds = $user->clientMemberships()
            ->whereIn('role', ['owner', 'admin'])
            ->pluck('client_id');

        abort_if(! $user->isPlatformOwner() && $manageableClientIds->isEmpty(), 403);

        $projects = Project::query()
            ->with('client:id,name')
            ->when(! $user->isPlatformOwner(), fn ($query) => $query->whereIn('client_id', $manageableClientIds))
            ->orderBy('name')
            ->get();

        $transactions = Transaction::query()
            ->with('project.client')
            ->when(
                ! $user->isPlatformOwner(),
                fn ($query) => $query->whereHas('project', fn ($projectQuery) => $projectQuery->whereIn('client_id', $manageableClientIds))
            )
            ->latest()
            ->get();

        $invoices = Invoice::query()
            ->with('project.client')
            ->when(
                ! $user->isPlatformOwner(),
                fn ($query) => $query->whereHas('project', fn ($projectQuery) => $projectQuery->whereIn('client_id', $manageableClientIds))
            )
            ->latest()
            ->get();

        return Inertia::render('finance/index', [
            'projects' => $projects,
            'transactions' => $transactions,
            'invoices' => $invoices,
        ]);
    }
}
