import { Link, usePage } from '@inertiajs/react';
import { Bot, Palette, Shield, User } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAISettings } from '@/routes/ai-settings';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

export default function SettingsLayout({ children }: PropsWithChildren) {
    const page = usePage<{
        auth: {
            user?: {
                capabilities?: {
                    platform?: boolean;
                } | null;
            } | null;
        };
    }>();
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const canAccessPlatform = Boolean(
        page.props.auth.user?.capabilities?.platform,
    );
    const sidebarNavItems: NavItem[] = [
        {
            title: 'Profile',
            href: edit(),
            icon: User,
        },
        {
            title: 'Security',
            href: editSecurity(),
            icon: Shield,
        },
        {
            title: 'Appearance',
            href: editAppearance(),
            icon: Palette,
        },
        ...(canAccessPlatform
            ? [
                  {
                      title: 'AI',
                      href: editAISettings(),
                      icon: Bot,
                  },
              ]
            : []),
    ];

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <div className="mx-auto w-full max-w-3xl text-center">
                    <Heading
                        title="Settings"
                        description="Manage your account, agent, and workspace preferences in one focused place"
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
                    <nav
                        className="flex flex-col gap-1"
                        aria-label="Settings"
                    >
                        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Sections
                        </p>
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${toUrl(item.href)}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn(
                                    'h-9 justify-start rounded-lg px-3 text-sm',
                                    isCurrentOrParentUrl(item.href)
                                        ? 'bg-accent font-semibold text-accent-foreground shadow-[inset_3px_0_0_0_var(--primary)]'
                                        : '',
                                )}
                            >
                                <Link href={item.href}>
                                    {item.icon && (
                                        <item.icon className="h-4 w-4" />
                                    )}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>

                    <Card className="overflow-hidden">
                        <CardContent className="p-6 sm:p-8">
                            <section className="mx-auto w-full max-w-3xl space-y-10">
                                {children}
                            </section>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
