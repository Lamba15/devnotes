import { Plus, Trash2 } from 'lucide-react';
import { FinanceFormShell } from '@/components/finance/finance-form-shell';
import { FinanceStatusBadge } from '@/components/finance/finance-status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { DateInput } from '@/components/ui/date-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrencyAmount } from '@/lib/format-currency';

export type InvoiceFormItem = {
    description: string;
    hours: string;
    rate: string;
    amount: string;
};

export type InvoiceFormDiscount = {
    label: string;
    type: 'fixed' | 'percent';
    value: string;
    target_type: 'invoice' | 'item';
    target_item_index: string;
};

export type InvoiceFormData = {
    project_id: string;
    reference: string;
    status: string;
    currency: string;
    issued_at: string;
    due_at: string;
    paid_at: string;
    notes: string;
    items: InvoiceFormItem[];
    discounts: InvoiceFormDiscount[];
};

type ProjectOption = {
    id: number;
    name: string;
    client: { id: number; name: string };
};

const currencyOptions = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'];
const invoiceStatusOptions = ['draft', 'pending', 'paid', 'overdue'];

export function createEmptyInvoiceItem(): InvoiceFormItem {
    return {
        description: '',
        hours: '',
        rate: '',
        amount: '',
    };
}

export function createEmptyInvoiceDiscount(): InvoiceFormDiscount {
    return {
        label: '',
        type: 'fixed',
        value: '',
        target_type: 'invoice',
        target_item_index: '',
    };
}

export function InvoiceFormEditor({
    title,
    description,
    data,
    errors,
    processing,
    submitLabel,
    projects,
    onCancel,
    onChange,
    onSubmit,
}: {
    title: string;
    description: string;
    data: InvoiceFormData;
    errors: Record<string, string | undefined>;
    processing: boolean;
    submitLabel: string;
    projects: ProjectOption[];
    onCancel: () => void;
    onChange: (data: InvoiceFormData) => void;
    onSubmit: () => void;
}) {
    const summary = computeInvoiceSummary(data);

    const setField = <K extends keyof InvoiceFormData>(
        field: K,
        value: InvoiceFormData[K],
    ) => {
        onChange({ ...data, [field]: value });
    };

    const updateItem = (
        index: number,
        field: keyof InvoiceFormItem,
        value: string,
    ) => {
        const items = [...data.items];
        items[index] = { ...items[index], [field]: value };
        onChange({ ...data, items });
    };

    const removeItem = (index: number) => {
        const items = data.items.filter((_, itemIndex) => itemIndex !== index);
        const discounts: InvoiceFormDiscount[] = data.discounts.map(
            (discount): InvoiceFormDiscount => {
                if (discount.target_type !== 'item') {
                    return discount;
                }

                const currentIndex = Number(discount.target_item_index);

                if (Number.isNaN(currentIndex)) {
                    return discount;
                }

                if (currentIndex === index) {
                    return {
                        ...discount,
                        target_type: 'invoice',
                        target_item_index: '',
                    };
                }

                if (currentIndex > index) {
                    return {
                        ...discount,
                        target_item_index: String(currentIndex - 1),
                    };
                }

                return discount;
            },
        );

        onChange({ ...data, items, discounts });
    };

    const updateDiscount = (
        index: number,
        field: keyof InvoiceFormDiscount,
        value: string,
    ) => {
        const discounts = [...data.discounts];
        const nextDiscount = { ...discounts[index], [field]: value };

        if (field === 'target_type' && value === 'invoice') {
            nextDiscount.target_item_index = '';
        }

        discounts[index] = nextDiscount;
        onChange({ ...data, discounts });
    };

    return (
        <FinanceFormShell
            submitLabel={submitLabel}
            processing={processing}
            onCancel={onCancel}
            onSubmit={onSubmit}
            aside={
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Computed totals</CardTitle>
                            <CardDescription>
                                Final totals are derived from items and
                                discounts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <SummaryRow
                                label="Subtotal"
                                value={formatCurrencyAmount(
                                    summary.subtotal,
                                    data.currency,
                                )}
                            />
                            <SummaryRow
                                label="Discounts"
                                value={`-${formatCurrencyAmount(summary.discountTotal, data.currency)}`}
                            />
                            <SummaryRow
                                label="Total"
                                value={formatCurrencyAmount(
                                    summary.total,
                                    data.currency,
                                )}
                                strong
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Invoice state</CardTitle>
                            <CardDescription>
                                These fields control how the invoice appears
                                across the app and document surfaces.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                    Status
                                </span>
                                <FinanceStatusBadge status={data.status} />
                            </div>
                            <SummaryRow
                                label="Issued"
                                value={data.issued_at || '—'}
                            />
                            <SummaryRow
                                label="Due"
                                value={data.due_at || '—'}
                            />
                            <SummaryRow
                                label="Paid"
                                value={data.paid_at || '—'}
                            />
                        </CardContent>
                    </Card>
                </>
            }
        >
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <Field label="Project" error={errors.project_id} wide>
                        <SearchableSelect
                            data-testid="project_id-select"
                            value={data.project_id}
                            onValueChange={(value) =>
                                setField('project_id', value)
                            }
                            options={projects.map((project) => ({
                                value: String(project.id),
                                label: `${project.client.name} / ${project.name}`,
                            }))}
                            placeholder="Select project"
                        />
                    </Field>

                    <Field label="Reference" error={errors.reference}>
                        <Input
                            name="reference"
                            value={data.reference}
                            onChange={(event) =>
                                setField('reference', event.target.value)
                            }
                            placeholder="Invoice reference"
                        />
                    </Field>

                    <Field label="Status" error={errors.status}>
                        <SelectInput
                            value={data.status}
                            onChange={(value) => setField('status', value)}
                            options={invoiceStatusOptions.map((status) => ({
                                value: status,
                                label:
                                    status.charAt(0).toUpperCase() +
                                    status.slice(1),
                            }))}
                        />
                    </Field>

                    <Field label="Currency" error={errors.currency}>
                        <SelectInput
                            value={data.currency}
                            onChange={(value) => setField('currency', value)}
                            options={currencyOptions.map((currency) => ({
                                value: currency,
                                label: currency,
                            }))}
                        />
                    </Field>

                    <Field label="Issued at" error={errors.issued_at}>
                        <DateInput
                            name="issued_at"
                            value={data.issued_at}
                            onChange={(value) => setField('issued_at', value)}
                        />
                    </Field>

                    <Field label="Due at" error={errors.due_at}>
                        <DateInput
                            name="due_at"
                            value={data.due_at}
                            onChange={(value) => setField('due_at', value)}
                        />
                    </Field>

                    <Field label="Paid at" error={errors.paid_at}>
                        <DateInput
                            name="paid_at"
                            value={data.paid_at}
                            onChange={(value) => setField('paid_at', value)}
                        />
                    </Field>

                    <Field label="Notes" error={errors.notes} wide>
                        <Textarea
                            name="notes"
                            value={data.notes}
                            onChange={(event) =>
                                setField('notes', event.target.value)
                            }
                            className="min-h-28"
                            placeholder="Optional invoice notes"
                        />
                    </Field>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                        <div>
                            <CardTitle>Invoice items</CardTitle>
                            <CardDescription>
                                Add hourly lines or flat lines. For flat lines,
                                leave hours and rate blank.
                            </CardDescription>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setField('items', [
                                    ...data.items,
                                    createEmptyInvoiceItem(),
                                ])
                            }
                        >
                            <Plus className="mr-1.5 size-4" />
                            Add item
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {data.items.map((item, index) => {
                            const itemSummary = summary.items[index];

                            return (
                                <div
                                    key={`invoice-item-${index}`}
                                    className="space-y-4 rounded-xl border p-4"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-medium">
                                                Item {index + 1}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Computed base amount:{' '}
                                                {formatCurrencyAmount(
                                                    itemSummary.baseAmount,
                                                    data.currency,
                                                )}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={data.items.length === 1}
                                            onClick={() => removeItem(index)}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-4">
                                        <Field
                                            label="Description"
                                            error={
                                                errors[
                                                    `items.${index}.description`
                                                ]
                                            }
                                            wide
                                        >
                                            <Input
                                                value={item.description}
                                                onChange={(event) =>
                                                    updateItem(
                                                        index,
                                                        'description',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Line item description"
                                            />
                                        </Field>
                                        <Field
                                            label="Hours"
                                            error={
                                                errors[`items.${index}.hours`]
                                            }
                                        >
                                            <Input
                                                value={item.hours}
                                                onChange={(event) =>
                                                    updateItem(
                                                        index,
                                                        'hours',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="0.00"
                                            />
                                        </Field>
                                        <Field
                                            label="Rate"
                                            error={
                                                errors[`items.${index}.rate`]
                                            }
                                        >
                                            <Input
                                                value={item.rate}
                                                onChange={(event) =>
                                                    updateItem(
                                                        index,
                                                        'rate',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="0.00"
                                            />
                                        </Field>
                                        <Field
                                            label="Flat amount"
                                            error={
                                                errors[`items.${index}.amount`]
                                            }
                                        >
                                            <Input
                                                value={item.amount}
                                                onChange={(event) =>
                                                    updateItem(
                                                        index,
                                                        'amount',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="0.00"
                                            />
                                        </Field>
                                    </div>
                                </div>
                            );
                        })}

                        {errors.items ? (
                            <p className="text-sm text-destructive">
                                {errors.items}
                            </p>
                        ) : null}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                        <div>
                            <CardTitle>Discounts</CardTitle>
                            <CardDescription>
                                Discounts can target the full invoice or a
                                single item. They stack in order.
                            </CardDescription>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setField('discounts', [
                                    ...data.discounts,
                                    createEmptyInvoiceDiscount(),
                                ])
                            }
                        >
                            <Plus className="mr-1.5 size-4" />
                            Add discount
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {data.discounts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No discounts yet.
                            </p>
                        ) : null}

                        {data.discounts.map((discount, index) => (
                            <div
                                key={`invoice-discount-${index}`}
                                className="grid gap-4 rounded-xl border p-4 md:grid-cols-[minmax(0,1.2fr)_10rem_10rem_12rem_auto]"
                            >
                                <Field
                                    label="Label"
                                    error={errors[`discounts.${index}.label`]}
                                >
                                    <Input
                                        value={discount.label}
                                        onChange={(event) =>
                                            updateDiscount(
                                                index,
                                                'label',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Discount label"
                                    />
                                </Field>
                                <Field
                                    label="Type"
                                    error={errors[`discounts.${index}.type`]}
                                >
                                    <SelectInput
                                        value={discount.type}
                                        onChange={(value) =>
                                            updateDiscount(index, 'type', value)
                                        }
                                        options={[
                                            {
                                                value: 'fixed',
                                                label: 'Fixed',
                                            },
                                            {
                                                value: 'percent',
                                                label: 'Percent',
                                            },
                                        ]}
                                    />
                                </Field>
                                <Field
                                    label="Value"
                                    error={errors[`discounts.${index}.value`]}
                                >
                                    <Input
                                        value={discount.value}
                                        onChange={(event) =>
                                            updateDiscount(
                                                index,
                                                'value',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="0.00"
                                    />
                                </Field>
                                <div className="grid gap-4 md:col-span-1 md:grid-cols-2">
                                    <Field
                                        label="Target"
                                        error={
                                            errors[
                                                `discounts.${index}.target_type`
                                            ]
                                        }
                                    >
                                        <SelectInput
                                            value={discount.target_type}
                                            onChange={(value) =>
                                                updateDiscount(
                                                    index,
                                                    'target_type',
                                                    value,
                                                )
                                            }
                                            options={[
                                                {
                                                    value: 'invoice',
                                                    label: 'Invoice',
                                                },
                                                {
                                                    value: 'item',
                                                    label: 'Item',
                                                },
                                            ]}
                                        />
                                    </Field>
                                    <Field
                                        label="Item"
                                        error={
                                            errors[
                                                `discounts.${index}.target_item_index`
                                            ]
                                        }
                                    >
                                        <SelectInput
                                            value={discount.target_item_index}
                                            onChange={(value) =>
                                                updateDiscount(
                                                    index,
                                                    'target_item_index',
                                                    value,
                                                )
                                            }
                                            disabled={
                                                discount.target_type !== 'item'
                                            }
                                            options={data.items.map(
                                                (item, itemIndex) => ({
                                                    value: String(itemIndex),
                                                    label:
                                                        item.description.trim() ||
                                                        `Item ${itemIndex + 1}`,
                                                }),
                                            )}
                                        />
                                    </Field>
                                </div>
                                <div className="flex items-end justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            setField(
                                                'discounts',
                                                data.discounts.filter(
                                                    (_, discountIndex) =>
                                                        discountIndex !== index,
                                                ),
                                            )
                                        }
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </FinanceFormShell>
    );
}

function computeInvoiceSummary(data: InvoiceFormData) {
    const items = data.items.map((item) => {
        const hours = Number(item.hours || 0);
        const rate = Number(item.rate || 0);
        const usesHours = item.hours !== '' || item.rate !== '';
        const baseAmount = usesHours
            ? roundCurrency(hours * rate)
            : roundCurrency(Number(item.amount || 0));

        return {
            baseAmount,
            currentAmount: baseAmount,
        };
    });

    for (const discount of data.discounts.filter(
        (entry) => entry.target_type === 'item',
    )) {
        const itemIndex = Number(discount.target_item_index);

        if (!Number.isInteger(itemIndex) || !items[itemIndex]) {
            continue;
        }

        const discountAmount = resolveDiscountAmount(
            items[itemIndex].currentAmount,
            discount.type,
            Number(discount.value || 0),
        );

        items[itemIndex].currentAmount = roundCurrency(
            items[itemIndex].currentAmount - discountAmount,
        );
    }

    const subtotal = roundCurrency(
        items.reduce((sum, item) => sum + item.baseAmount, 0),
    );

    let total = roundCurrency(
        items.reduce((sum, item) => sum + item.currentAmount, 0),
    );

    for (const discount of data.discounts.filter(
        (entry) => entry.target_type === 'invoice',
    )) {
        total = roundCurrency(
            total -
                resolveDiscountAmount(
                    total,
                    discount.type,
                    Number(discount.value || 0),
                ),
        );
    }

    return {
        items,
        subtotal,
        total,
        discountTotal: roundCurrency(subtotal - total),
    };
}

function resolveDiscountAmount(
    currentAmount: number,
    type: 'fixed' | 'percent',
    value: number,
) {
    if (currentAmount <= 0 || value <= 0) {
        return 0;
    }

    const amount =
        type === 'percent'
            ? roundCurrency(currentAmount * (value / 100))
            : roundCurrency(value);

    return Math.min(amount, currentAmount);
}

function roundCurrency(value: number) {
    return Math.round(value * 100) / 100;
}

function Field({
    label,
    error,
    wide = false,
    children,
}: {
    label: string;
    error?: string;
    wide?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className={wide ? 'grid gap-2 md:col-span-2' : 'grid gap-2'}>
            <Label>{label}</Label>
            {children}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
    );
}

function SelectInput({
    value,
    onChange,
    options,
    disabled = false,
    placeholder = 'Select',
}: {
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    disabled?: boolean;
    placeholder?: string;
}) {
    return (
        <SearchableSelect
            value={value}
            disabled={disabled}
            onValueChange={onChange}
            options={options}
            placeholder={placeholder}
            isClearable={false}
        />
    );
}

function SummaryRow({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span className={strong ? 'font-semibold' : 'font-medium'}>
                {value}
            </span>
        </div>
    );
}
