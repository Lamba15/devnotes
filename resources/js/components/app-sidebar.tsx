import { Link, usePage } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    Bot,
    FileBox,
    FolderKanban,
    LayoutGrid,
    ScrollText,
    Settings,
    Ticket,
    Users,
    Wallet,
} from 'lucide-react';
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
    const page = usePage<{
        auth: {
            user?: {
                capabilities?: {
                    platform?: boolean;
                    use_assistant?: boolean;
                } | null;
                portal_context?: {
                    client_id?: number | null;
                    client_name?: string | null;
                    can_access_finance?: boolean;
                } | null;
            } | null;
        };
    }>();
    const auth = page.props.auth;
    const canAccessPlatform = Boolean(auth.user?.capabilities?.platform);
    const canUseAssistant = Boolean(auth.user?.capabilities?.use_assistant);
    const portalClientId = auth.user?.portal_context?.client_id;
    const portalClientName = auth.user?.portal_context?.client_name;
    const portalCanAccessFinance = Boolean(
        auth.user?.portal_context?.can_access_finance,
    );
    const homeHref = canAccessPlatform
        ? '/overview'
        : portalClientId
          ? `/clients/${portalClientId}`
          : '/clients';

    const mainNavItems: NavItem[] = [
        ...(canAccessPlatform
            ? [
                  {
                      title: 'Overview',
                      href: '/overview',
                      icon: LayoutGrid,
                  },
                  {
                      title: 'Clients',
                      href: '/clients',
                      icon: BriefcaseBusiness,
                      items: [
                          {
                              title: 'Clients',
                              href: '/clients',
                          },
                          {
                              title: 'Projects',
                              href: '/clients/projects',
                          },
                          {
                              title: 'Tags',
                              href: '/clients/tags',
                          },
                      ],
                  },
              ]
            : portalClientId
              ? [
                    {
                        title: 'Workspace',
                        href: `/clients/${portalClientId}`,
                        icon: BriefcaseBusiness,
                    },
                    {
                        title: 'Team',
                        href: `/clients/${portalClientId}/members`,
                        icon: Users,
                    },
                    {
                        title: 'Projects',
                        href: `/clients/${portalClientId}/projects`,
                        icon: FolderKanban,
                    },
                    {
                        title: 'Issues',
                        href: `/clients/${portalClientId}/issues`,
                        icon: Ticket,
                    },
                    {
                        title: 'Boards',
                        href: `/clients/${portalClientId}/boards`,
                        icon: LayoutGrid,
                    },
                    ...(portalCanAccessFinance
                        ? [
                              {
                                  title: 'Finance',
                                  href: `/clients/${portalClientId}/finance`,
                                  icon: Wallet,
                              },
                          ]
                        : []),
                ]
              : []),
        ...(canAccessPlatform
            ? [
                  {
                      title: 'Tracking',
                      href: '/tracking/issues',
                      icon: Ticket,
                      items: [
                          {
                              title: 'Issues',
                              href: '/tracking/issues',
                          },
                          {
                              title: 'Boards',
                              href: '/tracking/boards',
                          },
                      ],
                  },
                  {
                      title: 'Finance',
                      href: '/finance/transactions',
                      icon: Wallet,
                      items: [
                          {
                              title: 'Transactions',
                              href: '/finance/transactions',
                          },
                          {
                              title: 'Invoices',
                              href: '/finance/invoices',
                          },
                          {
                              title: 'Categories',
                              href: '/finance/categories',
                          },
                      ],
                  },
                  {
                      title: 'CMS',
                      href: '/cms/pages',
                      icon: FileBox,
                      items: [
                          {
                              title: 'Pages',
                              href: '/cms/pages',
                          },
                          {
                              title: 'Skills',
                              href: '/cms/skills',
                          },
                          {
                              title: 'Feedback',
                              href: '/cms/feedback',
                          },
                      ],
                  },
                  {
                      title: 'Audit Logs',
                      href: '/audit-logs',
                      icon: ScrollText,
                  },
              ]
            : []),
    ];

    const footerNavItems: NavItem[] = canUseAssistant
        ? [
              {
                  title: 'Agent Chat',
                  href: '#assistant',
                  icon: Bot,
              },
          ]
        : [];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={homeHref} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain
                    items={mainNavItems}
                    label={
                        canAccessPlatform
                            ? 'Platform'
                            : (portalClientName ?? 'Workspace')
                    }
                />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
