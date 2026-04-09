<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('origin')->nullable()->after('date_of_first_interaction');
            $table->json('social_links_json')->nullable()->after('origin');
        });

        Schema::create('client_phone_numbers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->string('label')->nullable();
            $table->string('number');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('client_tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_tags');
        Schema::dropIfExists('client_phone_numbers');

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['origin', 'social_links_json']);
        });
    }
};
