<?php

namespace App\AI;

use App\AI\Contracts\AssistantModelClient;
use Illuminate\Support\Facades\File;
use RuntimeException;

class ConfiguredFakeAssistantModelClient implements AssistantModelClient
{
    public function __construct(
        private readonly string $fixturePath,
    ) {}

    public function respond(array $messages, array $tools = []): array
    {
        $rules = $this->loadRules();
        $lastUserMessage = collect($messages)
            ->reverse()
            ->first(fn (array $message) => ($message['role'] ?? null) === 'user');

        $content = (string) ($lastUserMessage['content'] ?? '');

        foreach ($rules as $rule) {
            $captures = $this->capturesForRule($rule, $content);

            if ($captures === null) {
                continue;
            }

            return $this->interpolateResponse($rule['response'] ?? [], $captures);
        }

        return [
            'content' => 'No fake assistant response matched the current message.',
            'tool_calls' => [],
            'trace' => [
                'provider' => 'configured_fake',
                'model' => 'fake',
                'configured_via' => 'fixture',
            ],
        ];
    }

    private function loadRules(): array
    {
        if (! File::exists($this->fixturePath)) {
            throw new RuntimeException("Fake assistant fixture [{$this->fixturePath}] was not found.");
        }

        $decoded = json_decode(File::get($this->fixturePath), true);

        if (! is_array($decoded) || ! is_array($decoded['rules'] ?? null)) {
            throw new RuntimeException("Fake assistant fixture [{$this->fixturePath}] has an invalid format.");
        }

        return $decoded['rules'];
    }

    private function capturesForRule(array $rule, string $content): ?array
    {
        if (isset($rule['contains']) && is_string($rule['contains'])) {
            return str_contains($content, $rule['contains']) ? [] : null;
        }

        if (isset($rule['pattern']) && is_string($rule['pattern'])) {
            $matches = [];

            return preg_match($rule['pattern'], $content, $matches) === 1 ? $matches : null;
        }

        return null;
    }

    private function interpolateResponse(array $response, array $captures): array
    {
        return collect($response)->map(
            fn (mixed $value) => $this->interpolateValue($value, $captures)
        )->all();
    }

    private function interpolateValue(mixed $value, array $captures): mixed
    {
        if (is_string($value)) {
            return preg_replace_callback('/\{\{(\d+)}}/', function (array $matches) use ($captures): string {
                $captureIndex = (int) $matches[1];

                return (string) ($captures[$captureIndex] ?? '');
            }, $value);
        }

        if (is_array($value)) {
            return collect($value)->map(
                fn (mixed $nestedValue) => $this->interpolateValue($nestedValue, $captures)
            )->all();
        }

        return $value;
    }
}
