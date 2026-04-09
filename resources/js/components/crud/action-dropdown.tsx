import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ActionDropdownItem = {
    label: string;
    onClick: () => void;
    destructive?: boolean;
};

export function ActionDropdown({
    items,
    label,
    variant = 'ghost',
    side = 'bottom',
}: {
    items: ActionDropdownItem[];
    label?: string;
    variant?: 'ghost' | 'outline';
    side?: 'top' | 'bottom';
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {label ? (
                    <Button variant={variant} size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                        {label}
                    </Button>
                ) : (
                    <Button variant={variant} size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side={side}>
                {items.map((item) => (
                    <DropdownMenuItem
                        key={item.label}
                        variant={item.destructive ? 'destructive' : 'default'}
                        onClick={item.onClick}
                    >
                        {item.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
