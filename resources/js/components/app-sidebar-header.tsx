import { Breadcrumbs } from '@/components/breadcrumbs';
import { setCrudPageHeaderSlot } from '@/components/crud/crud-page-header-slot';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="flex min-h-16 shrink-0 items-center gap-4 border-b border-border px-6 py-3 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                {breadcrumbs.length > 0 ? (
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                ) : null}
            </div>
            <div
                ref={setCrudPageHeaderSlot}
                id="app-page-header-slot"
                className="min-w-0 flex-1"
            />
        </header>
    );
}
