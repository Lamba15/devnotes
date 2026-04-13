import SecretFormPage from '@/components/secrets/secret-form-page';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ClientSecretsCreate({
    client,
}: {
    client: { id: number; name: string };
}) {
    return (
        <SecretFormPage
            title="Create Client Secret"
            description={`Add a private secret for ${client.name}.`}
            submitLabel="Create secret"
            cancelHref={`/clients/${client.id}`}
            submitUrl={`/clients/${client.id}/secrets`}
            method="post"
            initialData={{
                label: '',
                description: '',
                secret_value: '',
            }}
        />
    );
}

ClientSecretsCreate.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
