<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $before = $user->only(['name', 'email', 'timezone']);

        $user->fill($request->validated());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        AuditLog::query()->create([
            'user_id' => $user->id,
            'event' => 'user.profile_updated',
            'source' => 'web',
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'before_json' => $before,
            'after_json' => $user->only(['name', 'email', 'timezone']),
        ]);

        return to_route('profile.edit');
    }

    public function updateTimezone(Request $request): RedirectResponse|\Illuminate\Http\Response
    {
        $validated = $request->validate([
            'timezone' => ['required', 'string', 'timezone:all'],
        ]);

        $user = $request->user();

        if ($user->timezone === $validated['timezone']) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->noContent();
            }

            return to_route('profile.edit');
        }

        $before = $user->only(['timezone']);

        $user->forceFill([
            'timezone' => $validated['timezone'],
        ])->save();

        AuditLog::query()->create([
            'user_id' => $user->id,
            'event' => 'user.timezone_updated',
            'source' => 'web',
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'before_json' => $before,
            'after_json' => $user->only(['timezone']),
        ]);

        if ($request->expectsJson() || $request->ajax()) {
            return response()->noContent();
        }

        return to_route('profile.edit');
    }

    public function uploadAvatar(Request $request): RedirectResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:2048'],
        ]);

        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar_path' => $path]);

        AuditLog::query()->create([
            'user_id' => $user->id,
            'event' => 'user.avatar_uploaded',
            'source' => 'web',
            'subject_type' => User::class,
            'subject_id' => $user->id,
        ]);

        return to_route('profile.edit');
    }

    public function removeAvatar(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->update(['avatar_path' => null]);

            AuditLog::query()->create([
                'user_id' => $user->id,
                'event' => 'user.avatar_removed',
                'source' => 'web',
                'subject_type' => User::class,
                'subject_id' => $user->id,
            ]);
        }

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        AuditLog::query()->create([
            'user_id' => $user->id,
            'event' => 'user.account_deleted',
            'source' => 'web',
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'before_json' => $user->only(['id', 'name', 'email']),
        ]);

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
