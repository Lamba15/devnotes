import { Head } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import AppLayout from '@/layouts/app-layout';

export default function TrackingBoards() {
    return (
        <>
            <Head title="Tracking Boards" />
            <CrudPage
                title="Boards"
                description="Tracking boards are now a first-class domain section. Cross-project board management comes next."
            >
                <section className="rounded-xl border border-dashed border-border/60 bg-card p-6 text-sm text-muted-foreground">
                    Project-scoped board views already exist. This page is the
                    new top-level tracking boards entry point and will become
                    the shared board management surface.
                </section>
            </CrudPage>
        </>
    );
}

TrackingBoards.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
