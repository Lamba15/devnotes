<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('secret_entries', function (Blueprint $table) {
            $table->id();
            $table->morphs('secretable');
            $table->string('label');
            $table->longText('description')->nullable();
            $table->longText('secret_value');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('secret_entries');
    }
};
