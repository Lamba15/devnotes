<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'analytics_session_id',
    'page_view_uuid',
    'visitor_key',
    'occurred_at',
    'path',
    'title',
    'page_type',
    'content_id',
    'content_name',
    'referrer_path',
    'engaged_seconds',
    'max_scroll_depth',
])]
class AnalyticsPageView extends Model
{
    protected function casts(): array
    {
        return [
            'occurred_at' => 'immutable_datetime',
            'engaged_seconds' => 'integer',
            'max_scroll_depth' => 'integer',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AnalyticsSession::class, 'analytics_session_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(AnalyticsEvent::class);
    }
}
