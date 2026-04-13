import { Link, router } from '@inertiajs/react';
import { Copy, Eye, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDetailedTimestamp } from '@/lib/datetime';

type SecretSummary = {
    id: number;
    label: string;
    description: string | null;
    updated_at: string | null;
};

export default function SecretsCard({
    title = 'Secrets',
    description,
    secrets,
    createHref,
    editHref,
    deleteHref,
    revealHref,
}: {
    title?: string;
    description?: string;
    secrets: SecretSummary[];
    createHref: string;
    editHref: (secretId: number) => string;
    deleteHref: (secretId: number) => string;
    revealHref: (secretId: number) => string;
}) {
    const [revealedValues, setRevealedValues] = useState<
        Record<number, string>
    >({});
    const [revealingIds, setRevealingIds] = useState<Record<number, boolean>>(
        {},
    );
    const [copiedId, setCopiedId] = useState<number | null>(null);

    async function revealSecret(secretId: number) {
        setRevealingIds((current) => ({ ...current, [secretId]: true }));

        try {
            const response = await fetch(revealHref(secretId), {
                headers: {
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error('Failed to reveal secret.');
            }

            const payload = (await response.json()) as {
                id: number;
                secret_value: string;
            };

            setRevealedValues((current) => ({
                ...current,
                [payload.id]: payload.secret_value,
            }));
        } finally {
            setRevealingIds((current) => ({ ...current, [secretId]: false }));
        }
    }

    async function copySecret(secretId: number) {
        const value = revealedValues[secretId];

        if (!value) {
            return;
        }

        await navigator.clipboard.writeText(value);
        setCopiedId(secretId);

        window.setTimeout(
            () =>
                setCopiedId((current) =>
                    current === secretId ? null : current,
                ),
            1500,
        );
    }

    function deleteSecret(secretId: number) {
        if (!window.confirm('Delete this secret?')) {
            return;
        }

        router.delete(deleteHref(secretId), {
            preserveScroll: true,
        });
    }

    return (
        <Card className="shadow-none">
            <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <KeyRound className="size-4" />
                        {title}
                    </CardTitle>
                    {description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
                <Button asChild size="sm">
                    <Link href={createHref}>
                        <Plus className="mr-1.5 size-3.5" />
                        Add secret
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="space-y-3">
                {secrets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No secrets yet.
                    </p>
                ) : (
                    secrets.map((secret) => (
                        <div
                            key={secret.id}
                            className="rounded-lg border px-3 py-3"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium">
                                        {secret.label}
                                    </p>
                                    {secret.description ? (
                                        <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                                            {secret.description}
                                        </p>
                                    ) : null}
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Updated{' '}
                                        {secret.updated_at
                                            ? formatDetailedTimestamp(
                                                  secret.updated_at,
                                              )
                                            : 'recently'}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => revealSecret(secret.id)}
                                        disabled={revealingIds[secret.id]}
                                    >
                                        <Eye className="mr-1.5 size-3.5" />
                                        {revealedValues[secret.id]
                                            ? 'Reveal again'
                                            : 'Reveal'}
                                    </Button>
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={editHref(secret.id)}>
                                            <Pencil className="mr-1.5 size-3.5" />
                                            Edit
                                        </Link>
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => deleteSecret(secret.id)}
                                    >
                                        <Trash2 className="mr-1.5 size-3.5" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-3 rounded-md bg-muted/60 px-3 py-2 text-sm">
                                {revealedValues[secret.id] ? (
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <code className="max-w-full text-xs break-all whitespace-pre-wrap text-foreground">
                                            {revealedValues[secret.id]}
                                        </code>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            onClick={() =>
                                                copySecret(secret.id)
                                            }
                                        >
                                            <Copy className="mr-1.5 size-3.5" />
                                            {copiedId === secret.id
                                                ? 'Copied'
                                                : 'Copy'}
                                        </Button>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground">
                                        Value hidden until revealed.
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
