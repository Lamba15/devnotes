import { Head } from '@inertiajs/react';
import { Construction } from 'lucide-react';
import { CrudPage } from '@/components/crud/crud-page';
import AppLayout from '@/layouts/app-layout';

export default function SectionPlaceholder({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <>
            <Head title={title} />
            <CrudPage title={title} description={description}>
                <section className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card px-6 py-16 text-center">
                    <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                        <Construction className="size-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium">Coming soon</h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        This section is part of the product structure and will
                        be built out in the next implementation slices.
                    </p>
                </section>
            </CrudPage>
        </>
    );
}

SectionPlaceholder.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
