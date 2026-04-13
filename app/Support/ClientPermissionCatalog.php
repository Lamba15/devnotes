<?php

namespace App\Support;

final class ClientPermissionCatalog
{
    public const MEMBERS_READ = 'members.read';

    public const MEMBERS_WRITE = 'members.write';

    public const PROJECTS_READ = 'projects.read';

    public const PROJECTS_WRITE = 'projects.write';

    public const ISSUES_READ = 'issues.read';

    public const ISSUES_WRITE = 'issues.write';

    public const BOARDS_READ = 'boards.read';

    public const BOARDS_WRITE = 'boards.write';

    public const STATUSES_READ = 'statuses.read';

    public const STATUSES_WRITE = 'statuses.write';

    public const FINANCE_READ = 'finance.read';

    public const FINANCE_WRITE = 'finance.write';

    public const ASSISTANT_USE = 'assistant.use';

    public static function all(): array
    {
        return [
            self::MEMBERS_READ,
            self::MEMBERS_WRITE,
            self::PROJECTS_READ,
            self::PROJECTS_WRITE,
            self::ISSUES_READ,
            self::ISSUES_WRITE,
            self::BOARDS_READ,
            self::BOARDS_WRITE,
            self::STATUSES_READ,
            self::STATUSES_WRITE,
            self::FINANCE_READ,
            self::FINANCE_WRITE,
            self::ASSISTANT_USE,
        ];
    }

    public static function normalize(array $permissions): array
    {
        $normalized = collect($permissions)
            ->filter(fn (mixed $permission) => is_string($permission) && in_array($permission, self::all(), true))
            ->values()
            ->all();

        foreach ($normalized as $permission) {
            $readPermission = self::readPermissionFor($permission);

            if ($readPermission !== null) {
                $normalized[] = $readPermission;
            }
        }

        return collect($normalized)
            ->unique()
            ->values()
            ->all();
    }

    public static function readPermissionFor(string $permission): ?string
    {
        return match ($permission) {
            self::MEMBERS_WRITE => self::MEMBERS_READ,
            self::PROJECTS_WRITE => self::PROJECTS_READ,
            self::ISSUES_WRITE => self::ISSUES_READ,
            self::BOARDS_WRITE => self::BOARDS_READ,
            self::STATUSES_WRITE => self::STATUSES_READ,
            self::FINANCE_WRITE => self::FINANCE_READ,
            default => null,
        };
    }
}
