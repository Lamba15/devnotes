<?php

use App\Models\AssistantThread;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        AssistantThread::query()
            ->with(['messages' => fn ($query) => $query->where('role', 'user')->orderBy('id')])
            ->where(function ($query): void {
                $query->whereNull('title')
                    ->orWhere('title', '')
                    ->orWhere('title', 'New chat');
            })
            ->chunkById(100, function ($threads): void {
                foreach ($threads as $thread) {
                    $firstUserMessage = $thread->messages->first();

                    if (! $firstUserMessage?->content) {
                        continue;
                    }

                    $thread->forceFill([
                        'title' => str($firstUserMessage->content)
                            ->squish()
                            ->limit(60, '')
                            ->toString(),
                    ])->save();
                }
            });
    }

    public function down(): void
    {
        // No-op: backfilled titles should not be reverted.
    }
};
