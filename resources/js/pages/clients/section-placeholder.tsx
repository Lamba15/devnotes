import { Head } from '@inertiajs/react';
import { Construction } from 'lucide-react';
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
                <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
                    <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                        <Construction className="size-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium">Coming soon</h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        {description}
                    </p>
                </CardContent>
            </Card>
        </>
    );
}

ClientSectionPlaceholder.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
