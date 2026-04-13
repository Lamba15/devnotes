<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_memberships', function (Blueprint $table) {
            $table->boolean('can_access_finance')->default(false)->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('client_memberships', function (Blueprint $table) {
            $table->dropColumn('can_access_finance');
        });
    }
};
