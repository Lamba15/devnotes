import { Head } from '@inertiajs/react';
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
                <section className="rounded-xl border border-dashed border-border/60 bg-card p-6 text-sm text-muted-foreground">
                    This section is now part of the product structure and will
                    be fleshed out in the next implementation slices.
                </section>
            </CrudPage>
        </>
    );
}

SectionPlaceholder.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
