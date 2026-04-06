import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAISettings } from '@/routes/ai-settings';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: edit(),
        icon: null,
    },
    {
        title: 'Security',
        href: editSecurity(),
        icon: null,
    },
    {
        title: 'Appearance',
        href: editAppearance(),
        icon: null,
    },
    {
        title: 'AI',
        href: editAISettings(),
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <div className="mx-auto w-full max-w-3xl text-center">
                    <Heading
                        title="Settings"
                        description="Manage your account, assistant, and workspace preferences in one focused place"
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
                    <Card className="overflow-hidden">
                        <CardHeader className="border-b bg-background/80 py-4">
                            <CardTitle className="text-sm">Sections</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                            <nav
                                className="flex flex-col space-y-1"
                                aria-label="Settings"
                            >
                                {sidebarNavItems.map((item, index) => (
                                    <Button
                                        key={`${toUrl(item.href)}-${index}`}
                                        size="sm"
                                        variant="ghost"
                                        asChild
                                        className={cn(
                                            'h-10 justify-start rounded-lg px-3 text-sm',
                                            {
                                                'bg-primary/8 text-foreground shadow-sm':
                                                    isCurrentOrParentUrl(
                                                        item.href,
                                                    ),
                                            },
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
                        </CardContent>
                    </Card>

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
