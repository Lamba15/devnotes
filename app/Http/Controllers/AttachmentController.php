<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\Issue;
use App\Models\IssueComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AttachmentController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'file' => ['nullable', 'file', 'max:10240'],
            'files' => ['nullable', 'array', 'max:10'],
            'files.*' => ['file', 'max:10240'],
            'attachable_type' => ['required', 'string', 'in:issue,issue_comment'],
            'attachable_id' => ['required', 'integer'],
        ]);

        $morphMap = [
            'issue' => Issue::class,
            'issue_comment' => IssueComment::class,
        ];

        $files = $request->hasFile('files')
            ? $request->file('files')
            : ($request->hasFile('file') ? [$request->file('file')] : []);

        if ($files === []) {
            throw ValidationException::withMessages([
                'files' => 'At least one file is required.',
            ]);
        }

        $attachable = match ($validated['attachable_type']) {
            'issue' => Issue::query()->findOrFail($validated['attachable_id']),
            'issue_comment' => IssueComment::query()->findOrFail($validated['attachable_id']),
        };

        $this->authorizeAttachmentWrite($request, $attachable);

        $attachments = collect($files)
            ->filter()
            ->map(function ($file) use ($morphMap, $validated, $request) {
                $path = $file->store('attachments', 'public');

                $attachment = Attachment::query()->create([
                    'attachable_type' => $morphMap[$validated['attachable_type']],
                    'attachable_id' => $validated['attachable_id'],
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
                        'attachable_type' => $validated['attachable_type'],
                        'attachable_id' => $validated['attachable_id'],
                    ],
                ]);

                return $attachment;
            })
            ->values();

        $payload = [
            'attachments' => $attachments->map(fn (Attachment $attachment) => [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'file_path' => $attachment->file_path,
                'mime_type' => $attachment->mime_type,
                'file_size' => $attachment->file_size,
                'url' => asset('storage/'.$attachment->file_path),
                'is_image' => $attachment->isImage(),
            ])->all(),
        ];

        if ($request->expectsJson()) {
            return response()->json($payload);
        }

        return back();
    }

    public function destroy(Request $request, Attachment $attachment)
    {
        $attachable = $attachment->attachable;

        if (! $attachable) {
            abort(404);
        }

        $this->authorizeAttachmentDelete($request, $attachable);

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

    private function authorizeAttachmentWrite(Request $request, Issue|IssueComment $attachable): void
    {
        if ($attachable instanceof Issue) {
            abort_unless($request->user()->canManageIssues($attachable->project), 403);

            return;
        }

        abort_unless($request->user()->canCommentOnIssue($attachable->issue), 403);
    }

    private function authorizeAttachmentDelete(Request $request, Issue|IssueComment $attachable): void
    {
        if ($attachable instanceof Issue) {
            abort_unless($request->user()->canManageIssues($attachable->project), 403);

            return;
        }

        abort_unless(
            $attachable->user_id === $request->user()->id || $request->user()->canManageIssues($attachable->issue->project),
            403,
        );
    }
}
