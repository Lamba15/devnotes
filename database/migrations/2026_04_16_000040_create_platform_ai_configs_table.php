<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_ai_configs', function (Blueprint $table) {
            $table->id();
            $table->text('openrouter_api_key')->nullable();
            $table->string('openrouter_model')->nullable();
            $table->text('openrouter_system_prompt')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_ai_configs');
    }
};
