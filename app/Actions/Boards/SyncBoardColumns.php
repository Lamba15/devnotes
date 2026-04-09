<?php

namespace App\Actions\Boards;

use App\Models\Board;

class SyncBoardColumns
{
    public function handle(Board $board, array $columns): void
    {
        $existingColumns = $board->columns()->get()->keyBy('id');
        $keptColumnIds = [];

        foreach (array_values($columns) as $index => $attributes) {
            $columnId = isset($attributes['id']) ? (int) $attributes['id'] : null;
            $column = $columnId ? $existingColumns->get($columnId) : null;

            $payload = [
                'name' => trim((string) $attributes['name']),
                'position' => $index + 1,
                'updates_status' => (bool) ($attributes['updates_status'] ?? false),
                'mapped_status' => ($attributes['updates_status'] ?? false)
                    ? filled($attributes['mapped_status'] ?? null)
                        ? (string) $attributes['mapped_status']
                        : null
                    : null,
            ];

            if ($column) {
                $column->fill($payload)->save();
                $keptColumnIds[] = $column->id;

                continue;
            }

            $createdColumn = $board->columns()->create($payload);
            $keptColumnIds[] = $createdColumn->id;
        }

        if ($keptColumnIds === []) {
            $board->columns()->delete();

            return;
        }

        $board->columns()->whereNotIn('id', $keptColumnIds)->delete();
    }
}
