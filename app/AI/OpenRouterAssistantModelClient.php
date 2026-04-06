<?php

namespace App\AI;

use App\AI\Contracts\AssistantModelClient;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

class OpenRouterAssistantModelClient implements AssistantModelClient
{
    public function __construct(
        private readonly HttpFactory $http,
    ) {}

    public function respond(array $messages, array $tools = []): array
    {
        $user = Auth::user();
        $apiKey = $user?->openrouter_api_key ?: config('services.openrouter.api_key');
        $model = $user?->openrouter_model ?: config('services.openrouter.model');

        if (! $apiKey || ! $model) {
            return [
                'content' => 'The assistant is not configured yet.',
                'tool_calls' => [],
                'trace' => [
                    'provider' => 'openrouter',
                    'model' => $model,
                    'configured_via' => ($user?->openrouter_model || $user?->openrouter_api_key) ? 'user_settings' : 'env',
                ],
            ];
        }

        $response = $this->http
            ->withToken($apiKey)
            ->acceptJson()
            ->post(config('services.openrouter.base_url').'/chat/completions', [
                'model' => $model,
                'messages' => $messages,
                'tools' => $this->normalizeTools($tools),
            ])
            ->throw()
            ->json();

        $message = data_get($response, 'choices.0.message');

        if (! is_array($message)) {
            throw new RuntimeException('OpenRouter returned an unexpected response payload.');
        }

        return [
            'content' => (string) ($message['content'] ?? ''),
            'tool_calls' => collect($message['tool_calls'] ?? [])
                ->map(fn (array $toolCall) => [
                    'id' => $toolCall['id'] ?? null,
                    'name' => data_get($toolCall, 'function.name'),
                    'arguments' => json_decode((string) data_get($toolCall, 'function.arguments', '{}'), true) ?? [],
                ])
                ->values()
                ->all(),
            'trace' => [
                'provider' => 'openrouter',
                'model' => $model,
                'configured_via' => ($user?->openrouter_model || $user?->openrouter_api_key) ? 'user_settings' : 'env',
                'usage' => [
                    'prompt_tokens' => data_get($response, 'usage.prompt_tokens'),
                    'completion_tokens' => data_get($response, 'usage.completion_tokens'),
                    'total_tokens' => data_get($response, 'usage.total_tokens'),
                ],
            ],
        ];
    }

    private function normalizeTools(array $tools): array
    {
        return collect($tools)->map(fn (array $tool) => [
            'type' => 'function',
            'function' => [
                'name' => $tool['name'],
                'description' => $tool['description'],
                'parameters' => $tool['input_schema'],
            ],
        ])->values()->all();
    }
}
