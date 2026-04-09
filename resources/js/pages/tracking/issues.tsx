import { Head } from '@inertiajs/react';
import { Construction, Ticket } from 'lucide-react';
import { CrudPage } from '@/components/crud/crud-page';
import AppLayout from '@/layouts/app-layout';

export default function TrackingIssues() {
    return (
        <>
            <Head title="Tracking Issues" />
            <CrudPage
                title="Issues"
                description="Cross-project issue tracking surface."
            >
                <section className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card px-6 py-16 text-center">
                    <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                        <Ticket className="size-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium">
                        Cross-project issue view
                    </h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        Project-scoped issues are fully available inside each
                        client workspace. This top-level surface will aggregate
                        issues across all projects.
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Construction className="size-3.5" />
                        Coming in a future sprint
                    </div>
                </section>
            </CrudPage>
        </>
    );
}

TrackingIssues.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
