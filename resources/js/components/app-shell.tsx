import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    sidebarOpen?: boolean;
    variant?: AppVariant;
};

export function AppShell({
    children,
    sidebarOpen = true,
    variant = 'sidebar',
}: Props) {
    const page = usePage<{ sidebarOpen?: boolean }>();

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">{children}</div>
        );
    }

    return (
        <SidebarProvider defaultOpen={page.props.sidebarOpen ?? sidebarOpen}>
            {children}
        </SidebarProvider>
    );
}
