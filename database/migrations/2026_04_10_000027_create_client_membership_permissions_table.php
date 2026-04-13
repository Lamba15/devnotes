<?php

use App\Support\ClientPermissionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('client_membership_permissions')) {
            Schema::drop('client_membership_permissions');
        }

        Schema::create('client_membership_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_membership_id')->constrained()->cascadeOnDelete();
            $table->string('permission_name');
            $table->foreignId('granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['client_membership_id', 'permission_name'],
                'cmp_permissions_membership_permission_unique',
            );
        });

        if (! Schema::hasColumn('client_memberships', 'can_access_finance')) {
            return;
        }

        DB::table('client_memberships')
            ->select(['id', 'role', 'can_access_finance', 'created_by'])
            ->orderBy('id')
            ->chunkById(100, function ($memberships): void {
                foreach ($memberships as $membership) {
                    $legacyRole = $membership->role;
                    $nextRole = $legacyRole === 'viewer' ? 'member' : $legacyRole;

                    if ($nextRole !== $legacyRole) {
                        DB::table('client_memberships')
                            ->where('id', $membership->id)
                            ->update(['role' => $nextRole]);
                    }

                    $permissions = match ($legacyRole) {
                        'viewer' => [
                            ClientPermissionCatalog::PROJECTS_READ,
                            ClientPermissionCatalog::ISSUES_READ,
                            ClientPermissionCatalog::BOARDS_READ,
                        ],
                        'member' => [
                            ClientPermissionCatalog::PROJECTS_READ,
                            ClientPermissionCatalog::ISSUES_READ,
                            ClientPermissionCatalog::ISSUES_WRITE,
                            ClientPermissionCatalog::BOARDS_READ,
                            ClientPermissionCatalog::BOARDS_WRITE,
                        ],
                        default => [],
                    };

                    if ((bool) $membership->can_access_finance) {
                        $permissions[] = ClientPermissionCatalog::FINANCE_READ;
                        $permissions[] = ClientPermissionCatalog::FINANCE_WRITE;
                    }

                    foreach (ClientPermissionCatalog::normalize($permissions) as $permission) {
                        DB::table('client_membership_permissions')->insertOrIgnore([
                            'client_membership_id' => $membership->id,
                            'permission_name' => $permission,
                            'granted_by' => $membership->created_by,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            });

        Schema::table('client_memberships', function (Blueprint $table) {
            $table->dropColumn('can_access_finance');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('client_memberships', 'can_access_finance')) {
            Schema::table('client_memberships', function (Blueprint $table) {
                $table->boolean('can_access_finance')->default(false)->after('role');
            });
        }

        Schema::dropIfExists('client_membership_permissions');
    }
};
