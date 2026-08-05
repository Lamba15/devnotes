<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'session_key',
    'visitor_key',
    'started_at',
    'last_seen_at',
    'landing_path',
    'exit_path',
    'page_view_count',
    'event_count',
    'key_event_count',
    'engaged_seconds',
    'max_scroll_depth',
    'referrer_host',
    'referrer_path',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'device_type',
    'browser',
    'language',
    'timezone',
    'country_code',
])]
class AnalyticsSession extends Model
{
    protected function casts(): array
    {
        return [
            'started_at' => 'immutable_datetime',
            'last_seen_at' => 'immutable_datetime',
            'page_view_count' => 'integer',
            'event_count' => 'integer',
            'key_event_count' => 'integer',
            'engaged_seconds' => 'integer',
            'max_scroll_depth' => 'integer',
        ];
    }

    public function pageViews(): HasMany
    {
        return $this->hasMany(AnalyticsPageView::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(AnalyticsEvent::class);
    }
}
