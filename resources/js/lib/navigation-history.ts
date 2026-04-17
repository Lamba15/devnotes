import { router } from '@inertiajs/react';

/**
 * Tracks in-app navigation depth so we can distinguish between:
 * - Users who navigated here from another page in the app (history.back() is safe)
 * - Users who opened this page directly via URL/bookmark (need fallback)
 *
 * Inertia fires `navigate` for every page visit including the initial load.
 * The first event is the initial render (depth stays 0). Every subsequent
 * event means the user navigated within the app, so history.back() will
 * return them to a valid in-app page.
 */
let depth = 0;
let initialized = false;

export function initNavigationHistory(): void {
    if (initialized) {
        return;
    }

    initialized = true;

    router.on('navigate', () => {
        depth++;
    });
}

/**
 * Returns true when the user has navigated at least once within the app,
 * meaning window.history.back() will land on a valid in-app page.
 *
 * Depth 1 = initial page load (no in-app history).
 * Depth 2+ = user has navigated, history.back() is safe.
 */
export function hasAppHistory(): boolean {
    return depth > 1;
}
