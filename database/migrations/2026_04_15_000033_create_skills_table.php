<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('skills', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->string('icon')->nullable();
            $table->timestamps();
        });

        $defaults = [
            'Linux', 'AWS', 'React', 'Laravel', 'PHP', 'MySQL', 'TypeScript',
            'JavaScript', 'Node.js', 'Tailwind', 'Inertia', 'Vite',
            'Docker', 'Git', 'Figma',
        ];

        $now = now();
        $rows = [];
        foreach ($defaults as $name) {
            $rows[] = [
                'name' => $name,
                'slug' => Str::slug($name),
                'icon' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('skills')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('skills');
    }
};
