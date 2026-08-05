<?php

namespace App\Http\Controllers;

use App\Analytics\AnalyticsRecorder;
use App\Http\Requests\StoreAnalyticsEventsRequest;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class PublicAnalyticsController extends Controller
{
    public function store(
        StoreAnalyticsEventsRequest $request,
        AnalyticsRecorder $recorder,
    ): JsonResponse {
        $accepted = $recorder->record($request->validated(), $request);

        return response()->json(
            ['accepted' => $accepted],
            Response::HTTP_ACCEPTED,
        );
    }
}
