<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assistant_threads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('context_type')->nullable();
            $table->unsignedBigInteger('context_id')->nullable();
            $table->timestamps();
        });

        Schema::create('assistant_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('thread_id')->constrained('assistant_threads')->cascadeOnDelete();
            $table->string('role');
            $table->longText('content')->nullable();
            $table->json('tool_calls_json')->nullable();
            $table->json('tool_results_json')->nullable();
            $table->timestamps();
        });

        Schema::create('assistant_action_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('thread_id')->constrained('assistant_threads')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('tool_name');
            $table->json('payload_json');
            $table->string('status');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistant_action_confirmations');
        Schema::dropIfExists('assistant_messages');
        Schema::dropIfExists('assistant_threads');
    }
};
