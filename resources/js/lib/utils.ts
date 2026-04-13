import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

export function stripHtml(html: string | null | undefined): string {
    if (!html) {
return '';
}

    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}
