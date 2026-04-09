<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;

class UserCreditsController extends Controller
{
    public function update(Request $request, User $user)
    {
        $request->validate([
            'ai_credits' => ['required', 'integer', 'min:-1'],
        ]);

        $before = ['ai_credits' => $user->ai_credits];

        $user->update([
            'ai_credits' => $request->integer('ai_credits'),
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()->id,
            'event' => 'user.credits_updated',
            'source' => 'web',
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'before_json' => $before,
            'after_json' => ['ai_credits' => $user->ai_credits],
        ]);

        return back();
    }
}
