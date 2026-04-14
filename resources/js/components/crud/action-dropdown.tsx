import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export type ActionDropdownItem = {
    label: string;
    onClick: () => void;
    destructive?: boolean;
    disabled?: boolean;
    disabledReason?: string;
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
                {items.map((item) => {
                    const menuItem = (
                        <DropdownMenuItem
                            key={item.label}
                            variant={item.destructive ? 'destructive' : 'default'}
                            onClick={item.onClick}
                            disabled={item.disabled}
                        >
                            {item.label}
                        </DropdownMenuItem>
                    );

                    if (item.disabledReason) {
                        return (
                            <TooltipProvider key={item.label}>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <div className="w-full">{menuItem}</div>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                        <p>{item.disabledReason}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    }

                    return menuItem;
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
