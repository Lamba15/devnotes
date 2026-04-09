<?php

use App\Http\Controllers\AssistantConfirmationController;
use App\Http\Controllers\AssistantController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\BoardIssueMovementController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ClientMembershipController;
use App\Http\Controllers\ClientStatusController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\IssueCommentController;
use App\Http\Controllers\IssueController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TransactionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('overview', function (Request $request) {
        if ($request->user()->isPlatformOwner()) {
            return Inertia::render('overview');
        }

        $firstClientId = $request->user()->clientMemberships()->orderBy('id')->value('client_id');

        abort_unless($firstClientId !== null, 403);

        return to_route('clients.show', $firstClientId);
    })->name('overview');

    Route::get('clients', [ClientController::class, 'index'])->name('clients.index');
    Route::get('clients/create', [ClientController::class, 'create'])->name('clients.create');
    Route::inertia('clients/tags', 'placeholder/section', [
        'title' => 'Client Tags',
        'description' => 'This section will manage reusable client tags and classifications.',
    ])->middleware('platform.owner')->name('clients.tags.index');
    Route::post('clients', [ClientController::class, 'store'])->name('clients.store');
    Route::get('clients/{client}', [ClientController::class, 'show'])->name('clients.show');
    Route::get('clients/{client}/edit', [ClientController::class, 'edit'])->name('clients.edit');
    Route::put('clients/{client}', [ClientController::class, 'update'])->name('clients.update');
    Route::delete('clients/{client}', [ClientController::class, 'destroy'])->name('clients.destroy');
    Route::get('clients/{client}/members/create', [ClientMembershipController::class, 'create'])->name('clients.members.create');
    Route::get('clients/{client}/members/{membership}/edit', [ClientMembershipController::class, 'edit'])->name('clients.members.edit');
    Route::get('clients/{client}/members', [ClientMembershipController::class, 'index'])->name('clients.members.index');
    Route::post('clients/{client}/members', [ClientMembershipController::class, 'store'])->name('clients.members.store');
    Route::put('clients/{client}/members/{membership}', [ClientMembershipController::class, 'update'])->name('clients.members.update');
    Route::delete('clients/{client}/members/{membership}', [ClientMembershipController::class, 'destroy'])->name('clients.members.destroy');
    Route::get('clients/{client}/issues', [ClientController::class, 'issues'])->name('clients.issues.index');
    Route::get('clients/{client}/boards/create', [BoardController::class, 'create'])->name('clients.boards.create');
    Route::get('clients/{client}/boards', [ClientController::class, 'boards'])->name('clients.boards.index');
    Route::post('clients/{client}/boards', [BoardController::class, 'store'])->name('clients.boards.store');
    Route::post('clients/{client}/boards/{board}/columns', [BoardController::class, 'storeColumn'])->name('clients.boards.columns.store');
    Route::get('clients/{client}/boards/{board}/edit', [BoardController::class, 'edit'])->name('clients.boards.edit');
    Route::put('clients/{client}/boards/{board}', [BoardController::class, 'update'])->name('clients.boards.update');
    Route::delete('clients/{client}/boards/{board}', [BoardController::class, 'destroy'])->name('clients.boards.destroy');
    Route::get('clients/{client}/statuses/create', [ClientStatusController::class, 'create'])->name('clients.statuses.create');
    Route::get('clients/{client}/statuses/{status}/edit', [ClientStatusController::class, 'edit'])->name('clients.statuses.edit');
    Route::get('clients/{client}/statuses', [ClientStatusController::class, 'index'])->name('clients.statuses.index');
    Route::post('clients/{client}/statuses', [ClientStatusController::class, 'store'])->name('clients.statuses.store');
    Route::put('clients/{client}/statuses/{status}', [ClientStatusController::class, 'update'])->name('clients.statuses.update');
    Route::delete('clients/{client}/statuses/{status}', [ClientStatusController::class, 'destroy'])->name('clients.statuses.destroy');
    Route::get('clients/{client}/finance', [ClientController::class, 'finance'])->name('clients.finance.index');

    Route::get('clients/{client}/projects/create', [ProjectController::class, 'create'])->name('clients.projects.create');
    Route::get('clients/{client}/projects', [ProjectController::class, 'index'])->name('clients.projects.index');
    Route::post('clients/{client}/projects', [ProjectController::class, 'store'])->name('clients.projects.store');
    Route::get('clients/{client}/projects/{project}', [ProjectController::class, 'show'])->name('clients.projects.show');
    Route::get('clients/{client}/projects/{project}/edit', [ProjectController::class, 'edit'])->name('clients.projects.edit');
    Route::put('clients/{client}/projects/{project}', [ProjectController::class, 'update'])->name('clients.projects.update');
    Route::delete('clients/{client}/projects/{project}', [ProjectController::class, 'destroy'])->name('clients.projects.destroy');
    Route::get('clients/{client}/projects/{project}/issues/create', [IssueController::class, 'create'])
        ->name('clients.projects.issues.create');
    Route::get('clients/{client}/projects/{project}/issues', [IssueController::class, 'index'])
        ->name('clients.projects.issues.index');
    Route::post('clients/{client}/projects/{project}/issues', [IssueController::class, 'store'])
        ->name('clients.projects.issues.store');
    Route::get('clients/{client}/projects/{project}/issues/{issue}/edit', [IssueController::class, 'edit'])
        ->name('clients.projects.issues.edit');
    Route::get('clients/{client}/projects/{project}/issues/{issue}', [IssueController::class, 'show'])
        ->name('clients.projects.issues.show');
    Route::put('clients/{client}/projects/{project}/issues/{issue}', [IssueController::class, 'update'])
        ->name('clients.projects.issues.update');
    Route::delete('clients/{client}/projects/{project}/issues/{issue}', [IssueController::class, 'destroy'])
        ->name('clients.projects.issues.destroy');
    Route::post('clients/{client}/projects/{project}/issues/{issue}/comments', [IssueCommentController::class, 'store'])
        ->name('clients.projects.issues.comments.store');
    Route::get('clients/{client}/projects/{project}/boards/{board}', [BoardController::class, 'show'])
        ->name('clients.projects.boards.show');
    Route::post('boards/{board}/issues/move', [BoardIssueMovementController::class, 'store'])
        ->name('boards.issues.move');

    Route::middleware('platform.owner')->group(function () {
        Route::redirect('finance', '/finance/transactions')->name('finance.index');
        Route::get('finance/transactions/create', [FinanceController::class, 'transactionsCreate'])->name('finance.transactions.create');
        Route::get('finance/transactions', [FinanceController::class, 'transactions'])->name('finance.transactions.index');
        Route::get('finance/transactions/{transaction}', [TransactionController::class, 'show'])->name('finance.transactions.show');
        Route::get('finance/transactions/{transaction}/edit', [TransactionController::class, 'edit'])->name('finance.transactions.edit');
        Route::get('finance/invoices/create', [FinanceController::class, 'invoicesCreate'])->name('finance.invoices.create');
        Route::get('finance/invoices', [FinanceController::class, 'invoices'])->name('finance.invoices.index');
        Route::get('finance/invoices/{invoice}', [InvoiceController::class, 'show'])->name('finance.invoices.show');
        Route::get('finance/invoices/{invoice}/edit', [InvoiceController::class, 'edit'])->name('finance.invoices.edit');
        Route::inertia('finance/categories', 'placeholder/section', [
            'title' => 'Finance Categories',
            'description' => 'This section will manage reusable financial categories and classifications.',
        ])->name('finance.categories.index');
        Route::post('finance/transactions', [TransactionController::class, 'store'])->name('finance.transactions.store');
        Route::put('finance/transactions/{transaction}', [TransactionController::class, 'update'])->name('finance.transactions.update');
        Route::delete('finance/transactions/{transaction}', [TransactionController::class, 'destroy'])->name('finance.transactions.destroy');
        Route::post('finance/invoices', [InvoiceController::class, 'store'])->name('finance.invoices.store');
        Route::put('finance/invoices/{invoice}', [InvoiceController::class, 'update'])->name('finance.invoices.update');
        Route::delete('finance/invoices/{invoice}', [InvoiceController::class, 'destroy'])->name('finance.invoices.destroy');
    });

    Route::middleware('platform.owner')->group(function () {
        Route::inertia('tracking/issues', 'tracking/issues')->name('tracking.issues.index');
        Route::inertia('tracking/boards', 'tracking/boards')->name('tracking.boards.index');
        Route::inertia('tracking/statuses', 'placeholder/section', [
            'title' => 'Tracking Statuses',
            'description' => 'This section will manage reusable tracking statuses and related classifications.',
        ])->name('tracking.statuses.index');
    });

    Route::middleware('platform.owner')->group(function () {
        Route::inertia('cms/pages', 'placeholder/section', [
            'title' => 'CMS Pages',
            'description' => 'This section will manage public and internal CMS pages.',
        ])->name('cms.pages.index');
        Route::inertia('cms/skills', 'placeholder/section', [
            'title' => 'CMS Skills',
            'description' => 'This section will manage skills and related profile content.',
        ])->name('cms.skills.index');
        Route::inertia('cms/feedback', 'placeholder/section', [
            'title' => 'CMS Feedback',
            'description' => 'This section will manage testimonials, feedback, and related public trust content.',
        ])->name('cms.feedback.index');
    });

    Route::get('assistant/threads', [AssistantController::class, 'index'])->name('assistant.threads.index');
    Route::post('assistant/threads', [AssistantController::class, 'createThread'])->name('assistant.threads.store');
    Route::get('assistant/threads/{thread}', [AssistantController::class, 'show'])->name('assistant.threads.show');
    Route::delete('assistant/threads/{thread}', [AssistantController::class, 'destroy'])->name('assistant.threads.destroy');
    Route::post('assistant/messages', [AssistantController::class, 'store'])->name('assistant.messages.store');
    Route::post('assistant/confirmations/{confirmation}/approve', [AssistantConfirmationController::class, 'approve'])
        ->name('assistant.confirmations.approve');
    Route::post('assistant/confirmations/{confirmation}/reject', [AssistantConfirmationController::class, 'reject'])
        ->name('assistant.confirmations.reject');
});

require __DIR__.'/settings.php';
