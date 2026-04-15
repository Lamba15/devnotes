import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function FinanceCardSection({
    title,
    description,
    className,
    contentClassName,
    children,
}: {
    title: string;
    description?: string;
    className?: string;
    contentClassName?: string;
    children: ReactNode;
}) {
    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">{title}</CardTitle>
                {description ? (
                    <CardDescription>{description}</CardDescription>
                ) : null}
            </CardHeader>
            <CardContent className={contentClassName}>{children}</CardContent>
        </Card>
    );
}

export function FinanceMetaRow({
    label,
    value,
    className,
    valueClassName,
}: {
    label: string;
    value: ReactNode;
    className?: string;
    valueClassName?: string;
}) {
    return (
        <div
            className={cn(
                'flex items-start justify-between gap-3 border-b border-border/50 pb-3 last:border-b-0 last:pb-0',
                className,
            )}
        >
            <span className="text-sm text-muted-foreground">{label}</span>
            <div
                className={cn(
                    'text-right text-sm font-medium text-foreground',
                    valueClassName,
                )}
            >
                {value}
            </div>
        </div>
    );
}

export function FinanceDocumentLink({
    label,
    href,
}: {
    label: string;
    href: string;
}) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </p>
            <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="block text-sm break-all text-primary hover:underline"
            >
                {href}
            </a>
        </div>
    );
}

export function FinancePreviewCard({
    title,
    icon: Icon,
    src,
    iframeTitle,
    className,
}: {
    title: string;
    icon?: LucideIcon;
    src: string;
    iframeTitle: string;
    className?: string;
}) {
    return (
        <Card className={cn('overflow-hidden', className)}>
            <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    {Icon ? <Icon className="size-4" /> : null}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <iframe
                    src={src}
                    title={iframeTitle}
                    className="h-[calc(100vh-16rem)] min-h-[48rem] w-full bg-white"
                />
            </CardContent>
        </Card>
    );
}
