import { Head } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ClientSectionPlaceholder({
    client,
    title,
    description,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    title: string;
    description: string;
}) {
    return (
        <>
            <Head title={`${client.name} ${title}`} />
            <Card className="shadow-none">
                <CardContent className="p-6 text-sm text-muted-foreground">
                    {description}
                </CardContent>
            </Card>
        </>
    );
}

ClientSectionPlaceholder.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
