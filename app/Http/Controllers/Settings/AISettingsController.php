<?php

namespace App\Http\Controllers\Settings;

use App\AI\DefaultAssistantSystemPrompt;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\AISettingsUpdateRequest;
use App\Models\AuditLog;
use App\Models\PlatformAiConfig;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class AISettingsController extends Controller
{
    public function edit(): Response
    {
        $config = PlatformAiConfig::current();

        return Inertia::render('settings/ai', [
            'hasOpenRouterApiKey' => filled($config?->openrouter_api_key),
            'openRouterModel' => $config?->openrouter_model,
            'openRouterSystemPrompt' => $config?->openrouter_system_prompt,
            'defaultSystemPrompt' => DefaultAssistantSystemPrompt::make(),
            'activeSystemPromptSource' => filled($config?->openrouter_system_prompt) ? 'custom' : 'default',
            'openRouterModels' => $this->openRouterModels(),
        ]);
    }

    public function update(AISettingsUpdateRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $config = PlatformAiConfig::currentOrCreate();

        $config->forceFill([
            'openrouter_model' => $validated['openrouter_model'] ?: null,
            'openrouter_api_key' => filled($validated['openrouter_api_key'])
                ? $validated['openrouter_api_key']
                : $config->openrouter_api_key,
            'openrouter_system_prompt' => filled($validated['openrouter_system_prompt'] ?? null)
                ? $validated['openrouter_system_prompt']
                : null,
        ])->save();

        AuditLog::query()->create([
            'user_id' => $request->user()->id,
            'event' => 'platform.ai_settings_updated',
            'source' => 'web',
            'subject_type' => PlatformAiConfig::class,
            'subject_id' => $config->id,
            'after_json' => [
                'openrouter_model' => $config->openrouter_model,
                'has_custom_prompt' => filled($config->openrouter_system_prompt),
            ],
        ]);

        return to_route('ai-settings.edit');
    }

    private function openRouterModels(): array
    {
        $fallbackModels = collect(config('services.openrouter.models', []))
            ->map(fn (string $model) => [
                'value' => $model,
                'label' => $model,
            ])
            ->values()
            ->all();

        try {
            $response = Http::acceptJson()
                ->timeout(10)
                ->get(rtrim((string) config('services.openrouter.base_url'), '/').'/models')
                ->throw()
                ->json('data');

            if (! is_array($response)) {
                return $fallbackModels;
            }

            return collect($response)
                ->filter(fn (mixed $model) => is_array($model) && filled($model['id'] ?? null))
                ->map(fn (array $model) => [
                    'value' => (string) $model['id'],
                    'label' => filled($model['name'] ?? null)
                        ? trim((string) $model['name']).' ('.$model['id'].')'
                        : (string) $model['id'],
                ])
                ->sortBy('label')
                ->values()
                ->all();
        } catch (\Throwable) {
            return $fallbackModels;
        }
    }
}
