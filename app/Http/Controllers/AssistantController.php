<?php

namespace App\Http\Controllers;

use App\AI\AssistantConversationService;
use App\Models\AssistantThread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssistantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => [
                'threads' => AssistantThread::query()
                    ->where('user_id', $request->user()->id)
                    ->latest('updated_at')
                    ->get()
                    ->map(fn (AssistantThread $thread) => $thread->toSummaryArray())
                    ->all(),
            ],
        ]);
    }

    public function show(Request $request, AssistantThread $thread): JsonResponse
    {
        abort_unless($thread->user_id === $request->user()->id, 403);

        $thread->load(['messages' => fn ($query) => $query->orderBy('id')]);

        return response()->json([
            'data' => [
                'thread' => $thread->toSummaryArray(),
                'messages' => $thread->messages->map(fn ($message) => $message->toApiArray())->all(),
                'pending_confirmation' => $thread->confirmations()->where('status', 'pending')->latest('id')->first()?->toApiArray(),
            ],
        ]);
    }

    public function createThread(Request $request): JsonResponse
    {
        $thread = AssistantThread::query()->create([
            'user_id' => $request->user()->id,
            'title' => 'New chat',
        ]);

        return response()->json([
            'data' => [
                'thread' => $thread->toSummaryArray(),
            ],
        ]);
    }

    public function destroy(Request $request, AssistantThread $thread): JsonResponse
    {
        abort_unless($thread->user_id === $request->user()->id, 403);

        $thread->confirmations()->delete();
        $thread->messages()->delete();
        $thread->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function store(Request $request, AssistantConversationService $conversationService): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string'],
            'thread_id' => ['nullable', 'integer', 'exists:assistant_threads,id'],
        ]);

        $thread = isset($validated['thread_id'])
            ? AssistantThread::query()
                ->whereKey($validated['thread_id'])
                ->where('user_id', $request->user()->id)
                ->firstOrFail()
            : null;

        return response()->json([
            'data' => $conversationService->respond(
                user: $request->user(),
                content: $validated['message'],
                thread: $thread,
            ),
        ]);
    }
}
