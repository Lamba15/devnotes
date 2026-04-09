import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';

export type DynamicFormOption = {
    label: string;
    value: string | number;
};

type BaseField = {
    name: string;
    label: string;
    placeholder?: string;
    wide?: boolean;
    description?: string;
};

export type DynamicFormField =
    | (BaseField & {
          type: 'text';
      })
    | (BaseField & {
          type: 'password';
      })
    | (BaseField & {
          type: 'textarea';
      })
    | (BaseField & {
          type: 'date';
      })
    | (BaseField & {
          type: 'select';
          options: DynamicFormOption[];
      });

export type DynamicFormSection = {
    name: string;
    title?: string;
    description?: string;
    fields: DynamicFormField[];
};

type Props = {
    fields?: DynamicFormField[];
    sections?: DynamicFormSection[];
    data: Record<string, string>;
    errors: Record<string, string | undefined>;
    processing?: boolean;
    submitLabel: string;
    cancelLabel?: string;
    onCancel?: () => void;
    onChange: (name: string, value: string) => void;
    onSubmit: () => void;
};

export function DynamicForm({
    fields,
    sections,
    data,
    errors,
    processing = false,
    submitLabel,
    cancelLabel = 'Cancel',
    onCancel,
    onChange,
    onSubmit,
}: Props) {
    const resolvedSections: DynamicFormSection[] = sections?.length
        ? sections
        : [
              {
                  name: 'main',
                  fields: fields ?? [],
              },
          ];

    return (
        <form
            className="space-y-6"
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
        >
            {resolvedSections.map((section) => {
                const hasSidebar = Boolean(section.title || section.description);

                const fieldsBlock = (
                    <Card className="border border-border/50">
                        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
                            {section.fields.map((field) => (
                                <FormField
                                    key={field.name}
                                    field={field}
                                    value={data[field.name] ?? ''}
                                    error={errors[field.name]}
                                    onChange={onChange}
                                />
                            ))}
                        </CardContent>
                    </Card>
                );

                if (!hasSidebar) {
                    return (
                        <div key={section.name}>
                            {fieldsBlock}
                        </div>
                    );
                }

                return (
                    <div
                        key={section.name}
                        className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]"
                    >
                        <div className="space-y-2">
                            {section.title ? (
                                <h3 className="text-base font-semibold text-foreground">
                                    {section.title}
                                </h3>
                            ) : null}
                            {section.description ? (
                                <p className="text-sm leading-6 text-muted-foreground">
                                    {section.description}
                                </p>
                            ) : null}
                        </div>
                        {fieldsBlock}
                    </div>
                );
            })}

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 rounded-xl bg-card/95 px-4 py-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85">
                {onCancel ? (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                ) : null}
                <Button disabled={processing} type="submit">
                    {submitLabel.toLowerCase().startsWith('create') ? (
                        <Plus className="mr-1.5 size-4" />
                    ) : (
                        <Check className="mr-1.5 size-4" />
                    )}
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}

function FormField({
    field,
    value,
    error,
    onChange,
}: {
    field: DynamicFormField;
    value: string;
    error?: string;
    onChange: (name: string, value: string) => void;
}) {
    const spanFull = field.wide || field.type === 'textarea';

    return (
        <div className={spanFull ? 'grid gap-2 md:col-span-2' : 'grid gap-2'}>
            <Label htmlFor={field.name}>{field.label}</Label>

            {field.type === 'text' ? (
                <Input
                    id={field.name}
                    name={field.name}
                    value={value}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                        onChange(field.name, event.target.value)
                    }
                />
            ) : null}

            {field.type === 'password' ? (
                <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    value={value}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                        onChange(field.name, event.target.value)
                    }
                />
            ) : null}

            {field.type === 'date' ? (
                <Input
                    id={field.name}
                    name={field.name}
                    type="date"
                    value={value}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                        onChange(field.name, event.target.value)
                    }
                />
            ) : null}

            {field.type === 'textarea' ? (
                <Textarea
                    id={field.name}
                    name={field.name}
                    value={value}
                    placeholder={field.placeholder}
                    className="min-h-28"
                    onChange={(event) =>
                        onChange(field.name, event.target.value)
                    }
                />
            ) : null}

            {field.type === 'select' ? (
                <SearchableSelect
                    id={field.name}
                    name={field.name}
                    value={value}
                    placeholder={field.placeholder ?? `Select ${field.label}`}
                    onValueChange={(nextValue) =>
                        onChange(field.name, nextValue)
                    }
                    options={field.options.map((option) => ({
                        value: String(option.value),
                        label: option.label,
                    }))}
                />
            ) : null}

            {field.description ? (
                <p className="text-sm text-muted-foreground">
                    {field.description}
                </p>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
    );
}
