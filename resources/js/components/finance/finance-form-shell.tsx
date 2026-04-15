import { Check, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type FinanceFormShellProps = {
    aside?: ReactNode;
    submitLabel: string;
    cancelLabel?: string;
    processing?: boolean;
    onCancel?: () => void;
    onSubmit: () => void;
    children: ReactNode;
};

export function FinanceFormShell({
    aside,
    submitLabel,
    cancelLabel = 'Cancel',
    processing = false,
    onCancel,
    onSubmit,
    children,
}: FinanceFormShellProps) {
    return (
        <form
            className="space-y-6"
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
        >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-6">{children}</div>
                {aside ? <div className="space-y-4">{aside}</div> : null}
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 rounded-xl bg-card/95 px-4 py-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85">
                {onCancel ? (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                ) : null}
                <Button
                    data-testid="dynamic-form-submit"
                    type="submit"
                    disabled={processing}
                >
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
