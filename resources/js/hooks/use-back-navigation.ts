import { router, usePage } from '@inertiajs/react';
import { hasAppHistory } from '@/lib/navigation-history';
import type { BreadcrumbItem } from '@/types';

/**
 * Returns a "go back" function for the back arrow / cancel buttons.
 *
 * Strategy:
 * 1. If the user navigated here from another page within the app,
 *    use window.history.back(). Inertia manages the history stack via
 *    pushState, so this always returns to the correct previous page —
 *    whether that was a client finance page, a global list, or anything else.
 *
 * 2. If the user opened this page directly (bookmark, pasted URL, new tab),
 *    there is no in-app history to go back to. Fall back to the hierarchical
 *    parent derived from server-provided breadcrumbs, or an explicit
 *    fallback URL.
 *
 * Returns undefined when there is no back target at all, so callers can
 * conditionally render back buttons.
 */
export function useBackNavigation(fallback?: string): (() => void) | undefined {
    const breadcrumbs = (usePage().props.breadcrumbs ?? []) as BreadcrumbItem[];

    const hierarchicalParent =
        breadcrumbs.length >= 2
            ? (breadcrumbs[breadcrumbs.length - 2].href as string)
            : fallback;

    if (!hierarchicalParent) {
        return undefined;
    }

    return () => {
        if (hasAppHistory()) {
            window.history.back();

            return;
        }

        router.visit(hierarchicalParent);
    };
}
