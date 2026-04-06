<?php

use App\Http\Controllers\AssistantConfirmationController;
use App\Http\Controllers\AssistantController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\BoardIssueMovementController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ClientMembershipController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\IssueCommentController;
use App\Http\Controllers\IssueController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('overview', 'overview')->name('overview');

    Route::get('clients', [ClientController::class, 'index'])->name('clients.index');
    Route::post('clients', [ClientController::class, 'store'])->name('clients.store');
    Route::get('clients/{client}/members', [ClientMembershipController::class, 'index'])->name('clients.members.index');
    Route::post('clients/{client}/members', [ClientMembershipController::class, 'store'])->name('clients.members.store');

    Route::get('clients/{client}/projects', [ProjectController::class, 'index'])->name('clients.projects.index');
    Route::post('clients/{client}/projects', [ProjectController::class, 'store'])->name('clients.projects.store');
    Route::get('clients/{client}/projects/{project}/issues', [IssueController::class, 'index'])
        ->name('clients.projects.issues.index');
    Route::post('clients/{client}/projects/{project}/issues', [IssueController::class, 'store'])
        ->name('clients.projects.issues.store');
    Route::get('clients/{client}/projects/{project}/issues/{issue}', [IssueController::class, 'show'])
        ->name('clients.projects.issues.show');
    Route::put('clients/{client}/projects/{project}/issues/{issue}', [IssueController::class, 'update'])
        ->name('clients.projects.issues.update');
    Route::post('clients/{client}/projects/{project}/issues/{issue}/comments', [IssueCommentController::class, 'store'])
        ->name('clients.projects.issues.comments.store');
    Route::get('clients/{client}/projects/{project}/boards/{board}', [BoardController::class, 'show'])
        ->name('clients.projects.boards.show');
    Route::post('boards/{board}/issues/move', [BoardIssueMovementController::class, 'store'])
        ->name('boards.issues.move');

    Route::get('finance', [FinanceController::class, 'index'])->name('finance.index');
    Route::post('finance/transactions', [TransactionController::class, 'store'])->name('finance.transactions.store');
    Route::post('finance/invoices', [InvoiceController::class, 'store'])->name('finance.invoices.store');

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
