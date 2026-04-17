import { usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useCrudPageHeaderContent } from '@/components/crud/crud-page-header-slot';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import type { BreadcrumbItem } from '@/types';

export function AppSidebarHeader() {
    const headerContent = useCrudPageHeaderContent();
    const goBack = useBackNavigation();
    const breadcrumbs = (usePage().props.breadcrumbs ?? []) as BreadcrumbItem[];
    const currentPage = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : null;

    // CrudPage renders its own back arrow + title in the header slot,
    // so only show the header-level arrow and title on pages without CrudPage.
    const showFallbackHeader = !headerContent && currentPage;

    return (
        <header className="flex min-h-16 shrink-0 items-center gap-4 border-b border-border px-6 py-3 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                {showFallbackHeader && goBack ? (
                    <button
                        type="button"
                        onClick={goBack}
                        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="size-4" />
                    </button>
                ) : null}
            </div>
            <div id="app-page-header-slot" className="min-w-0 flex-1">
                {headerContent}
                {showFallbackHeader ? (
                    <div className="flex min-w-0 items-center gap-2">
                        <h1 className="min-w-0 truncate text-2xl font-bold tracking-tight">
                            {currentPage.title}
                        </h1>
                        {currentPage.meta ? (
                            <Badge variant="outline">{currentPage.meta}</Badge>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </header>
    );
}
