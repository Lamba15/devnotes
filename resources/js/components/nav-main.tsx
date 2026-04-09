import { Link } from '@inertiajs/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({
    items = [],
    label = 'Platform',
}: {
    items: NavItem[];
    label?: string;
}) {
    const { isCurrentOrParentUrl, isCurrentUrl } = useCurrentUrl();
    const [manualSections, setManualSections] = useState<
        Record<string, boolean>
    >({});

    const toggleSection = (title: string) => {
        setManualSections((current) => ({
            ...current,
            [title]: !(current[title] ?? false),
        }));
    };

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        {item.items?.length ? (
                            (() => {
                                const isOpen =
                                    manualSections[item.title] ??
                                    isCurrentOrParentUrl(item.href);

                                return (
                                    <>
                                        <SidebarMenuButton
                                            isActive={isCurrentOrParentUrl(
                                                item.href,
                                            )}
                                            tooltip={{ children: item.title }}
                                            onClick={() =>
                                                toggleSection(item.title)
                                            }
                                        >
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                            {isOpen ? (
                                                <ChevronDown className="ml-auto h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="ml-auto h-4 w-4" />
                                            )}
                                        </SidebarMenuButton>

                                        {isOpen ? (
                                            <SidebarMenuSub>
                                                {item.items.map((child) => (
                                                    <SidebarMenuSubItem
                                                        key={child.title}
                                                    >
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={isCurrentUrl(
                                                                child.href,
                                                            )}
                                                        >
                                                            <Link
                                                                href={
                                                                    child.href
                                                                }
                                                                prefetch
                                                            >
                                                                <span>
                                                                    {
                                                                        child.title
                                                                    }
                                                                </span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        ) : null}
                                    </>
                                );
                            })()
                        ) : (
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentUrl(item.href)}
                                tooltip={{ children: item.title }}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        )}
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
