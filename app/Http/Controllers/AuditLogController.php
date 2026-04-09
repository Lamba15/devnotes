<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::query()
            ->with('user:id,name,email')
            ->orderByDesc('created_at');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('event', 'like', "%{$search}%")
                    ->orWhere('source', 'like', "%{$search}%")
                    ->orWhere('subject_type', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        if ($event = $request->input('event')) {
            $query->where('event', $event);
        }

        if ($source = $request->input('source')) {
            $query->where('source', $source);
        }

        $paginated = $query->paginate(25);
        $logs = $paginated->items();
        $pagination = [
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ];

        $eventOptions = AuditLog::query()
            ->select('event')
            ->distinct()
            ->orderBy('event')
            ->pluck('event')
            ->all();

        $sourceOptions = AuditLog::query()
            ->select('source')
            ->distinct()
            ->orderBy('source')
            ->pluck('source')
            ->all();

        return Inertia::render('audit-logs/index', [
            'logs' => $logs,
            'pagination' => $pagination,
            'filters' => [
                'search' => $request->input('search', ''),
                'event' => $request->input('event', ''),
                'source' => $request->input('source', ''),
            ],
            'event_options' => $eventOptions,
            'source_options' => $sourceOptions,
        ]);
    }
}
