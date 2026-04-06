import { Head, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormField } from '@/components/crud/dynamic-form';
import AppLayout from '@/layouts/app-layout';

type RoleOption = {
    label: string;
    value: string;
};

type Membership = {
    id: number;
    role: string;
    user: {
        id: number;
        name: string;
        email: string;
        email_verified_at: string | null;
    };
};

export default function ClientMembersIndex({
    client,
    memberships,
    roles,
}: {
    client: { id: number; name: string };
    memberships: Membership[];
    roles: RoleOption[];
}) {
    const form = useForm({
        name: '',
        email: '',
        password: '',
        role: 'viewer',
    });

    const fields: DynamicFormField[] = [
        { name: 'name', label: 'Name', type: 'text', placeholder: 'Portal user name' },
        { name: 'email', label: 'Email', type: 'text', placeholder: 'portal@example.com' },
        { name: 'password', label: 'Password', type: 'password', placeholder: 'Initial password' },
        {
            name: 'role',
            label: 'Role',
            type: 'select',
            options: roles,
        },
    ];

    const columns: DataTableColumn<Membership>[] = [
        {
            key: 'name',
            header: 'Name',
            render: (membership) => membership.user.name,
        },
        {
            key: 'email',
            header: 'Email',
            render: (membership) => membership.user.email,
        },
        {
            key: 'role',
            header: 'Role',
            render: (membership) => membership.role,
        },
    ];

    return (
        <>
            <Head title={`${client.name} Members`} />
            <CrudPage
                title={`${client.name} Members`}
                description="Create portal users directly and attach them to this client."
            >
                <section className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                    <DynamicForm
                        fields={fields}
                        data={form.data}
                        errors={form.errors}
                        processing={form.processing}
                        submitLabel="Create client user"
                        onChange={(name, value) =>
                            form.setData(name as 'name' | 'email' | 'password' | 'role', value)
                        }
                        onSubmit={() => form.post(`/clients/${client.id}/members`)}
                    />
                </section>

                <DataTable columns={columns} rows={memberships} emptyText="No client users yet." />
            </CrudPage>
        </>
    );
}

ClientMembersIndex.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
