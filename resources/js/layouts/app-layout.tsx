import { getPageProps } from '@/lib/page-props';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';

type AppLayoutPageProps = {
    sidebarOpen?: boolean;
};

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const pageProps = getPageProps<AppLayoutPageProps>(children);

    return (
        <AppLayoutTemplate
            breadcrumbs={breadcrumbs}
            sidebarOpen={pageProps.sidebarOpen}
        >
            {children}
        </AppLayoutTemplate>
    );
}
