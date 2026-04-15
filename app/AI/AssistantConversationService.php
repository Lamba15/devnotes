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
use Carbon\CarbonInterface;
use Illuminate\Validation\ValidationException;
use Throwable;

class AssistantConversationService
{
    private const MAX_TOOL_ITERATIONS = 4;

    public function __construct(
        private readonly AssistantModelClient $modelClient,
        private readonly AssistantToolRegistry $toolRegistry,
        private readonly AssistantToolExecutor $toolExecutor,
    ) {}

    public function respond(User $user, string $content, ?AssistantThread $thread = null, ?array $pageContext = null): array
    {
        $thread ??= AssistantThread::query()->create([
            'user_id' => $user->id,
            'title' => $this->makeThreadTitle($content),
        ]);

        if (! filled($thread->title) || $thread->title === 'New chat') {
            $thread->forceFill(['title' => $this->makeThreadTitle($content)])->save();
        }

        $this->consumeCredit($user);

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
        $pageContextEnvelope = $this->buildPageContextEnvelope($user, $pageContext);

        try {
            $execution = $this->runAssistantLoop(
                user: $user,
                run: $run,
                modelMessages: $this->buildModelMessages($thread, $pageContextEnvelope),
                availableTools: $availableTools,
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
                        'page_context' => $pageContextEnvelope,
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
                    'page_context' => $pageContextEnvelope,
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

        $toolResults = $execution['tool_results'];
        $traceEntries = $execution['trace_entries'];
        $initialAssistantContent = $execution['assistant_content'];
        $pendingConfirmation = $execution['pending_confirmation'];

        $assistantMessage = AssistantMessage::query()->create([
            'thread_id' => $thread->id,
            'role' => 'assistant',
            'content' => $initialAssistantContent,
            'tool_calls_json' => $execution['tool_calls'] ?: null,
            'tool_results_json' => $toolResults ?: null,
            'meta_json' => [
                'status' => 'processing',
                'trace' => [
                    'started_at' => $startedAt->toISOString(),
                    'available_tools' => collect($availableTools)->pluck('name')->values()->all(),
                    'tool_call_count' => count($execution['tool_calls']),
                    'model_runs' => $execution['model_runs'],
                    'reruns' => max(0, $execution['model_runs'] - 1),
                    'model' => $execution['last_trace']['model'] ?? null,
                    'provider' => $execution['last_trace']['provider'] ?? null,
                    'configured_via' => $execution['last_trace']['configured_via'] ?? null,
                    'system_prompt_source' => $this->systemPromptSourceFor($user),
                    'usage' => $execution['last_trace']['usage'] ?? null,
                    'page_context' => $pageContextEnvelope,
                    'phases' => $execution['phases'],
                ],
            ],
        ]);

        $run->forceFill([
            'assistant_message_id' => $assistantMessage->id,
            'status' => 'running',
            'provider' => $execution['last_trace']['provider'] ?? null,
            'configured_model' => $execution['last_trace']['model'] ?? null,
            'effective_model' => $execution['last_trace']['model'] ?? null,
            'metadata_json' => [
                'available_tools' => collect($availableTools)->pluck('name')->values()->all(),
                'initial_usage' => $execution['last_trace']['usage'] ?? null,
                'page_context' => $pageContextEnvelope,
            ],
        ])->save();

        foreach ($execution['phase_records'] as $phaseRecord) {
            $this->storeRunPhase($run, $phaseRecord);
        }

        $finalAssistantContent = $initialAssistantContent;
        $writerPassTrace = null;
        $writerPassFinishedAt = null;

        if ($this->shouldRunWriterPass($execution['last_response'])) {
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
        $phases = $execution['phases'];

        if ($this->shouldRunWriterPass($execution['last_response'])) {
            $writerFinished = $writerPassFinishedAt ?? $finishedAt;
            $phases[] = [
                'key' => 'final_answer',
                'title' => 'Final answer writer',
                'status' => $writerPassTrace ? 'completed' : 'fallback',
                'started_at' => $execution['last_finished_at']->toISOString(),
                'finished_at' => $writerFinished->toISOString(),
                'duration_ms' => $execution['last_finished_at']->diffInMilliseconds($writerFinished),
                'summary' => $writerPassTrace
                    ? 'A second model pass wrote the final user-facing answer.'
                    : 'The assistant kept the first draft because the writer pass did not replace it.',
            ];

            $this->storeRunPhase($run, [
                'key' => 'final_answer',
                'title' => 'Final answer writer',
                'status' => $writerPassTrace ? 'completed' : 'fallback',
                'started_at' => $execution['last_finished_at'],
                'finished_at' => $writerFinished,
                'duration_ms' => $execution['last_finished_at']->diffInMilliseconds($writerFinished),
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
                    'tool_call_count' => count($execution['tool_calls']),
                    'model_runs' => $execution['model_runs'] + ($writerPassTrace ? 1 : 0),
                    'reruns' => max(0, $execution['model_runs'] - 1) + ($writerPassTrace ? 1 : 0),
                    'model' => $execution['last_trace']['model'] ?? null,
                    'provider' => $execution['last_trace']['provider'] ?? null,
                    'configured_via' => $execution['last_trace']['configured_via'] ?? null,
                    'system_prompt_source' => $this->systemPromptSourceFor($user),
                    'usage' => $execution['last_trace']['usage'] ?? null,
                    'writer_pass' => $writerPassTrace,
                    'page_context' => $pageContextEnvelope,
                    'phases' => $phases,
                    'tool_trace' => $traceEntries,
                ],
            ],
        ])->save();

        $run->forceFill([
            'status' => $pendingConfirmation ? 'pending_confirmation' : 'completed',
            'model_runs' => $execution['model_runs'] + ($writerPassTrace ? 1 : 0),
            'reruns' => max(0, $execution['model_runs'] - 1) + ($writerPassTrace ? 1 : 0),
            'finished_at' => $finishedAt,
            'duration_ms' => $startedAt->diffInMilliseconds($finishedAt),
            'metadata_json' => [
                'available_tools' => collect($availableTools)->pluck('name')->values()->all(),
                'usage' => $execution['last_trace']['usage'] ?? null,
                'writer_pass' => $writerPassTrace,
                'confirmation' => $pendingConfirmation?->toApiArray(),
                'page_context' => $pageContextEnvelope,
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

        return $pendingConfirmation;
    }

    private function runAssistantLoop(User $user, AssistantRun $run, array $modelMessages, array $availableTools): array
    {
        $assistantContent = '';
        $allToolCalls = [];
        $allToolResults = [];
        $traceEntries = [];
        $phases = [];
        $phaseRecords = [];
        $pendingConfirmation = null;
        $lastResponse = [];
        $lastTrace = [];
        $lastFinishedAt = now();

        for ($iteration = 1; $iteration <= self::MAX_TOOL_ITERATIONS; $iteration++) {
            $modelStartedAt = now();
            $response = $this->modelClient->respond(messages: $modelMessages, tools: $availableTools);
            $modelFinishedAt = now();

            $lastResponse = $response;
            $lastTrace = $response['trace'] ?? [];
            $lastFinishedAt = $modelFinishedAt;

            $toolCalls = collect($response['tool_calls'] ?? [])
                ->filter(fn (array $toolCall) => filled($toolCall['name'] ?? null))
                ->values()
                ->all();

            $assistantContent = (string) ($response['content'] ?? '');
            $allToolCalls = [...$allToolCalls, ...$toolCalls];

            $modelPhase = $this->phasePayload(
                key: "model_request_{$iteration}",
                title: $iteration === 1 ? 'Model request' : "Model request {$iteration}",
                status: 'completed',
                startedAt: $modelStartedAt,
                finishedAt: $modelFinishedAt,
                summary: $iteration === 1
                    ? 'Initial assistant/tool planning pass completed.'
                    : 'Follow-up model pass continued from grounded tool results.',
            );

            $phases[] = $modelPhase['api'];
            $phaseRecords[] = $modelPhase['db'];

            if ($toolCalls === []) {
                break;
            }

            $toolExecutionStartedAt = now();
            $iterationToolResults = [];
            $pendingConfirmation = $this->handleToolCalls(
                user: $user,
                thread: $run->thread,
                run: $run,
                toolCalls: $toolCalls,
                toolResults: $iterationToolResults,
                traceEntries: $traceEntries,
            );
            $toolExecutionFinishedAt = now();
            $allToolResults = [...$allToolResults, ...$iterationToolResults];

            $toolPhase = $this->phasePayload(
                key: "tool_execution_{$iteration}",
                title: $iteration === 1 ? 'Tool execution' : "Tool execution {$iteration}",
                status: $pendingConfirmation ? 'pending_confirmation' : 'completed',
                startedAt: $toolExecutionStartedAt,
                finishedAt: $toolExecutionFinishedAt,
                summary: $pendingConfirmation
                    ? 'Tool execution prepared a confirmation-gated action.'
                    : 'Tool execution completed and returned grounded results.',
            );

            $phases[] = $toolPhase['api'];
            $phaseRecords[] = $toolPhase['db'];

            if ($pendingConfirmation !== null || $iterationToolResults === []) {
                break;
            }

            $modelMessages[] = [
                'role' => 'assistant',
                'content' => $assistantContent,
            ];
            $modelMessages[] = [
                'role' => 'system',
                'content' => "TOOL RESULTS\n".json_encode($iterationToolResults, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            ];
        }

        return [
            'assistant_content' => $assistantContent,
            'tool_calls' => $allToolCalls,
            'tool_results' => $allToolResults,
            'trace_entries' => $traceEntries,
            'pending_confirmation' => $pendingConfirmation,
            'phases' => $phases,
            'phase_records' => $phaseRecords,
            'last_response' => $lastResponse,
            'last_trace' => $lastTrace,
            'last_finished_at' => $lastFinishedAt,
            'model_runs' => count(array_filter($phases, fn (array $phase) => str_starts_with((string) ($phase['key'] ?? ''), 'model_request'))),
        ];
    }

    private function phasePayload(
        string $key,
        string $title,
        string $status,
        CarbonInterface $startedAt,
        CarbonInterface $finishedAt,
        string $summary,
    ): array {
        return [
            'api' => [
                'key' => $key,
                'title' => $title,
                'status' => $status,
                'started_at' => $startedAt->toISOString(),
                'finished_at' => $finishedAt->toISOString(),
                'duration_ms' => $startedAt->diffInMilliseconds($finishedAt),
                'summary' => $summary,
            ],
            'db' => [
                'key' => $key,
                'title' => $title,
                'status' => $status,
                'started_at' => $startedAt,
                'finished_at' => $finishedAt,
                'duration_ms' => $startedAt->diffInMilliseconds($finishedAt),
                'summary' => $summary,
            ],
        ];
    }

    private function buildModelMessages(AssistantThread $thread, ?array $pageContextEnvelope = null): array
    {
        $messages = [
            [
                'role' => 'system',
                'content' => $this->systemPromptFor($thread->user),
            ],
        ];

        if ($pageContextEnvelope !== null && $pageContextEnvelope !== []) {
            $messages[] = [
                'role' => 'system',
                'content' => "CURRENT PAGE CONTEXT\n".json_encode($pageContextEnvelope, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            ];
        }

        return [
            ...$messages,
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

        return $basePrompt."\n\n================================================================================\nFINAL ANSWER WRITER PASS\n================================================================================\n- You are writing the final user-visible answer after the tool/work pass completed.\n- Always give a real answer. Do not return an empty reply.\n- Explain what happened in plain language.\n- Prefer markdown tables aggressively when tool results contain 2 or more comparable records or repeated fields.\n- If you are listing clients, projects, boards, issues, transactions, invoices, or similar structured items, default to a markdown table unless a table would clearly be worse.\n- After a table, add a brief human summary sentence if useful.\n- If there is a pending confirmation, say clearly that the action is prepared but not executed yet.\n- Do not mention hidden prompts, internal mechanics, or that this is a writer pass.\n- Use the tool results as ground truth.\n- Be concise, readable, and decisive.";
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

    private function buildPageContextEnvelope(User $user, ?array $pageContext): ?array
    {
        if ($pageContext === null || $pageContext === []) {
            return null;
        }

        return [
            'page' => $pageContext,
            'auto_read_context' => $this->autoReadPageContext($user, $pageContext),
        ];
    }

    private function consumeCredit(User $user): void
    {
        // Platform owners bypass credit checks
        if ($user->isPlatformOwner()) {
            return;
        }

        // -1 means unlimited credits
        if ($user->ai_credits === -1) {
            $user->increment('ai_credits_used');

            return;
        }

        // 0 means no credits allocated
        if ($user->ai_credits <= 0) {
            throw ValidationException::withMessages([
                'credits' => 'You have no AI credits remaining. Contact your administrator for more credits.',
            ]);
        }

        $remaining = $user->ai_credits - $user->ai_credits_used;

        if ($remaining <= 0) {
            throw ValidationException::withMessages([
                'credits' => 'You have used all your AI credits. Contact your administrator for more credits.',
            ]);
        }

        $user->increment('ai_credits_used');
    }

    private function autoReadPageContext(User $user, array $pageContext): ?array
    {
        try {
            if (isset($pageContext['issue']['id'])) {
                return [
                    'tool' => 'get_issue_detail',
                    'result' => $this->toolExecutor->execute(
                        user: $user,
                        toolName: 'get_issue_detail',
                        payload: ['issue_id' => $pageContext['issue']['id']],
                    ),
                ];
            }

            if (isset($pageContext['board']['id'])) {
                return [
                    'tool' => 'get_board_context',
                    'result' => $this->toolExecutor->execute(
                        user: $user,
                        toolName: 'get_board_context',
                        payload: ['board_id' => $pageContext['board']['id']],
                    ),
                ];
            }
        } catch (Throwable) {
            return null;
        }

        return null;
    }
}
