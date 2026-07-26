<?php

namespace App\Http\Resources\Portfolio;

use App\Models\ContentSection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ContentSection
 */
class ContentSectionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'key' => $this->key,
            'title' => $this->title,
            'body_markdown' => $this->body_markdown,
            'metadata' => $this->metadata,
            'sort_order' => $this->sort_order,
        ];
    }
}
