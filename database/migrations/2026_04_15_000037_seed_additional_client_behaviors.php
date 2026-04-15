<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    private array $labels = [
        'My Friend',
        'Nice Person',
        "Don't Like",
        'Formal Relations',
    ];

    public function up(): void
    {
        $now = now();
        foreach ($this->labels as $name) {
            $slug = Str::slug($name);
            $exists = DB::table('behaviors')->where('slug', $slug)->exists();
            if ($exists) {
                continue;
            }
            DB::table('behaviors')->insert([
                'name' => $name,
                'slug' => $slug,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        foreach ($this->labels as $name) {
            DB::table('behaviors')->where('slug', Str::slug($name))->delete();
        }
    }
};
