import { Head, router, useForm } from '@inertiajs/react';
import { Camera, Check, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useRef } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import {
    KeyValueListEditor,
    TagListEditor,
} from '@/components/forms/repeatable-editors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';

export default function ClientsEdit({
    client,
    behaviors,
}: {
    client: any;
    behaviors: Array<{ id: number; name: string; slug: string }>;
}) {
    const form = useForm({
        name: client.name ?? '',
        email: client.email ?? '',
        behavior_id: client.behavior_id ? String(client.behavior_id) : '',
        industry: client.industry ?? '',
        country_of_origin: client.country_of_origin ?? '',
        address: client.address ?? '',
        birthday: client.birthday ?? '',
        date_of_first_interaction: client.date_of_first_interaction ?? '',
        origin: client.origin ?? '',
        notes: client.notes ?? '',
        tags: client.tags ?? [],
        phone_numbers: (client.phone_numbers ?? []).map((phone: any) => ({
            label: phone.label ?? '',
            value: phone.number ?? '',
        })),
        social_links: (client.social_links ?? []).map((link: any) => ({
            label: link.label ?? '',
            value: link.url ?? '',
        })),
    });

    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        router.post(`/clients/${client.id}/image`, formData as any, {
            preserveScroll: true,
            forceFormData: true,
        });
    };

    const handleImageRemove = () => {
        router.delete(`/clients/${client.id}/image`, {
            preserveScroll: true,
        });
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            name: data.name,
            email: data.email || null,
            behavior_id: data.behavior_id ? Number(data.behavior_id) : null,
            industry: data.industry || null,
            country_of_origin: data.country_of_origin || null,
            address: data.address || null,
            birthday: data.birthday || null,
            date_of_first_interaction: data.date_of_first_interaction || null,
            origin: data.origin || null,
            notes: data.notes || null,
            tags: data.tags.map((tag: string) => tag.trim()).filter(Boolean),
            phone_numbers: data.phone_numbers
                .filter(
                    (entry: { label: string; value: string }) =>
                        entry.value.trim() !== '',
                )
                .map((entry: { label: string; value: string }) => ({
                    label: entry.label.trim() || null,
                    number: entry.value.trim(),
                })),
            social_links_json: data.social_links
                .filter(
                    (entry: { label: string; value: string }) =>
                        entry.value.trim() !== '',
                )
                .map((entry: { label: string; value: string }) => ({
                    label: entry.label.trim() || null,
                    url: entry.value.trim(),
                })),
        }));
        form.put(`/clients/${client.id}`);
    };

    return (
        <>
            <Head title={`Edit ${client.name}`} />
            <CrudPage
                title={`Edit ${client.name}`}
                description="Edit the client profile on its own page."
            >
                <form className="space-y-6" onSubmit={submit}>
                    <section className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                        <div className="space-y-2">
                            <h3 className="text-base font-semibold">
                                Client photo
                            </h3>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Upload a profile image for this client.
                            </p>
                        </div>
                        <div className="flex items-center gap-4 rounded-xl border p-5">
                            <Avatar className="size-16">
                                {client.image_path && (
                                    <AvatarImage
                                        src={`/storage/${client.image_path}`}
                                        alt={client.name}
                                    />
                                )}
                                <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                                    {(client.name ?? '')
                                        .split(' ')
                                        .map((p: string) => p[0])
                                        .slice(0, 2)
                                        .join('')
                                        .toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex gap-2">
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleImageUpload(file);
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => imageInputRef.current?.click()}
                                >
                                    <Camera className="mr-1.5 size-3.5" />
                                    {client.image_path ? 'Change photo' : 'Upload photo'}
                                </Button>
                                {client.image_path && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleImageRemove}
                                    >
                                        <X className="mr-1.5 size-3.5" />
                                        Remove
                                    </Button>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                        <div className="space-y-2">
                            <h3 className="text-base font-semibold">
                                Client profile
                            </h3>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Edit the richer client profile here instead of
                                from the overview page.
                            </p>
                        </div>
                        <div className="grid gap-4 rounded-xl border p-5 md:grid-cols-2">
                            <Field label="Name">
                                <Input
                                    value={form.data.name}
                                    onChange={(e) =>
                                        form.setData('name', e.target.value)
                                    }
                                />
                            </Field>
                            <Field label="Email">
                                <Input
                                    value={form.data.email}
                                    onChange={(e) =>
                                        form.setData('email', e.target.value)
                                    }
                                />
                            </Field>
                            <Field label="Behavior">
                                <SearchableSelect
                                    value={form.data.behavior_id}
                                    onValueChange={(value) =>
                                        form.setData('behavior_id', value)
                                    }
                                    options={behaviors.map((b) => ({
                                        value: String(b.id),
                                        label: b.name,
                                    }))}
                                    placeholder="Select behavior"
                                />
                            </Field>
                            <Field label="Industry">
                                <Input
                                    value={form.data.industry}
                                    onChange={(e) =>
                                        form.setData('industry', e.target.value)
                                    }
                                />
                            </Field>
                            <Field label="Country of origin">
                                <Input
                                    value={form.data.country_of_origin}
                                    onChange={(e) =>
                                        form.setData(
                                            'country_of_origin',
                                            e.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <Field label="Origin">
                                <Input
                                    value={form.data.origin}
                                    onChange={(e) =>
                                        form.setData('origin', e.target.value)
                                    }
                                />
                            </Field>
                            <Field label="Birthday">
                                <Input
                                    type="date"
                                    value={form.data.birthday}
                                    onChange={(e) =>
                                        form.setData('birthday', e.target.value)
                                    }
                                />
                            </Field>
                            <Field label="First interaction">
                                <Input
                                    type="date"
                                    value={form.data.date_of_first_interaction}
                                    onChange={(e) =>
                                        form.setData(
                                            'date_of_first_interaction',
                                            e.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <Field label="Tags" fullWidth>
                                <TagListEditor
                                    values={form.data.tags}
                                    onChange={(values) =>
                                        form.setData('tags', values)
                                    }
                                />
                            </Field>
                            <Field label="Phone numbers" fullWidth>
                                <KeyValueListEditor
                                    values={form.data.phone_numbers}
                                    onChange={(values) =>
                                        form.setData('phone_numbers', values)
                                    }
                                    valueLabel="Phone number"
                                    addLabel="Add phone number"
                                />
                            </Field>
                            <Field label="Social links" fullWidth>
                                <KeyValueListEditor
                                    values={form.data.social_links}
                                    onChange={(values) =>
                                        form.setData('social_links', values)
                                    }
                                    valueLabel="URL"
                                    addLabel="Add social link"
                                />
                            </Field>
                            <Field label="Address" fullWidth>
                                <Textarea
                                    value={form.data.address}
                                    onChange={(e) =>
                                        form.setData('address', e.target.value)
                                    }
                                    className="min-h-24"
                                />
                            </Field>
                            <Field label="Notes" fullWidth>
                                <Textarea
                                    value={form.data.notes}
                                    onChange={(e) =>
                                        form.setData('notes', e.target.value)
                                    }
                                    className="min-h-32"
                                />
                            </Field>
                        </div>
                    </section>
                    <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 rounded-xl border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                router.visit(`/clients/${client.id}`)
                            }
                        >
                            Back to client
                        </Button>
                        <Button disabled={form.processing} type="submit">
                            <Check className="mr-1.5 size-4" />
                            Save client
                        </Button>
                    </div>
                </form>
            </CrudPage>
        </>
    );
}

function Field({
    label,
    children,
    fullWidth = false,
}: {
    label: string;
    children: React.ReactNode;
    fullWidth?: boolean;
}) {
    return (
        <div className={fullWidth ? 'grid gap-2 md:col-span-2' : 'grid gap-2'}>
            <Label>{label}</Label>
            {children}
        </div>
    );
}

ClientsEdit.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
