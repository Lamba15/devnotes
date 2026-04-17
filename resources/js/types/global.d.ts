import type { Auth } from '@/types/auth';
import type { BreadcrumbItem } from '@/types/navigation';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            breadcrumbs?: BreadcrumbItem[];
            [key: string]: unknown;
        };
    }
}
