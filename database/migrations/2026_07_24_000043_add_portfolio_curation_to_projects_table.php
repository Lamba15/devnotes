<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->boolean('is_published')->default(false)->after('image_path');
            $table->boolean('is_featured')->default(false)->after('is_published');
            $table->unsignedInteger('sort_order')->default(0)->after('is_featured');
            $table->string('portfolio_category')->nullable()->after('sort_order');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['is_published', 'is_featured', 'sort_order', 'portfolio_category']);
        });
    }
};
