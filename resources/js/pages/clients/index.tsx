import { Head, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormField } from '@/components/crud/dynamic-form';
import AppLayout from '@/layouts/app-layout';

type Behavior = {
    id: number;
    name: string;
    slug: string;
};

type Client = {
    id: number;
    name: string;
    email: string | null;
    behavior: Behavior;
    created_at: string;
};

export default function ClientsIndex({
    clients,
    behaviors,
}: {
    clients: Client[];
    behaviors: Behavior[];
}) {
    const form = useForm({
        name: '',
        behavior_id: '',
    });

    const fields: DynamicFormField[] = [
        { name: 'name', label: 'Name', type: 'text', placeholder: 'Client name' },
        {
            name: 'behavior_id',
            label: 'Behavior',
            type: 'select',
            placeholder: 'Normal (default)',
            options: behaviors.map((behavior) => ({
                label: behavior.name,
                value: behavior.id,
            })),
        },
    ];

    const columns: DataTableColumn<Client>[] = [
        {
            key: 'name',
            header: 'Name',
            render: (client) => client.name,
        },
        {
            key: 'behavior',
            header: 'Behavior',
            render: (client) => client.behavior.name,
        },
        {
            key: 'email',
            header: 'Email',
            render: (client) => client.email ?? '—',
        },
    ];

    return (
        <>
            <Head title="Clients" />
            <CrudPage
                title="Clients"
                description="Create the first client records for the new platform foundation."
            >
                <section className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                    <DynamicForm
                        fields={fields}
                        data={form.data}
                        errors={form.errors}
                        processing={form.processing}
                        submitLabel="Create client"
                        onChange={(name, value) =>
                            form.setData(name as 'name' | 'behavior_id', value)
                        }
                        onSubmit={() => form.post('/clients')}
                    />
                </section>

                <DataTable columns={columns} rows={clients} emptyText="No clients yet." />
            </CrudPage>
        </>
    );
}

ClientsIndex.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
