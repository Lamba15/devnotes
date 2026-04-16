import { Transition } from '@headlessui/react';
import { Form, Head } from '@inertiajs/react';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import AISettingsController from '@/actions/App/Http/Controllers/Settings/AISettingsController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { edit as editAISettings } from '@/routes/ai-settings';

type Props = {
    hasOpenRouterApiKey: boolean;
    openRouterModel: string | null;
    openRouterSystemPrompt: string | null;
    defaultSystemPrompt: string;
    activeSystemPromptSource: 'custom' | 'default';
    openRouterModels: Array<{
        value: string;
        label: string;
    }>;
};

export default function AISettings({
    hasOpenRouterApiKey,
    openRouterModel,
    openRouterSystemPrompt,
    defaultSystemPrompt,
    activeSystemPromptSource,
    openRouterModels,
}: Props) {
    const [systemPrompt, setSystemPrompt] = useState(
        openRouterSystemPrompt ?? defaultSystemPrompt,
    );
    const [usesDefaultPrompt, setUsesDefaultPrompt] = useState(
        activeSystemPromptSource === 'default',
    );

    return (
        <>
            <Head title="AI settings" />

            <h1 className="sr-only">AI settings</h1>

            <div className="space-y-8">
                <Heading
                    variant="small"
                    title="AI settings"
                    description="Configure the model, credentials, and behavior used by the platform assistant for all users"
                />

                <Form
                    {...AISettingsController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, recentlySuccessful, errors }) => (
                        <>
                            <input
                                type="hidden"
                                name="openrouter_system_prompt"
                                value={usesDefaultPrompt ? '' : systemPrompt}
                            />

                            <Card className="gap-0 py-0 shadow-none">
                                <CardHeader className="py-5">
                                    <CardTitle className="text-base">
                                        Model and credentials
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 pb-5">
                                    <div className="grid gap-2">
                                        <Label htmlFor="openrouter_model">
                                            OpenRouter model
                                        </Label>
                                        <SearchableSelect
                                            id="openrouter_model"
                                            name="openrouter_model"
                                            defaultValue={openRouterModel ?? ''}
                                            placeholder="Select a model"
                                            options={openRouterModels}
                                        />
                                        <InputError
                                            message={errors.openrouter_model}
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            This model will be used for all
                                            assistant conversations across the
                                            platform.
                                        </p>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="openrouter_api_key">
                                            OpenRouter API key
                                        </Label>
                                        <Input
                                            id="openrouter_api_key"
                                            type="password"
                                            name="openrouter_api_key"
                                            autoComplete="off"
                                            placeholder={
                                                hasOpenRouterApiKey
                                                    ? 'Saved key is set. Enter a new key to replace it.'
                                                    : 'sk-or-v1-...'
                                            }
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            {hasOpenRouterApiKey
                                                ? 'Leave this blank to keep the currently saved key.'
                                                : 'Paste your OpenRouter API key here. This key will be used for all users.'}
                                        </p>
                                        <InputError
                                            message={errors.openrouter_api_key}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="gap-0 py-0 shadow-none">
                                <CardHeader className="py-5">
                                    <CardTitle className="text-base">
                                        Agent behavior
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 pb-5">
                                    <div className="grid gap-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <Label htmlFor="openrouter_system_prompt">
                                                System prompt
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-full border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                                                    {activeSystemPromptSource ===
                                                    'custom'
                                                        ? 'Using custom prompt'
                                                        : 'Using default prompt'}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSystemPrompt(
                                                            defaultSystemPrompt,
                                                        );
                                                        setUsesDefaultPrompt(
                                                            true,
                                                        );
                                                    }}
                                                >
                                                    <RotateCcw className="size-4" />
                                                    Reset to default
                                                </Button>
                                            </div>
                                        </div>
                                        <Textarea
                                            id="openrouter_system_prompt"
                                            value={systemPrompt}
                                            onChange={(event) => {
                                                setSystemPrompt(
                                                    event.target.value,
                                                );
                                                setUsesDefaultPrompt(
                                                    event.target.value ===
                                                        defaultSystemPrompt,
                                                );
                                            }}
                                            className="min-h-52"
                                            placeholder="You are the devnotes agent..."
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            This controls how the agent speaks
                                            and behaves for all users on the
                                            platform.
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Resetting to default removes the
                                            custom override and makes the agent
                                            use the built-in prompt again.
                                        </p>
                                        <InputError
                                            message={
                                                errors.openrouter_system_prompt
                                            }
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="gap-0 py-0 shadow-none">
                                <CardHeader className="py-5">
                                    <CardTitle className="text-base">
                                        Built-in default prompt reference
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 pb-5">
                                    <p className="text-sm text-muted-foreground">
                                        This is the same built-in prompt shown
                                        in the editor when you are using the
                                        default behavior.
                                    </p>
                                    <Textarea
                                        value={defaultSystemPrompt}
                                        readOnly
                                        className="min-h-72"
                                    />
                                </CardContent>
                            </Card>

                            <div className="flex items-center gap-4">
                                <Button disabled={processing}>
                                    Save AI settings
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
        </>
    );
}

AISettings.layout = {
    breadcrumbs: [
        {
            title: 'AI settings',
            href: editAISettings(),
        },
    ],
};
