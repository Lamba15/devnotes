<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_sessions', function (Blueprint $table) {
            $table->id();
            $table->char('session_key', 64)->unique();
            $table->char('visitor_key', 64)->index();
            $table->timestamp('started_at')->index();
            $table->timestamp('last_seen_at')->index();
            $table->string('landing_path', 500);
            $table->string('exit_path', 500)->nullable();
            $table->unsignedInteger('page_view_count')->default(0);
            $table->unsignedInteger('event_count')->default(0);
            $table->unsignedInteger('key_event_count')->default(0);
            $table->unsignedInteger('engaged_seconds')->default(0);
            $table->unsignedTinyInteger('max_scroll_depth')->default(0);
            $table->string('referrer_host')->nullable();
            $table->string('referrer_path', 500)->nullable();
            $table->string('utm_source')->nullable();
            $table->string('utm_medium')->nullable();
            $table->string('utm_campaign')->nullable();
            $table->string('device_type', 20)->nullable()->index();
            $table->string('browser', 40)->nullable();
            $table->string('language', 20)->nullable();
            $table->string('timezone', 64)->nullable();
            $table->char('country_code', 2)->nullable();
            $table->timestamps();
        });

        Schema::create('analytics_page_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('analytics_session_id')->constrained()->cascadeOnDelete();
            $table->uuid('page_view_uuid')->unique();
            $table->char('visitor_key', 64)->index();
            $table->timestamp('occurred_at')->index();
            $table->string('path', 500);
            $table->string('title')->nullable();
            $table->string('page_type', 40)->index();
            $table->string('content_id', 100)->nullable()->index();
            $table->string('content_name')->nullable();
            $table->string('referrer_path', 500)->nullable();
            $table->unsignedInteger('engaged_seconds')->default(0);
            $table->unsignedTinyInteger('max_scroll_depth')->default(0);
            $table->timestamps();

            $table->index(['page_type', 'occurred_at']);
        });

        Schema::create('analytics_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('analytics_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('analytics_page_view_id')->nullable()->constrained()->nullOnDelete();
            $table->uuid('event_uuid')->unique();
            $table->char('visitor_key', 64)->index();
            $table->timestamp('occurred_at')->index();
            $table->string('name', 64)->index();
            $table->string('path', 500);
            $table->string('page_type', 40)->index();
            $table->string('content_id', 100)->nullable()->index();
            $table->string('label')->nullable();
            $table->string('target_host')->nullable();
            $table->json('properties')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['name', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_events');
        Schema::dropIfExists('analytics_page_views');
        Schema::dropIfExists('analytics_sessions');
    }
};
