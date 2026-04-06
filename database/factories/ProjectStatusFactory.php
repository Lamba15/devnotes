<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\ProjectStatus;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProjectStatus>
 */
class ProjectStatusFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->word();

        return [
            'client_id' => null,
            'name' => Str::title($name),
            'slug' => Str::slug($name),
            'is_system' => false,
        ];
    }

    public function forClient(Client $client): static
    {
        return $this->state(fn () => ['client_id' => $client->id]);
    }
}
