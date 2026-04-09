import { Transition } from '@headlessui/react';
import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { Camera, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Auth } from '@/types';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const isPlatformOwner = Boolean(auth.user.capabilities?.platform);
    const avatarInput = useRef<HTMLInputElement>(null);

    const avatarUrl = auth.user.avatar_path
        ? `/storage/${auth.user.avatar_path}`
        : undefined;

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        router.post('/settings/profile/avatar', formData as any, {
            preserveScroll: true,
            forceFormData: true,
        });
    };

    const handleRemoveAvatar = () => {
        router.delete('/settings/profile/avatar', {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            {/* Avatar section */}
            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profile photo"
                    description="Upload a profile picture to personalize your account"
                />

                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <Avatar className="size-20 text-lg">
                            <AvatarImage src={avatarUrl} alt={auth.user.name} />
                            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                                {getInitials(auth.user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <button
                            type="button"
                            onClick={() => avatarInput.current?.click()}
                            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                            <Camera className="size-5 text-white" />
                        </button>
                        <input
                            ref={avatarInput}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium">{auth.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {auth.user.email}
                        </p>
                        <div className="flex gap-2 pt-1">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => avatarInput.current?.click()}
                            >
                                <Camera className="mr-1.5 size-3.5" />
                                Upload
                            </Button>
                            {avatarUrl && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleRemoveAvatar}
                                    className="text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="mr-1.5 size-3.5" />
                                    Remove
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile info section */}
            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profile information"
                    description="Update your name and email address"
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, recentlySuccessful, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>

                                <Input
                                    id="name"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Full name"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.name}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>

                                <Input
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="Email address"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.email}
                                />
                            </div>

                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <div>
                                        <p className="-mt-4 text-sm text-muted-foreground">
                                            Your email address is unverified.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                            >
                                                Click here to resend the
                                                verification email.
                                            </Link>
                                        </p>

                                        {status ===
                                            'verification-link-sent' && (
                                            <div className="mt-2 text-sm font-medium text-green-600">
                                                A new verification link has been
                                                sent to your email address.
                                            </div>
                                        )}
                                    </div>
                                )}

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    Save
                                </Button>

                                <Transition
                                    show={recentlySuccessful}
                                    enter="transition ease-in-out"
                                    enterFrom="opacity-0"
                                    leave="transition ease-in-out"
                                    leaveTo="opacity-0"
                                >
                                    <p className="text-sm text-neutral-600">
                                        Saved
                                    </p>
                                </Transition>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            {!isPlatformOwner && <DeleteUser />}
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
