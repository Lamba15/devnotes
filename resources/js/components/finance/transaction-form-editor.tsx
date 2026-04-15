import { FinanceAmount } from '@/components/finance/finance-amount';
import { FinanceFormShell } from '@/components/finance/finance-form-shell';
import { FinanceProjectLabel } from '@/components/finance/finance-project-label';
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

export type TransactionFormData = {
    project_id: string;
    description: string;
    amount: string;
    occurred_date: string;
    category: string;
    currency: string;
};

type ProjectOption = {
    id: number;
    name: string;
    client: { id: number; name: string };
};

const currencyOptions = ['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'];

export function TransactionFormEditor({
    title,
    description,
    data,
    errors,
    processing,
    submitLabel,
    projects,
    categoryOptions,
    onCancel,
    onChange,
    onSubmit,
}: {
    title: string;
    description: string;
    data: TransactionFormData;
    errors: Record<string, string | undefined>;
    processing: boolean;
    submitLabel: string;
    projects: ProjectOption[];
    categoryOptions: Array<{ label: string; value: string }>;
    onCancel: () => void;
    onChange: (data: TransactionFormData) => void;
    onSubmit: () => void;
}) {
    const setField = <K extends keyof TransactionFormData>(
        field: K,
        value: TransactionFormData[K],
    ) => {
        onChange({ ...data, [field]: value });
    };

    const selectedProject =
        projects.find((project) => String(project.id) === data.project_id) ??
        null;
    const amount = Number(data.amount || 0);
    const direction = amount >= 0 ? 'Income' : 'Expense';

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
                            <CardTitle>Transaction summary</CardTitle>
                            <CardDescription>
                                The amount and project context stay visible
                                while you edit the record.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <SummaryRow label="Direction" value={direction} />
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                    Amount
                                </span>
                                <FinanceAmount
                                    amount={amount}
                                    currency={data.currency}
                                    variant="transaction"
                                />
                            </div>
                            <SummaryRow
                                label="Occurred"
                                value={data.occurred_date || '—'}
                            />
                            <SummaryRow
                                label="Category"
                                value={data.category || '—'}
                            />
                            <SummaryRow
                                label="Currency"
                                value={data.currency || '—'}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Project</CardTitle>
                            <CardDescription>
                                Transactions always belong to one project.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FinanceProjectLabel
                                stacked
                                project={selectedProject}
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

                    <Field label="Description" error={errors.description} wide>
                        <Input
                            name="description"
                            value={data.description}
                            onChange={(event) =>
                                setField('description', event.target.value)
                            }
                            placeholder="Transaction description"
                        />
                    </Field>

                    <Field label="Amount" error={errors.amount}>
                        <Input
                            name="amount"
                            value={data.amount}
                            onChange={(event) =>
                                setField('amount', event.target.value)
                            }
                            placeholder="0.00"
                        />
                    </Field>

                    <Field label="Occurred on" error={errors.occurred_date}>
                        <DateInput
                            name="occurred_date"
                            value={data.occurred_date}
                            onChange={(value) =>
                                setField('occurred_date', value)
                            }
                        />
                    </Field>

                    <Field label="Category" error={errors.category}>
                        <SearchableSelect
                            value={data.category}
                            onValueChange={(value) =>
                                setField('category', value)
                            }
                            placeholder="Select or create category"
                            isCreatable
                            options={categoryOptions}
                        />
                    </Field>

                    <Field label="Currency" error={errors.currency}>
                        <SearchableSelect
                            value={data.currency}
                            onValueChange={(value) =>
                                setField('currency', value)
                            }
                            placeholder="Select or create currency"
                            isCreatable
                            options={currencyOptions.map((currency) => ({
                                value: currency,
                                label: currency,
                            }))}
                        />
                    </Field>
                </CardContent>
            </Card>
        </FinanceFormShell>
    );
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

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground">{value}</span>
        </div>
    );
}
