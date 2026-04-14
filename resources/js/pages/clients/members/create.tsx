import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ClientMembersCreate({
    client,
    roles,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    roles: Array<{ label: string; value: string }>;
}) {
    const form = useForm({
        name: '',
        email: '',
        password: '',
        role: 'member',
    });

    const sections: DynamicFormSection[] = [
        {
            name: 'member',
            title: 'Create client user',
            description:
                'Add a person directly into this client workspace and give them the right role.',
            fields: [
                {
                    name: 'name',
                    label: 'Name',
                    type: 'text',
                    placeholder: 'Portal user name',
                },
                {
                    name: 'email',
                    label: 'Email',
                    type: 'text',
                    placeholder: 'portal@example.com',
                },
                {
                    name: 'password',
                    label: 'Password',
                    type: 'password',
                    placeholder: 'Initial password',
                },
                { name: 'role', label: 'Role', type: 'select', options: roles },
            ],
        },
    ];

    return (
        <>
            <Head title={`${client.name} Create Member`} />
            <CrudPage
                title={`Create ${client.name} Member`}
                description="Create a new person directly inside this client workspace."
            >
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Create client user"
                    cancelLabel="Back to members"
                    onCancel={() =>
                        router.visit(`/clients/${client.id}/members`)
                    }
                    onChange={(name, value) =>
                        form.setData(
                            name as 'name' | 'email' | 'password' | 'role',
                            value,
                        )
                    }
                    onSubmit={() => form.post(`/clients/${client.id}/members`)}
                />
            </CrudPage>
        </>
    );
}

ClientMembersCreate.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
