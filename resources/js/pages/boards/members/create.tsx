import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function BoardMembersCreate({
    client,
    board,
    project,
    eligible_users,
}: {
    client: { id: number; name: string };
    board: { id: number; name: string };
    project: { id: number; name: string };
    eligible_users: Array<{ id: number; name: string; email: string }>;
}) {
    const form = useForm({
        user_id: '',
    });

    const basePath = `/clients/${client.id}/boards/${board.id}/members`;

    const userOptions = eligible_users.map((user) => ({
        value: String(user.id),
        label: `${user.name} (${user.email})`,
    }));

    return (
        <>
            <Head title={`Add member to ${board.name}`} />
            <CrudPage
                title={`Add member to ${board.name}`}
                description={`${client.name} / ${project.name}`}
            >
                <div className="mx-auto max-w-lg space-y-6">
                    <div className="rounded-xl bg-card p-6 shadow-sm">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="user_id">
                                    Select a user to add
                                </Label>
                                <SearchableSelect
                                    id="user_id"
                                    value={form.data.user_id}
                                    options={userOptions}
                                    placeholder="Choose a client workspace user"
                                    emptyMessage="No eligible users found."
                                    onValueChange={(value) =>
                                        form.setData('user_id', value)
                                    }
                                />
                                {form.errors.user_id ? (
                                    <p className="text-xs text-destructive">
                                        {form.errors.user_id}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit(basePath)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={
                                form.processing || form.data.user_id === ''
                            }
                            onClick={() => form.post(basePath)}
                        >
                            Add member
                        </Button>
                    </div>
                </div>
            </CrudPage>
        </>
    );
}

BoardMembersCreate.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
