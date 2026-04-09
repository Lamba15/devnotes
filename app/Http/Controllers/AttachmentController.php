<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AttachmentController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240'],
            'attachable_type' => ['required', 'string', 'in:issue,issue_comment'],
            'attachable_id' => ['required', 'integer'],
        ]);

        $file = $request->file('file');
        $path = $file->store('attachments', 'public');

        $morphMap = [
            'issue' => \App\Models\Issue::class,
            'issue_comment' => \App\Models\IssueComment::class,
        ];

        $attachment = Attachment::query()->create([
            'attachable_type' => $morphMap[$request->attachable_type],
            'attachable_id' => $request->attachable_id,
            'uploaded_by' => $request->user()->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()->id,
            'event' => 'attachment.uploaded',
            'source' => 'web',
            'subject_type' => Attachment::class,
            'subject_id' => $attachment->id,
            'after_json' => [
                'file_name' => $attachment->file_name,
                'mime_type' => $attachment->mime_type,
                'attachable_type' => $request->attachable_type,
                'attachable_id' => $request->attachable_id,
            ],
        ]);

        return response()->json([
            'attachment' => [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'file_path' => $attachment->file_path,
                'mime_type' => $attachment->mime_type,
                'file_size' => $attachment->file_size,
                'url' => Storage::disk('public')->url($attachment->file_path),
                'is_image' => $attachment->isImage(),
            ],
        ]);
    }

    public function destroy(Request $request, Attachment $attachment)
    {
        $attachmentData = [
            'file_name' => $attachment->file_name,
            'mime_type' => $attachment->mime_type,
            'attachable_type' => $attachment->attachable_type,
            'attachable_id' => $attachment->attachable_id,
        ];
        $attachmentId = $attachment->id;

        Storage::disk('public')->delete($attachment->file_path);
        $attachment->delete();

        AuditLog::query()->create([
            'user_id' => $request->user()->id,
            'event' => 'attachment.deleted',
            'source' => 'web',
            'subject_type' => Attachment::class,
            'subject_id' => $attachmentId,
            'before_json' => $attachmentData,
        ]);

        return back();
    }
}
