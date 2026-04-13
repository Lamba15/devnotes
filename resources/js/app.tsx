import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { getBrowserTimeZone } from '@/lib/datetime';
import type { Auth } from '@/types';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';
const TIME_ZONE_SYNC_KEY = 'devnotes.timezone-sync';

type AppAuthPayload = Auth | { user?: null } | null | undefined;

function resolveDefaultLayout(name: string) {
    switch (true) {
        case name === 'welcome':
            return undefined;
        case name.startsWith('auth/'):
            return AuthLayout;
        case name.startsWith('settings/'):
            return [AppLayout, SettingsLayout];
        default:
            return AppLayout;
    }
}

function TimeZoneBootstrap({
    auth,
    children,
}: {
    auth?: AppAuthPayload;
    children: ReactNode;
}) {
    const user = auth?.user;

    useEffect(() => {
        if (!user?.id || user.timezone) {
            return;
        }

        const browserTimeZone = getBrowserTimeZone();

        if (!browserTimeZone) {
            return;
        }

        const syncKey = `${TIME_ZONE_SYNC_KEY}:${user.id}:${browserTimeZone}`;

        if (window.sessionStorage.getItem(syncKey)) {
            return;
        }

        window.sessionStorage.setItem(syncKey, '1');

        void fetch('/settings/profile/timezone', {
            method: 'PATCH',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN':
                    document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute('content') ?? '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                timezone: browserTimeZone,
            }),
        }).catch(() => {});
    }, [user?.id, user?.timezone]);

    return <>{children}</>;
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ).then((module) => {
            const page = (module as { default: ComponentType }).default as {
                layout?: unknown;
            } & ComponentType;

            let layoutProps = {};
            let hasCustomLayout = false;

            if (page.layout !== undefined) {
                // If it's an object but not a React Element or Array, it's considered page layout props
                if (
                    typeof page.layout === 'object' &&
                    !Array.isArray(page.layout) &&
                    page.layout !== null &&
                    !(
                        page.layout &&
                        typeof (page.layout as any).$$typeof === 'symbol'
                    ) // check if it's a react element
                ) {
                    layoutProps = page.layout;
                } else {
                    hasCustomLayout = true;
                }
            }

            if (!hasCustomLayout) {
                const DefaultLayout = resolveDefaultLayout(name);

                if (Array.isArray(DefaultLayout)) {
                    page.layout = (childNode: ReactNode) => {
                        return DefaultLayout.reduceRight(
                            (acc, Layout) => (
                                <Layout {...layoutProps}>{acc}</Layout>
                            ),
                            childNode,
                        );
                    };
                } else if (DefaultLayout) {
                    page.layout = (childNode: ReactNode) => (
                        <DefaultLayout {...layoutProps}>
                            {childNode}
                        </DefaultLayout>
                    );
                } else {
                    page.layout = undefined;
                }
            }

            return page as ComponentType;
        }),
    strictMode: true,
    withApp(app) {
        const auth = (
            app as ReactElement<{
                initialPage?: { props?: { auth?: AppAuthPayload } };
            }>
        ).props.initialPage?.props?.auth;

        return (
            <TooltipProvider delayDuration={0}>
                <TimeZoneBootstrap auth={auth}>{app}</TimeZoneBootstrap>
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
