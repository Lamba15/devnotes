<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['openrouter_api_key', 'openrouter_model', 'openrouter_system_prompt'])]
class PlatformAiConfig extends Model
{
    protected function casts(): array
    {
        return [
            'openrouter_api_key' => 'encrypted',
        ];
    }

    public static function current(): ?self
    {
        return static::query()->first();
    }

    public static function currentOrCreate(): self
    {
        return static::query()->firstOrCreate([]);
    }
}
