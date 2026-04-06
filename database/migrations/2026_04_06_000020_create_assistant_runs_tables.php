<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assistant_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('thread_id')->constrained('assistant_threads')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_message_id')->nullable()->constrained('assistant_messages')->nullOnDelete();
            $table->foreignId('assistant_message_id')->nullable()->constrained('assistant_messages')->nullOnDelete();
            $table->string('status');
            $table->string('provider')->nullable();
            $table->string('configured_model')->nullable();
            $table->string('effective_model')->nullable();
            $table->string('system_prompt_source')->nullable();
            $table->unsignedInteger('model_runs')->default(0);
            $table->unsignedInteger('reruns')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->string('error_type')->nullable();
            $table->text('error_message')->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();
        });

        Schema::create('assistant_tool_executions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('run_id')->constrained('assistant_runs')->cascadeOnDelete();
            $table->foreignId('confirmation_id')->nullable()->constrained('assistant_action_confirmations')->nullOnDelete();
            $table->string('tool_name');
            $table->string('tool_call_id')->nullable();
            $table->string('status');
            $table->string('result_type')->nullable();
            $table->boolean('requires_confirmation')->default(false);
            $table->json('arguments_json')->nullable();
            $table->json('result_json')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();
        });

        Schema::create('assistant_run_phases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('run_id')->constrained('assistant_runs')->cascadeOnDelete();
            $table->string('key');
            $table->string('title');
            $table->string('status');
            $table->text('summary')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistant_run_phases');
        Schema::dropIfExists('assistant_tool_executions');
        Schema::dropIfExists('assistant_runs');
    }
};
