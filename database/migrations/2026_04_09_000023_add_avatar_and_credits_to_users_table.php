<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_path')->nullable()->after('name');
            $table->string('job_title')->nullable()->after('avatar_path');
            $table->string('timezone')->nullable()->after('job_title');
            $table->integer('ai_credits')->default(0)->after('timezone');
            $table->integer('ai_credits_used')->default(0)->after('ai_credits');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avatar_path', 'job_title', 'timezone', 'ai_credits', 'ai_credits_used']);
        });
    }
};
