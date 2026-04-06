<?php

namespace App\Http\Controllers;

use App\AI\AssistantToolExecutor;
use App\Models\AssistantActionConfirmation;
use App\Models\AssistantMessage;
use App\Models\AssistantThread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssistantConfirmationController extends Controller
{
    public function approve(
        Request $request,
        AssistantActionConfirmation $confirmation,
        AssistantToolExecutor $toolExecutor,
    ): JsonResponse {
        abort_unless($confirmation->user_id === $request->user()->id, 403);
        abort_unless($confirmation->status === 'pending', 422);

        $result = $toolExecutor->execute(
            user: $request->user(),
            toolName: $confirmation->tool_name,
            payload: $confirmation->payload_json,
            confirmation: $confirmation,
        );

        $confirmation->forceFill(['status' => 'executed'])->save();

        AssistantMessage::query()->create([
            'thread_id' => $confirmation->thread_id,
            'role' => 'assistant',
            'content' => 'Confirmed action executed.',
            'tool_results_json' => [$result],
            'meta_json' => [
                'status' => 'confirmation_executed',
                'confirmation' => $confirmation->fresh()->toApiArray(),
            ],
        ]);

        return response()->json(['data' => $this->serializeThreadState($confirmation, $result)]);
    }

    public function reject(Request $request, AssistantActionConfirmation $confirmation): JsonResponse
    {
        abort_unless($confirmation->user_id === $request->user()->id, 403);
        abort_unless($confirmation->status === 'pending', 422);

        $confirmation->forceFill(['status' => 'rejected'])->save();

        AssistantMessage::query()->create([
            'thread_id' => $confirmation->thread_id,
            'role' => 'assistant',
            'content' => 'Confirmed action rejected.',
            'meta_json' => [
                'status' => 'confirmation_rejected',
                'confirmation' => $confirmation->fresh()->toApiArray(),
            ],
        ]);

        return response()->json(['data' => $this->serializeThreadState($confirmation)]);
    }

    private function serializeThreadState(
        AssistantActionConfirmation $confirmation,
        ?array $result = null,
    ): array {
        $thread = AssistantThread::query()
            ->whereKey($confirmation->thread_id)
            ->with(['messages' => fn ($query) => $query->orderBy('id')])
            ->firstOrFail();

        return [
            'thread' => [
                ...$thread->toSummaryArray(),
            ],
            'messages' => $thread->messages->map(fn (AssistantMessage $message) => $message->toApiArray())->all(),
            'pending_confirmation' => null,
            'confirmation' => $confirmation->fresh()->toApiArray(),
            'result' => $result,
        ];
    }
}
