<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'analytics_session_id',
    'analytics_page_view_id',
    'event_uuid',
    'visitor_key',
    'occurred_at',
    'name',
    'path',
    'page_type',
    'content_id',
    'label',
    'target_host',
    'properties',
])]
class AnalyticsEvent extends Model
{
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'occurred_at' => 'immutable_datetime',
            'properties' => 'array',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AnalyticsSession::class, 'analytics_session_id');
    }

    public function pageView(): BelongsTo
    {
        return $this->belongsTo(AnalyticsPageView::class, 'analytics_page_view_id');
    }
}
