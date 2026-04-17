<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('issues', 'assignee_id')) {
            return;
        }

        DB::statement(<<<'SQL'
            INSERT INTO issue_assignees (issue_id, user_id, created_at, updated_at)
            SELECT id, assignee_id, COALESCE(created_at, CURRENT_TIMESTAMP), COALESCE(updated_at, CURRENT_TIMESTAMP)
            FROM issues
            WHERE assignee_id IS NOT NULL
        SQL);

        Schema::table('issues', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('assignee_id');
        });
    }

    public function down(): void
    {
        // Lossy rollback: if an issue has multiple assignees in the pivot, we
        // keep only the lowest-id one so the FK can be re-added.
        if (Schema::hasColumn('issues', 'assignee_id')) {
            return;
        }

        Schema::table('issues', function (Blueprint $table): void {
            $table->foreignId('assignee_id')->nullable()->after('type')
                ->constrained('users')->nullOnDelete();
        });

        $rows = DB::table('issue_assignees')
            ->select('issue_id', DB::raw('MIN(user_id) as user_id'))
            ->groupBy('issue_id')
            ->get();

        foreach ($rows as $row) {
            DB::table('issues')->where('id', $row->issue_id)->update([
                'assignee_id' => $row->user_id,
            ]);
        }
    }
};
