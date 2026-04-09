<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->date('due_date')->nullable()->after('type');
            $table->string('estimated_hours')->nullable()->after('due_date');
            $table->string('label')->nullable()->after('estimated_hours');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->decimal('budget', 12, 2)->nullable()->after('notes');
            $table->string('currency', 3)->default('USD')->after('budget');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->string('currency', 3)->default('USD')->after('amount');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->string('category')->nullable()->after('amount');
            $table->string('currency', 3)->default('USD')->after('category');
        });
    }

    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->dropColumn(['due_date', 'estimated_hours', 'label']);
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['budget', 'currency']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['currency']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['category', 'currency']);
        });
    }
};
