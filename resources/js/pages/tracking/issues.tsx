import { Head } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import AppLayout from '@/layouts/app-layout';

export default function TrackingIssues() {
    return (
        <>
            <Head title="Tracking Issues" />
            <CrudPage
                title="Issues"
                description="Tracking is now a first-class domain section. Cross-project issue surfaces come next."
            >
                <section className="rounded-xl border border-dashed border-border/60 bg-card p-6 text-sm text-muted-foreground">
                    The project already supports project-scoped issues. This
                    page is the new top-level tracking entry point and will
                    become the cross-project issue surface.
                </section>
            </CrudPage>
        </>
    );
}

TrackingIssues.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
