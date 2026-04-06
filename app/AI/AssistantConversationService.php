<?php

namespace App\AI;

use App\AI\Contracts\AssistantModelClient;
use App\Models\AssistantActionConfirmation;
use App\Models\AssistantMessage;
use App\Models\AssistantRun;
use App\Models\AssistantRunPhase;
use App\Models\AssistantThread;
use App\Models\AssistantToolExecution;
use App\Models\User;
use Illuminate\Validation\ValidationException;
use Throwable;

class AssistantConversationService
{
    public function __construct(
        private readonly AssistantModelClient $modelClient,
        private readonly AssistantToolRegistry $toolRegistry,
        private readonly AssistantToolExecutor $toolExecutor,
    ) {}

    public function respond(User $user, string $content, ?AssistantThread $thread = null): array
    {
        $thread ??= AssistantThread::query()->create([
            'user_id' => $user->id,
            'title' => $this->makeThreadTitle($content),
        ]);

        if (! filled($thread->title) || $thread->title === 'New chat') {
            $thread->forceFill(['title' => $this->makeThreadTitle($content)])->save();
        }

        $startedAt = now();

        $userMessage = AssistantMessage::query()->create([
            'thread_id' => $thread->id,
            'role' => 'user',
            'content' => $content,
        ]);

        $run = AssistantRun::query()->create([
            'thread_id' => $thread->id,
            'user_id' => $user->id,
            'user_message_id' => $userMessage->id,
            'status' => 'running',
            'system_prompt_source' => $this->systemPromptSourceFor($user),
            'started_at' => $startedAt,
        ]);

        $availableTools = $this->toolRegistry->forUser($user);

        try {
            $response = $this->modelClient->respond(
                messages: $this->buildModelMessages($thread),
                tools: $availableTools,
            );
        } catch (Throwable $exception) {
            $failedAt = now();
            $assistantMessage = AssistantMessage::query()->create([
                'thread_id' => $thread->id,
                'role' => 'assistant',
                'content' => 'The assistant failed before it could finish the request.',
                'meta_json' => [
                    'status' => 'error',
                    'error' => [
                        'type' => 'model_request_failed',
                        'message' => $exception->getMessage(),
                    ],
                    'trace' => [
                        'started_at' => $startedAt->toISOString(),
                        'finished_at' => $failedAt->toISOString(),
                        'duration_ms' => $startedAt->diffInMilliseconds($failedAt),
                        'available_tools' => collect($availableTools)->pluck('name')->values()->all(),
                        'system_prompt_source' => $this->systemPromptSourceFor($user),
                        'phases' => [
                            [
                                'key' => 'model_request',
                                'title' => 'Model request',
                                'status' => 'error',
                                'started_at' => $startedAt->toISOString(),
                                'finished_at' => $failedAt->toISOString(),
                                'duration_ms' => $startedAt->diffInMilliseconds($failedAt),
                                'summary' => 'The first model call failed before a response was returned.',
                            ],
                        ],
                    ],
                ],
            ]);

            $run->forceFill([
                'assistant_message_id' => $assistantMessage->id,
                'status' => 'error',
                'finished_at' => $failedAt,
                'duration_ms' => $startedAt->diffInMilliseconds($failedAt),
                'error_type' => 'model_request_failed',
                'error_message' => $exception->getMessage(),
                'metadata_json' => [
                    'available_tools' => collect($availableTools)->pluck('name')->values()->all(),
                ],
            ])->save();

            $this->storeRunPhase($run, [
                'key' => 'model_request',
                'title' => 'Model request',
                'status' => 'error',
                'started_at' => $startedAt,
                'finished_at' => $failedAt,
                'duration_ms' => $startedAt->diffInMilliseconds($failedAt),
                'summary' => 'The first model call failed before a response was returned.',
            ]);

            return [
                'thread' => $thread->fresh(),
                'thread_summary' => $thread->fresh()->toSummaryArray(),
                'messages' => $thread->messages()->orderBy('id')->get()->map(fn (AssistantMessage $message) => $message->toApiArray())->all(),
                'assistant_message' => $assistantMessage->toApiArray(),
                'pending_confirmation' => null,
            ];
        }

        $toolCalls = collect($response['tool_calls'] ?? [])
            ->filter(fn (array $toolCall) => filled($toolCall['name'] ?? null))
            ->values()
            ->all();

        $toolResults = [];
        $traceEntries = [];
        $initialAssistantContent = (string) ($response['content'] ?? '');
        $modelCompletedAt = now();
        $assistantMessage = AssistantMessage::query()->create([
            'thread_id' => $thread->id,
            'role' => 'assistant',
            'content' => $initialAssistantContent,
            'tool_calls_json' => $toolCalls ?: null,
            'meta_json' => [
                'status' => 'processing',
                'trace' => [
                    'started_at' => $startedAt->toISOString(),
                    'available_tools' => collect($availableTools)->pluck('name')->values()->all(),
                    'tool_call_count' => count($toolCalls),
                    'model_runs' => 1,
                    'reruns' => 0,
                    'model' => $response['trace']['model'] ?? null,
                    'provider' => $response['trace']['provider'] ?? null,
                    'configured_via' => $response['trace']['configured_via'] ?? null,
                    'system_prompt_source' => $this->systemPromptSourceFor($user),
                    'usage' => $response['trace']['usage'] ?? null,
                    'phases' => [
                        [
                            'key' => 'model_request',
                            'title' => 'Model request',
                            'status' => 'completed',
                            'started_at' => $startedAt->toISOString(),
                            'finished_at' => $modelCompletedAt->toISOString(),
                            'duration_ms' => $startedAt->diffInMilliseconds($modelCompletedAt),
                            'summary' => 'Initial assistant/tool planning pass completed.',
                        ],
                    ],
                ],
            ],
        ]);

        $run->forceFill([
            'assistant_message_id' => $assistantMessage->id,
            'status' => 'running',
            'provider' => $response['trace']['provider'] ?? null,
            'configured_model' => $response['trace']['model'] ?? null,
            'effective_model' => $response['trace']['model'] ?? null,
            'metadata_json' => [
                'available_tools' => collect($availableTools)->pluck('name')->values()->all(),
                'initial_usage' => $response['trace']['usage'] ?? null,
            ],
        ])->save();

        $this->storeRunPhase($run, [
            'key' => 'model_request',
            'title' => 'Model request',
            'status' => 'completed',
            'started_at' => $startedAt,
            'finished_at' => $modelCompletedAt,
            'duration_ms' => $startedAt->diffInMilliseconds($modelCompletedAt),
            'summary' => 'Initial assistant/tool planning pass completed.',
        ]);

        $toolExecutionStartedAt = now();
        $pendingConfirmation = $this->handleToolCalls(
            user: $user,
            thread: $thread,
            run: $run,
            assistantMessage: $assistantMessage,
            toolCalls: $toolCalls,
            toolResults: $toolResults,
            traceEntries: $traceEntries,
        );
        $toolExecutionFinishedAt = now();

        $this->storeRunPhase($run, [
            'key' => 'tool_execution',
            'title' => 'Tool execution',
            'status' => $pendingConfirmation ? 'pending_confirmation' : 'completed',
            'started_at' => $toolExecutionStartedAt,
            'finished_at' => $toolExecutionFinishedAt,
            'duration_ms' => $toolExecutionStartedAt->diffInMilliseconds($toolExecutionFinishedAt),
            'summary' => $pendingConfirmation
                ? 'Tool execution prepared a confirmation-gated action.'
                : 'Tool execution completed and returned grounded results.',
        ]);

        $finalAssistantContent = $initialAssistantContent;
        $writerPassTrace = null;
        $writerPassFinishedAt = null;

        if ($this->shouldRunWriterPass($response)) {
            [$finalAssistantContent, $writerPassTrace] = $this->runWriterPass(
                user: $user,
                originalUserMessage: $content,
                initialAssistantContent: $initialAssistantContent,
                toolResults: $toolResults,
                pendingConfirmation: $pendingConfirmation,
            );
            $writerPassFinishedAt = now();
        }

        $finishedAt = now();
        $phases = [
            [
                'key' => 'model_request',
                'title' => 'Model request',
                'status' => 'completed',
                'started_at' => $startedAt->toISOString(),
                'finished_at' => $modelCompletedAt->toISOString(),
                'duration_ms' => $startedAt->diffInMilliseconds($modelCompletedAt),
                'summary' => 'Initial assistant/tool planning pass completed.',
            ],
            [
                'key' => 'tool_execution',
                'title' => 'Tool execution',
                'status' => $pendingConfirmation ? 'pending_confirmation' : 'completed',
                'started_at' => $toolExecutionStartedAt->toISOString(),
                'finished_at' => $toolExecutionFinishedAt->toISOString(),
                'duration_ms' => $toolExecutionStartedAt->diffInMilliseconds($toolExecutionFinishedAt),
                'summary' => $pendingConfirmation
                    ? 'Tool execution prepared a confirmation-gated action.'
                    : 'Tool execution completed and returned grounded results.',
            ],
        ];

        if ($this->shouldRunWriterPass($response)) {
            $writerFinished = $writerPassFinishedAt ?? $finishedAt;
            $phases[] = [
                'key' => 'final_answer',
                'title' => 'Final answer writer',
                'status' => $writerPassTrace ? 'completed' : 'fallback',
                'started_at' => $toolExecutionFinishedAt->toISOString(),
                'finished_at' => $writerFinished->toISOString(),
                'duration_ms' => $toolExecutionFinishedAt->diffInMilliseconds($writerFinished),
                'summary' => $writerPassTrace
                    ? 'A second model pass wrote the final user-facing answer.'
                    : 'The assistant kept the first draft because the writer pass did not replace it.',
            ];

            $this->storeRunPhase($run, [
                'key' => 'final_answer',
                'title' => 'Final answer writer',
                'status' => $writerPassTrace ? 'completed' : 'fallback',
                'started_at' => $toolExecutionFinishedAt,
                'finished_at' => $writerFinished,
                'duration_ms' => $toolExecutionFinishedAt->diffInMilliseconds($writerFinished),
                'summary' => $writerPassTrace
                    ? 'A second model pass wrote the final user-facing answer.'
                    : 'The assistant kept the first draft because the writer pass did not replace it.',
                'metadata_json' => $writerPassTrace,
            ]);
        }

        $assistantMessage->forceFill([
            'content' => $finalAssistantContent,
            'meta_json' => [
                'status' => $pendingConfirmation ? 'pending_confirmation' : 'completed',
                'confirmation' => $pendingConfirmation?->toApiArray(),
                'trace' => [
                    'started_at' => $startedAt->toISOString(),
                    'finished_at' => $finishedAt->toISOString(),
                    'duration_ms' => $startedAt->diffInMilliseconds($finishedAt),
                    'available_tools' => collect($availableTools)->pluck('name')->values()->all(),
                    'tool_call_count' => count($toolCalls),
                    'model_runs' => $writerPassTrace ? 2 : 1,
                    'reruns' => $writerPassTrace ? 1 : 0,
                    'model' => $response['trace']['model'] ?? null,
                    'provider' => $response['trace']['provider'] ?? null,
                    'configured_via' => $response['trace']['configured_via'] ?? null,
                    'system_prompt_source' => $this->systemPromptSourceFor($user),
                    'usage' => $response['trace']['usage'] ?? null,
                    'writer_pass' => $writerPassTrace,
                    'phases' => $phases,
                    'tool_trace' => $traceEntries,
                ],
            ],
        ])->save();

        $run->forceFill([
            'status' => $pendingConfirmation ? 'pending_confirmation' : 'completed',
            'model_runs' => $writerPassTrace ? 2 : 1,
            'reruns' => $writerPassTrace ? 1 : 0,
            'finished_at' => $finishedAt,
            'duration_ms' => $startedAt->diffInMilliseconds($finishedAt),
            'metadata_json' => [
                'available_tools' => collect($availableTools)->pluck('name')->values()->all(),
                'usage' => $response['trace']['usage'] ?? null,
                'writer_pass' => $writerPassTrace,
                'confirmation' => $pendingConfirmation?->toApiArray(),
            ],
        ])->save();

        return [
            'thread' => $thread->fresh(),
            'thread_summary' => $thread->fresh()->toSummaryArray(),
            'messages' => $thread->messages()
                ->orderBy('id')
                ->get()
                ->map(fn (AssistantMessage $message) => $message->toApiArray())
                ->all(),
            'assistant_message' => $assistantMessage->toApiArray(),
            'pending_confirmation' => $pendingConfirmation?->toApiArray(),
        ];
    }

    private function handleToolCalls(
        User $user,
        AssistantThread $thread,
        AssistantRun $run,
        AssistantMessage $assistantMessage,
        array $toolCalls,
        array &$toolResults,
        array &$traceEntries,
    ): ?AssistantActionConfirmation {
        $pendingConfirmation = null;

        foreach ($toolCalls as $toolCall) {
            $toolName = $toolCall['name'] ?? null;

            if (! is_string($toolName) || $toolName === '') {
                continue;
            }

            $tool = $this->toolRegistry->find($user, $toolName);

            if ($tool === null) {
                $executionStartedAt = now();
                $error = $this->errorResult("Tool [{$toolName}] is not available in the current user scope.");
                $toolResults[] = $error;
                $traceEntries[] = [
                    'tool_name' => $toolName,
                    'arguments' => $toolCall['arguments'] ?? [],
                    'status' => 'unavailable',
                    'error' => $error['message'],
                ];

                $this->storeToolExecution($run, [
                    'tool_name' => $toolName,
                    'tool_call_id' => $toolCall['id'] ?? null,
                    'status' => 'unavailable',
                    'requires_confirmation' => false,
                    'arguments_json' => $toolCall['arguments'] ?? [],
                    'result_json' => $error,
                    'error_message' => $error['message'],
                    'started_at' => $executionStartedAt,
                    'finished_at' => now(),
                    'duration_ms' => $executionStartedAt->diffInMilliseconds(now()),
                ]);

                continue;
            }

            if (($tool['requires_confirmation'] ?? false) === true) {
                $executionStartedAt = now();
                $pendingConfirmation ??= AssistantActionConfirmation::query()->create([
                    'thread_id' => $thread->id,
                    'user_id' => $user->id,
                    'tool_name' => $toolName,
                    'payload_json' => $toolCall['arguments'] ?? [],
                    'status' => 'pending',
                ]);

                $traceEntries[] = [
                    'tool_name' => $toolName,
                    'arguments' => $toolCall['arguments'] ?? [],
                    'status' => 'pending_confirmation',
                ];

                $this->storeToolExecution($run, [
                    'tool_name' => $toolName,
                    'tool_call_id' => $toolCall['id'] ?? null,
                    'confirmation_id' => $pendingConfirmation->id,
                    'status' => 'pending_confirmation',
                    'requires_confirmation' => true,
                    'arguments_json' => $toolCall['arguments'] ?? [],
                    'started_at' => $executionStartedAt,
                    'finished_at' => now(),
                    'duration_ms' => $executionStartedAt->diffInMilliseconds(now()),
                ]);

                continue;
            }

            try {
                $executionStartedAt = now();
                $result = $this->toolExecutor->execute(
                    user: $user,
                    toolName: $toolName,
                    payload: $toolCall['arguments'] ?? [],
                );
                $toolResults[] = $result;
                $traceEntries[] = [
                    'tool_name' => $toolName,
                    'arguments' => $toolCall['arguments'] ?? [],
                    'status' => 'executed',
                    'result_type' => $result['type'] ?? null,
                ];

                $this->storeToolExecution($run, [
                    'tool_name' => $toolName,
                    'tool_call_id' => $toolCall['id'] ?? null,
                    'status' => 'executed',
                    'requires_confirmation' => false,
                    'result_type' => $result['type'] ?? null,
                    'arguments_json' => $toolCall['arguments'] ?? [],
                    'result_json' => $result,
                    'started_at' => $executionStartedAt,
                    'finished_at' => now(),
                    'duration_ms' => $executionStartedAt->diffInMilliseconds(now()),
                ]);
            } catch (ValidationException $exception) {
                $executionStartedAt = now();
                $error = $this->errorResult(
                    collect($exception->errors())->flatten()->join(' ')
                );
                $toolResults[] = $error;
                $traceEntries[] = [
                    'tool_name' => $toolName,
                    'arguments' => $toolCall['arguments'] ?? [],
                    'status' => 'error',
                    'error' => $error['message'],
                ];

                $this->storeToolExecution($run, [
                    'tool_name' => $toolName,
                    'tool_call_id' => $toolCall['id'] ?? null,
                    'status' => 'error',
                    'requires_confirmation' => false,
                    'arguments_json' => $toolCall['arguments'] ?? [],
                    'result_json' => $error,
                    'error_message' => $error['message'],
                    'started_at' => $executionStartedAt,
                    'finished_at' => now(),
                    'duration_ms' => $executionStartedAt->diffInMilliseconds(now()),
                ]);
            }
        }

        if ($toolResults !== []) {
            $assistantMessage->forceFill([
                'tool_results_json' => $toolResults,
            ])->save();
        }

        return $pendingConfirmation;
    }

    private function buildModelMessages(AssistantThread $thread): array
    {
        return [
            [
                'role' => 'system',
                'content' => $this->systemPromptFor($thread->user),
            ],
            ...$thread->messages()
                ->orderBy('id')
                ->get()
                ->map(fn (AssistantMessage $message) => [
                    'role' => $message->role,
                    'content' => $message->content,
                ])
                ->all(),
        ];
    }

    private function errorResult(string $message): array
    {
        return [
            'type' => 'error',
            'message' => $message,
        ];
    }

    private function systemPromptFor(User $user): string
    {
        if (filled($user->openrouter_system_prompt)) {
            return (string) $user->openrouter_system_prompt;
        }

        return DefaultAssistantSystemPrompt::make();
    }

    private function makeThreadTitle(string $content): string
    {
        return str($content)
            ->squish()
            ->limit(60, '')
            ->toString();
    }

    private function shouldRunWriterPass(array $response): bool
    {
        return ($response['trace']['provider'] ?? null) === 'openrouter';
    }

    private function runWriterPass(
        User $user,
        string $originalUserMessage,
        string $initialAssistantContent,
        array $toolResults,
        ?AssistantActionConfirmation $pendingConfirmation,
    ): array {
        try {
            $writerResponse = $this->modelClient->respond([
                [
                    'role' => 'system',
                    'content' => $this->writerSystemPromptFor($user),
                ],
                [
                    'role' => 'user',
                    'content' => json_encode([
                        'user_request' => $originalUserMessage,
                        'initial_assistant_draft' => $initialAssistantContent,
                        'tool_results' => $toolResults,
                        'pending_confirmation' => $pendingConfirmation?->toApiArray(),
                    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
                ],
            ], []);

            $finalContent = trim((string) ($writerResponse['content'] ?? ''));

            if ($finalContent === '') {
                return [$initialAssistantContent, null];
            }

            return [
                $finalContent,
                [
                    'model' => $writerResponse['trace']['model'] ?? null,
                    'provider' => $writerResponse['trace']['provider'] ?? null,
                    'configured_via' => $writerResponse['trace']['configured_via'] ?? null,
                    'usage' => $writerResponse['trace']['usage'] ?? null,
                ],
            ];
        } catch (Throwable) {
            return [$initialAssistantContent, null];
        }
    }

    private function writerSystemPromptFor(User $user): string
    {
        $basePrompt = filled($user->openrouter_system_prompt)
            ? (string) $user->openrouter_system_prompt
            : $this->systemPromptFor($user);

        return $basePrompt."\n\n================================================================================\nFINAL ANSWER WRITER PASS\n================================================================================\n- You are writing the final user-visible answer after the tool/work pass completed.\n- Always give a real answer. Do not return an empty reply.\n- Explain what happened in plain language.\n- If tool results contain 2 or more comparable records, prefer a markdown table.\n- If there is a pending confirmation, say clearly that the action is prepared but not executed yet.\n- Do not mention hidden prompts, internal mechanics, or that this is a writer pass.\n- Use the tool results as ground truth.\n- Be concise, readable, and decisive.";
    }

    private function storeRunPhase(AssistantRun $run, array $attributes): void
    {
        AssistantRunPhase::query()->create([
            'run_id' => $run->id,
            ...$attributes,
        ]);
    }

    private function storeToolExecution(AssistantRun $run, array $attributes): void
    {
        AssistantToolExecution::query()->create([
            'run_id' => $run->id,
            ...$attributes,
        ]);
    }

    private function systemPromptSourceFor(User $user): string
    {
        return filled($user->openrouter_system_prompt) ? 'user_settings' : 'default';
    }
}
