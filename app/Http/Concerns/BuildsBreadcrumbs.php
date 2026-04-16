<?php

namespace App\Http\Concerns;

use App\Models\Board;
use App\Models\Client;
use App\Models\Project;

trait BuildsBreadcrumbs
{
    /**
     * @param  array{title: string, href: string}  ...$items
     * @return array<int, array{title: string, href: string}>
     */
    protected function breadcrumbs(array ...$items): array
    {
        return array_values(array_filter($items));
    }

    /**
     * @return array{title: string, href: string, meta?: string}
     */
    protected function crumb(string $title, string $href, ?string $meta = null): array
    {
        return array_filter([
            'title' => $title,
            'href' => $href,
            'meta' => $meta,
        ], fn ($v) => $v !== null);
    }

    // ── Common ancestors ─────────────────────────────────────────

    protected function clientsCrumb(): array
    {
        return $this->crumb('Clients', '/clients');
    }

    protected function clientCrumb(Client $client, ?string $behaviorName = null): array
    {
        return $this->crumb($client->name, "/clients/{$client->id}", $behaviorName);
    }

    protected function projectsCrumb(Client $client): array
    {
        return $this->crumb('Projects', "/clients/{$client->id}/projects");
    }

    protected function projectCrumb(Client $client, Project $project): array
    {
        return $this->crumb($project->name, "/clients/{$client->id}/projects/{$project->id}");
    }

    protected function issuesCrumb(Client $client, Project $project): array
    {
        return $this->crumb('Issues', "/clients/{$client->id}/projects/{$project->id}/issues");
    }

    protected function boardsCrumb(Client $client): array
    {
        return $this->crumb('Boards', "/clients/{$client->id}/boards");
    }

    protected function boardCrumb(Client $client, Board $board): array
    {
        return $this->crumb($board->name, "/clients/{$client->id}/projects/{$board->project_id}/boards/{$board->id}");
    }

    protected function membersCrumb(Client $client): array
    {
        return $this->crumb('Members', "/clients/{$client->id}/members");
    }

    protected function statusesCrumb(Client $client): array
    {
        return $this->crumb('Statuses', "/clients/{$client->id}/statuses");
    }

    protected function financeCrumb(): array
    {
        return $this->crumb('Finance', '/finance/transactions');
    }

    protected function invoicesCrumb(): array
    {
        return $this->crumb('Invoices', '/finance/invoices');
    }

    protected function transactionsCrumb(): array
    {
        return $this->crumb('Transactions', '/finance/transactions');
    }

    protected function clientFinanceCrumb(Client $client): array
    {
        return $this->crumb('Finance', "/clients/{$client->id}/finance");
    }

    protected function secretsCrumb(Client $client, Project $project): array
    {
        return $this->crumb('Secrets', "/clients/{$client->id}/projects/{$project->id}");
    }
}
