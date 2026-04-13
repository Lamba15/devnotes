<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'label',
    'description',
    'secret_value',
])]
#[Hidden([
    'secret_value',
])]
class SecretEntry extends Model
{
    protected function casts(): array
    {
        return [
            'secret_value' => 'encrypted',
        ];
    }

    public function secretable(): MorphTo
    {
        return $this->morphTo();
    }
}
