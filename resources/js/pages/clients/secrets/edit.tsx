import SecretFormPage from '@/components/secrets/secret-form-page';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ClientSecretsEdit({
    client,
    secret,
}: {
    client: { id: number; name: string };
    secret: { id: number; label: string; description: string | null };
}) {
    return (
        <SecretFormPage
            title="Edit Client Secret"
            description={`Update a private secret for ${client.name}.`}
            submitLabel="Save secret"
            cancelHref={`/clients/${client.id}`}
            submitUrl={`/clients/${client.id}/secrets/${secret.id}`}
            method="put"
            initialData={{
                label: secret.label,
                description: secret.description ?? '',
                secret_value: '',
            }}
        />
    );
}

ClientSecretsEdit.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
