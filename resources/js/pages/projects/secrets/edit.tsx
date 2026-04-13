import SecretFormPage from '@/components/secrets/secret-form-page';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ProjectSecretsEdit({
    client,
    project,
    secret,
}: {
    client: { id: number; name: string };
    project: { id: number; name: string };
    secret: { id: number; label: string; description: string | null };
}) {
    return (
        <SecretFormPage
            title="Edit Project Secret"
            description={`Update a private secret for ${client.name} / ${project.name}.`}
            submitLabel="Save secret"
            cancelHref={`/clients/${client.id}/projects/${project.id}`}
            submitUrl={`/clients/${client.id}/projects/${project.id}/secrets/${secret.id}`}
            method="put"
            initialData={{
                label: secret.label,
                description: secret.description ?? '',
                secret_value: '',
            }}
        />
    );
}

ProjectSecretsEdit.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
