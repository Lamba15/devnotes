import { Link } from '@inertiajs/react';
import { BriefcaseBusiness, Bot, FileBox, LayoutGrid, Wallet } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const mainNavItems: NavItem[] = [
        {
            title: 'Overview',
            href: '/overview',
            icon: LayoutGrid,
        },
        {
            title: 'Clients',
            href: '/clients',
            icon: BriefcaseBusiness,
        },
        {
            title: 'Finance',
            href: '/finance',
            icon: Wallet,
        },
        {
            title: 'CMS',
            href: '#',
            icon: FileBox,
        },
    ];

    const footerNavItems: NavItem[] = [
        {
            title: 'Assistant',
            href: '#assistant',
            icon: Bot,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/overview" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
