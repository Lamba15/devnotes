import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';

export type DynamicFormOption = {
    label: string;
    value: string | number;
};

export type DynamicFormField =
    | {
          name: string;
          label: string;
          type: 'text';
          placeholder?: string;
      }
    | {
          name: string;
          label: string;
          type: 'password';
          placeholder?: string;
      }
    | {
          name: string;
          label: string;
          type: 'textarea';
          placeholder?: string;
      }
    | {
          name: string;
          label: string;
          type: 'select';
          placeholder?: string;
          options: DynamicFormOption[];
      };

export function DynamicForm({
    fields,
    data,
    errors,
    processing = false,
    submitLabel,
    onChange,
    onSubmit,
}: {
    fields: DynamicFormField[];
    data: Record<string, string>;
    errors: Record<string, string | undefined>;
    processing?: boolean;
    submitLabel: string;
    onChange: (name: string, value: string) => void;
    onSubmit: () => void;
}) {
    return (
        <form
            className="grid gap-4 md:max-w-2xl md:grid-cols-2"
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
        >
            {fields.map((field) => (
                <div key={field.name} className="grid gap-2 md:col-span-2">
                    <Label htmlFor={field.name}>{field.label}</Label>
                    {field.type === 'text' ? (
                        <Input
                            id={field.name}
                            name={field.name}
                            value={data[field.name] ?? ''}
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
                            value={data[field.name] ?? ''}
                            placeholder={field.placeholder}
                            onChange={(event) =>
                                onChange(field.name, event.target.value)
                            }
                        />
                    ) : null}
                    {field.type === 'textarea' ? (
                        <textarea
                            id={field.name}
                            name={field.name}
                            className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={data[field.name] ?? ''}
                            placeholder={field.placeholder}
                            onChange={(event) =>
                                onChange(field.name, event.target.value)
                            }
                        />
                    ) : null}
                    {field.type === 'select' ? (
                        <SearchableSelect
                            id={field.name}
                            name={field.name}
                            value={data[field.name] ?? ''}
                            placeholder={
                                field.placeholder ?? `Select ${field.label}`
                            }
                            onValueChange={(value) =>
                                onChange(field.name, value)
                            }
                            options={field.options.map((option) => ({
                                value: String(option.value),
                                label: option.label,
                            }))}
                        />
                    ) : null}
                    {errors[field.name] ? (
                        <p className="text-sm text-destructive">
                            {errors[field.name]}
                        </p>
                    ) : null}
                </div>
            ))}
            <div className="md:col-span-2">
                <Button disabled={processing} type="submit">
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
