import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { AssistantPanel } from '@/components/assistant/assistant-panel';
import type { AppLayoutProps } from '@/types';

type Props = AppLayoutProps & {
    sidebarOpen?: boolean;
};

export default function AppSidebarLayout({
    children,
    sidebarOpen,
}: Props) {
    return (
        <AppShell variant="sidebar" sidebarOpen={sidebarOpen}>
            <AppSidebar />
            <AssistantPanel hideTrigger />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader />
                {children}
            </AppContent>
        </AppShell>
    );
}
