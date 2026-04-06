<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('behavior_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('image_path')->nullable();
            $table->string('email')->nullable();
            $table->string('country_of_origin')->nullable();
            $table->string('industry')->nullable();
            $table->text('address')->nullable();
            $table->date('birthday')->nullable();
            $table->date('date_of_first_interaction')->nullable();
            $table->longText('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
