<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class AISettingsUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'openrouter_api_key' => ['nullable', 'string', 'max:2048'],
            'openrouter_model' => ['nullable', 'string', 'max:255'],
            'openrouter_system_prompt' => ['nullable', 'string', 'max:20000'],
        ];
    }
}
