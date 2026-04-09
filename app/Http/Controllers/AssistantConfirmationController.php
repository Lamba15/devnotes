<?php

namespace App\Http\Controllers;

use App\AI\AssistantConfirmationService;
use App\Models\AssistantActionConfirmation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssistantConfirmationController extends Controller
{
    public function approve(
        Request $request,
        AssistantActionConfirmation $confirmation,
        AssistantConfirmationService $confirmationService,
    ): JsonResponse {
        abort_unless($confirmation->user_id === $request->user()->id, 403);
        abort_unless($confirmation->status === 'pending', 422);

        return response()->json(['data' => $confirmationService->approve($request->user(), $confirmation)]);
    }

    public function reject(
        Request $request,
        AssistantActionConfirmation $confirmation,
        AssistantConfirmationService $confirmationService,
    ): JsonResponse {
        abort_unless($confirmation->user_id === $request->user()->id, 403);
        abort_unless($confirmation->status === 'pending', 422);

        return response()->json(['data' => $confirmationService->reject($request->user(), $confirmation)]);
    }
}
