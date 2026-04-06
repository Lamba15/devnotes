<?php

namespace App\AI\Contracts;

interface AssistantModelClient
{
    public function respond(array $messages, array $tools = []): array;
}
