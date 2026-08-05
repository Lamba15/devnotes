<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAnalyticsEventsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'visitor_id' => ['required', 'uuid'],
            'session_id' => ['required', 'uuid'],
            'context' => ['nullable', 'array', 'max:8'],
            'context.language' => ['nullable', 'string', 'max:20'],
            'context.timezone' => ['nullable', 'string', 'max:64'],
            'context.screen_width' => ['nullable', 'integer', 'min:0', 'max:20000'],
            'context.viewport_width' => ['nullable', 'integer', 'min:0', 'max:20000'],
            'context.browser' => ['nullable', 'string', 'max:40'],
            'context.device_type' => ['nullable', Rule::in(['desktop', 'tablet', 'mobile'])],
            'events' => ['required', 'array', 'min:1', 'max:20'],
            'events.*.id' => ['required', 'uuid'],
            'events.*.name' => ['required', Rule::in([
                'page_view',
                'engagement',
                'navigation_click',
                'external_link_click',
                'project_outbound_click',
                'whatsapp_click',
                'contact_click',
                'cta_click',
                'presentation_open',
                'video_start',
                'video_progress',
                'video_complete',
            ])],
            'events.*.page_view_id' => ['required', 'uuid'],
            'events.*.path' => ['required', 'string', 'max:1000'],
            'events.*.title' => ['nullable', 'string', 'max:255'],
            'events.*.page_type' => ['required', Rule::in([
                'home',
                'projects_index',
                'project',
                'education',
                'lecture',
                'other',
            ])],
            'events.*.content_id' => ['nullable', 'string', 'max:100'],
            'events.*.content_name' => ['nullable', 'string', 'max:255'],
            'events.*.referrer_host' => ['nullable', 'string', 'max:255'],
            'events.*.referrer_path' => ['nullable', 'string', 'max:1000'],
            'events.*.utm_source' => ['nullable', 'string', 'max:100'],
            'events.*.utm_medium' => ['nullable', 'string', 'max:100'],
            'events.*.utm_campaign' => ['nullable', 'string', 'max:150'],
            'events.*.engaged_seconds' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'events.*.scroll_depth' => ['nullable', 'integer', 'min:0', 'max:100'],
            'events.*.label' => ['nullable', 'string', 'max:255'],
            'events.*.target_host' => ['nullable', 'string', 'max:255'],
            'events.*.properties' => ['nullable', 'array', 'max:8'],
        ];
    }
}
