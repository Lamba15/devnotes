<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->firstOrCreate([
            'email' => 'owner@devnotes.test',
        ], [
            'name' => 'Platform Owner',
            'password' => 'password',
            'email_verified_at' => now(),
            'ai_credits' => -1,
            'ai_credits_used' => 0,
        ]);

        User::query()->firstOrCreate([
            'email' => 'test@example.com',
        ], [
            'name' => 'Test User',
            'password' => 'password',
            'email_verified_at' => now(),
            'ai_credits' => -1,
            'ai_credits_used' => 0,
        ]);

        $this->call(LegacyFullSeeder::class);
    }
}
