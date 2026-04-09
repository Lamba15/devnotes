<?php

namespace App\AI;

use App\Models\AssistantActionConfirmation;
use App\Models\AssistantMessage;
use App\Models\AssistantThread;
use App\Models\User;
use Illuminate\Validation\UnauthorizedException;
use Throwable;

class AssistantConfirmationService
{
    public function __construct(private readonly AssistantToolExecutor $toolExecutor) {}

    public function approve(User $user, AssistantActionConfirmation $confirmation): array
    {
        $this->guard($user, $confirmation);

        $result = $this->toolExecutor->execute(
            user: $user,
            toolName: $confirmation->tool_name,
            payload: $confirmation->payload_json,
            confirmation: $confirmation,
        );
        $followUpResults = $this->followUpToolResults($user, $result);

        $confirmation->forceFill(['status' => 'executed'])->save();

        AssistantMessage::query()->create([
            'thread_id' => $confirmation->thread_id,
            'role' => 'assistant',
            'content' => $this->approvedMessageContent($confirmation, $result, $followUpResults),
            'tool_results_json' => [$result, ...$followUpResults],
            'meta_json' => [
                'status' => 'confirmation_executed',
                'confirmation' => $confirmation->fresh()->toApiArray(),
            ],
        ]);

        return $this->serializeThreadState($confirmation, $result);
    }

    public function reject(User $user, AssistantActionConfirmation $confirmation): array
    {
        $this->guard($user, $confirmation);

        $confirmation->forceFill(['status' => 'rejected'])->save();

        AssistantMessage::query()->create([
            'thread_id' => $confirmation->thread_id,
            'role' => 'assistant',
            'content' => $this->rejectedMessageContent($confirmation),
            'meta_json' => [
                'status' => 'confirmation_rejected',
                'confirmation' => $confirmation->fresh()->toApiArray(),
            ],
        ]);

        return $this->serializeThreadState($confirmation);
    }

    public function interpretUserReply(?string $message): ?string
    {
        $normalized = str($message ?? '')->lower()->squish()->toString();

        if ($normalized === '') {
            return null;
        }

        if (in_array($normalized, ['confirm', 'i confirm', 'approve', 'i approve', 'yes', 'yes do it', 'go ahead', 'proceed', 'do it'], true)) {
            return 'approve';
        }

        if (in_array($normalized, ['reject', 'cancel', 'never mind', 'dont do it', "don't do it", 'do not do it'], true)) {
            return 'reject';
        }

        return null;
    }

    private function serializeThreadState(AssistantActionConfirmation $confirmation, ?array $result = null): array
    {
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

    private function approvedMessageContent(AssistantActionConfirmation $confirmation, array $result, array $followUpResults): string
    {
        $summary = $confirmation->fresh()->toApiArray()['presentation']['summary'] ?? null;
        $boardContext = collect($followUpResults)->firstWhere('type', 'board_context');

        return match ($result['type'] ?? null) {
            'board_issue_move' => filled($summary)
                ? $summary.' Executed. '.$this->boardContextSentence($boardContext)
                : 'Issue move executed.',
            'board_issue_bulk_move' => filled($summary)
                ? $summary.' Executed. '.$this->boardContextSentence($boardContext)
                : 'Bulk issue move executed.',
            default => filled($summary)
                ? $summary.' Executed.'
                : 'Confirmed action executed.',
        };
    }

    private function rejectedMessageContent(AssistantActionConfirmation $confirmation): string
    {
        $summary = $confirmation->fresh()->toApiArray()['presentation']['summary'] ?? null;

        return filled($summary)
            ? $summary.' Rejected.'
            : 'Confirmed action rejected.';
    }

    private function followUpToolResults(User $user, array $result): array
    {
        try {
            return match ($result['type'] ?? null) {
                'board_issue_move', 'board_issue_bulk_move' => isset($result['board']['id'])
                    ? [
                        $this->toolExecutor->execute(
                            user: $user,
                            toolName: 'get_board_context',
                            payload: ['board_id' => $result['board']['id']],
                        ),
                    ]
                    : [],
                default => [],
            };
        } catch (Throwable) {
            return [];
        }
    }

    private function boardContextSentence(?array $boardContext): string
    {
        if (! is_array($boardContext)) {
            return '';
        }

        $columnSummaries = collect($boardContext['columns'] ?? [])
            ->map(function (array $column): string {
                $issueCount = count($column['issues'] ?? []);

                return sprintf('%s: %d', $column['name'] ?? 'Column', $issueCount);
            })
            ->implode(', ');

        $backlogCount = count($boardContext['backlog'] ?? []);

        return trim(sprintf(
            'Current board state: backlog %d. %s.',
            $backlogCount,
            $columnSummaries !== '' ? $columnSummaries : 'No columns available'
        ));
    }

    private function guard(User $user, AssistantActionConfirmation $confirmation): void
    {
        if ($confirmation->user_id !== $user->id || $confirmation->status !== 'pending') {
            throw new UnauthorizedException;
        }
    }
}
