import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

export default function Overview() {
    return (
        <>
            <Head title="Overview" />
            <div className="flex h-full flex-1 flex-col rounded-xl p-4" />
        </>
    );
}

Overview.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
