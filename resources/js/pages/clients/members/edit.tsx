import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ClientMembersEdit({
    client,
    membership,
    roles,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    membership: {
        id: number;
        role: string;
        user: { id: number; name: string; email: string };
    };
    roles: Array<{ label: string; value: string }>;
}) {
    const form = useForm({
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
    });

    const sections: DynamicFormSection[] = [
        {
            name: 'member',
            title: 'Edit client user',
            description:
                'Update the portal user details and membership role on its own page.',
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
                { name: 'role', label: 'Role', type: 'select', options: roles },
            ],
        },
    ];

    return (
        <>
            <Head title={`${client.name} Edit Member`} />
            <CrudPage
                title={`Edit ${membership.user.name}`}
                description="Update this client user from a dedicated edit page."
            >
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Save client user"
                    cancelLabel="Back to members"
                    onCancel={() =>
                        router.visit(`/clients/${client.id}/members`)
                    }
                    onChange={(name, value) =>
                        form.setData(
                            name as 'name' | 'email' | 'role',
                            value,
                        )
                    }
                    onSubmit={() =>
                        form.put(
                            `/clients/${client.id}/members/${membership.id}`,
                        )
                    }
                />
            </CrudPage>
        </>
    );
}

ClientMembersEdit.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
