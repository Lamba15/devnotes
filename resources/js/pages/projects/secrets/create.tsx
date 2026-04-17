import SecretFormPage from '@/components/secrets/secret-form-page';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ProjectSecretsCreate({
    client,
    project,
}: {
    client: { id: number; name: string };
    project: { id: number; name: string };
}) {
    return (
        <SecretFormPage
            title="Create Project Secret"
            description={`Add a private secret for ${client.name} / ${project.name}.`}
            submitLabel="Create secret"
            submitUrl={`/clients/${client.id}/projects/${project.id}/secrets`}
            method="post"
            initialData={{
                label: '',
                description: '',
                secret_value: '',
            }}
        />
    );
}

ProjectSecretsCreate.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
