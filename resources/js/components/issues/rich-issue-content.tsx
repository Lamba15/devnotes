import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { cn } from '@/lib/utils';

export function RichIssueContent({
    html,
    className,
}: {
    html: string | null | undefined;
    className?: string;
}) {
    const sanitizedHtml = sanitizeRichContent(html);

    if (!sanitizedHtml) {
        return null;
    }

    return (
        <div
            className={cn(
                'prose prose-sm prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-img:rounded-xl prose-img:border [&_a]:!text-primary prose-strong:text-foreground dark:prose-invert max-w-none',
                className,
            )}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
    );
}

function sanitizeRichContent(html: string | null | undefined): string {
    if (!html || html.trim() === '') {
        return '';
    }

    const normalizedHtml = /<\/?[a-z][\s\S]*>/i.test(html)
        ? html
        : (marked.parse(html, { async: false }) as string);

    return DOMPurify.sanitize(normalizedHtml, {
        USE_PROFILES: { html: true },
    });
}
