import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import {
    addMonths,
    addYears,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isToday,
    startOfMonth,
    startOfWeek,
    subMonths,
    subYears,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
    formatDateOnly,
    parseDateOnlyValue,
    toDateOnlyValue,
} from '@/lib/datetime';
import { cn } from '@/lib/utils';

type Props = {
    id?: string;
    name?: string;
    value?: string | null;
    onChange: (value: string) => void;
    className?: string;
    placeholderText?: string;
    disabled?: boolean;
    required?: boolean;
    'aria-invalid'?: boolean | 'true' | 'false';
};

/** Touch-detection helper for mobile fallback. */
function useIsMobile(): boolean {
    const [mobile, setMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(pointer: coarse) and (max-width: 768px)');
        setMobile(mq.matches);

        const handle = (event: MediaQueryListEvent) => setMobile(event.matches);
        mq.addEventListener('change', handle);

        return () => mq.removeEventListener('change', handle);
    }, []);

    return mobile;
}

export function DateInput({
    id,
    name,
    value,
    onChange,
    className,
    placeholderText = 'Select date',
    disabled,
    required,
    'aria-invalid': ariaInvalid,
}: Props) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <NativeDateInput
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                className={className}
                disabled={disabled}
                required={required}
                aria-invalid={ariaInvalid}
            />
        );
    }

    return (
        <DesktopDateInput
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            className={className}
            placeholderText={placeholderText}
            disabled={disabled}
            required={required}
            aria-invalid={ariaInvalid}
        />
    );
}

/* ────────────────────────────────────────────────────────────────────────────
 * NATIVE MOBILE DATE INPUT
 * ──────────────────────────────────────────────────────────────────────────── */

function NativeDateInput({
    id,
    name,
    value,
    onChange,
    className,
    disabled,
    required,
    'aria-invalid': ariaInvalid,
}: Omit<Props, 'placeholderText'>) {
    return (
        <div className="relative block w-full">
            <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
                id={id}
                name={name}
                type="date"
                value={value ?? ''}
                disabled={disabled}
                required={required}
                aria-invalid={ariaInvalid}
                className={cn(
                    'border-input text-foreground placeholder:text-muted-foreground flex h-9 w-full min-w-0 items-center rounded-md border bg-transparent pr-9 pl-9 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive md:text-sm',
                    className,
                )}
                onChange={(event) => onChange(event.target.value)}
            />
            {value && !disabled ? (
                <button
                    type="button"
                    className="absolute top-1/2 right-2 z-10 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onChange('')}
                >
                    <X className="size-3.5" />
                    <span className="sr-only">Clear date</span>
                </button>
            ) : null}
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
 * PREMIUM DESKTOP CUSTOM DATE INPUT
 * ──────────────────────────────────────────────────────────────────────────── */

type ViewMode = 'days' | 'months' | 'years';

function DesktopDateInput({
    id,
    name,
    value,
    onChange,
    className,
    placeholderText = 'Select date',
    disabled,
    required,
    'aria-invalid': ariaInvalid,
}: Props) {
    const selectedDate = parseDateOnlyValue(value);
    const [viewDate, setViewDate] = useState<Date>(selectedDate ?? new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('days');

    // Ref used to auto-close the PopoverPanel imperatively
    const closeRef = useRef<(() => void) | null>(null);

    const handleSelectDay = useCallback(
        (date: Date) => {
            onChange(toDateOnlyValue(date));
            closeRef.current?.();
        },
        [onChange],
    );

    // Provide a continuous smooth UX: open the popover at the selected date (or today) and reset view.
    const handleOpen = () => {
        setViewDate(selectedDate ?? new Date());
        setViewMode('days');
    };

    return (
        <Popover className="relative block w-full">
            {({ close }) => {
                closeRef.current = close;

                return (
                    <>
                        <PopoverButton
                            id={id}
                            disabled={disabled}
                            onClick={handleOpen}
                            className={cn(
                                'border-input text-foreground placeholder:text-muted-foreground flex h-9 w-full min-w-0 items-center rounded-md border bg-transparent pr-10 pl-9 py-1 text-left text-base shadow-xs transition-[color,box-shadow,background] outline-none hover:bg-accent/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive md:text-sm',
                                !value && 'text-muted-foreground',
                                className,
                            )}
                            aria-invalid={ariaInvalid}
                        >
                            <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <span className="truncate">
                                {value
                                    ? formatDateOnly(value)
                                    : placeholderText}
                            </span>
                        </PopoverButton>

                        <input
                            type="hidden"
                            name={name}
                            value={value ?? ''}
                            required={required}
                        />

                        {value && !disabled ? (
                            <button
                                type="button"
                                className="absolute top-1/2 right-2 z-10 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange('');
                                }}
                            >
                                <X className="size-3.5" />
                                <span className="sr-only">Clear date</span>
                            </button>
                        ) : null}

                        <PopoverPanel
                            anchor="bottom start"
                            className="devnotes-date-popover z-50 mt-2 w-[280px] overflow-hidden rounded-xl border border-border bg-card shadow-xl focus:outline-none"
                        >
                            <CalendarEngine
                                viewDate={viewDate}
                                setViewDate={setViewDate}
                                viewMode={viewMode}
                                setViewMode={setViewMode}
                                selectedDate={selectedDate}
                                onSelectDay={handleSelectDay}
                            />
                        </PopoverPanel>
                    </>
                );
            }}
        </Popover>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
 * CALENDAR ENGINE (Views + State Handling)
 * ──────────────────────────────────────────────────────────────────────────── */

type CalendarEngineProps = {
    viewDate: Date;
    setViewDate: (d: Date) => void;
    viewMode: ViewMode;
    setViewMode: (v: ViewMode) => void;
    selectedDate: Date | null;
    onSelectDay: (d: Date) => void;
};

// Generates a nice 12-year window (e.g., 2020 to 2031) based on the current viewDate.
function getYearRange(date: Date) {
    const year = date.getFullYear();
    const startYear = Math.floor(year / 12) * 12;
    return Array.from({ length: 12 }, (_, i) => startYear + i);
}

function CalendarEngine({
    viewDate,
    setViewDate,
    viewMode,
    setViewMode,
    selectedDate,
    onSelectDay,
}: CalendarEngineProps) {
    const [slideDir, setSlideDir] = useState(0);

    const navigatePrev = () => {
        setSlideDir(-1);
        if (viewMode === 'days') setViewDate(subMonths(viewDate, 1));
        if (viewMode === 'months') setViewDate(subYears(viewDate, 1));
        if (viewMode === 'years') setViewDate(subYears(viewDate, 12));
    };

    const navigateNext = () => {
        setSlideDir(1);
        if (viewMode === 'days') setViewDate(addMonths(viewDate, 1));
        if (viewMode === 'months') setViewDate(addYears(viewDate, 1));
        if (viewMode === 'years') setViewDate(addYears(viewDate, 12));
    };

    const toggleViewMode = () => {
        if (viewMode === 'days') setViewMode('months');
        else if (viewMode === 'months') setViewMode('years');
    };

    // Calculate header label
    let headerLabel = '';
    if (viewMode === 'days') headerLabel = format(viewDate, 'MMMM yyyy');
    if (viewMode === 'months') headerLabel = format(viewDate, 'yyyy');
    if (viewMode === 'years') {
        const years = getYearRange(viewDate);
        headerLabel = `${years[0]} - ${years[years.length - 1]}`;
    }

    return (
        <div className="flex flex-col p-3 text-card-foreground">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <button
                    type="button"
                    onClick={navigatePrev}
                    className="inline-flex size-7 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={toggleViewMode}
                    disabled={viewMode === 'years'}
                    className="flex-1 rounded-md px-2 py-1 text-sm font-semibold hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none"
                >
                    {headerLabel}
                </button>
                <button
                    type="button"
                    onClick={navigateNext}
                    className="inline-flex size-7 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                    <ChevronRight className="size-4" />
                </button>
            </div>

            {/* Views with smooth slide-in/out motions */}
            <div className="relative overflow-hidden" style={{ minHeight: '220px' }}>
                <AnimatePresence mode="popLayout" initial={false} custom={slideDir}>
                    <motion.div
                        key={`${viewMode}-${viewDate.getTime()}`}
                        custom={slideDir}
                        variants={{
                            enter: (dir: number) => ({
                                opacity: 0,
                                x: dir === 1 ? 20 : dir === -1 ? -20 : 0,
                                scale: dir === 0 ? 0.95 : 1,
                            }),
                            center: {
                                opacity: 1,
                                x: 0,
                                scale: 1,
                            },
                            exit: (dir: number) => ({
                                opacity: 0,
                                x: dir === 1 ? -20 : dir === -1 ? 20 : 0,
                                scale: dir === 0 ? 1.05 : 1,
                            }),
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute inset-0"
                    >
                        {viewMode === 'days' && (
                            <DaysView
                                viewDate={viewDate}
                                selectedDate={selectedDate}
                                onSelectDay={onSelectDay}
                            />
                        )}
                        {viewMode === 'months' && (
                            <MonthsView
                                viewDate={viewDate}
                                onSelectMonth={(m) => {
                                    setSlideDir(0);
                                    setViewDate(m);
                                    setViewMode('days');
                                }}
                            />
                        )}
                        {viewMode === 'years' && (
                            <YearsView
                                viewDate={viewDate}
                                onSelectYear={(y) => {
                                    setSlideDir(0);
                                    setViewDate(y);
                                    setViewMode('months');
                                }}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
 * VIEW COMPONENTS
 * ──────────────────────────────────────────────────────────────────────────── */

function DaysView({
    viewDate,
    selectedDate,
    onSelectDay,
}: {
    viewDate: Date;
    selectedDate: Date | null;
    onSelectDay: (d: Date) => void;
}) {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
        <div className="flex flex-col gap-2">
            <div className="grid grid-cols-7 text-center text-[0.8rem] font-medium text-muted-foreground">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                    <div key={day} className="py-1 uppercase">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1 gap-x-0">
                {days.map((day) => {
                    const isOutside = !isSameMonth(day, viewDate);
                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                    const isCurrentDay = isToday(day);

                    return (
                        <button
                            key={day.toString()}
                            type="button"
                            onClick={() => onSelectDay(day)}
                            className={cn(
                                'flex size-8 items-center justify-center rounded-lg text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring mx-auto',
                                isSelected
                                    ? 'bg-primary font-semibold text-white shadow-md'
                                    : 'hover:bg-accent hover:text-accent-foreground',
                                isOutside && !isSelected && 'text-muted-foreground/40',
                                !isOutside && !isSelected && 'text-foreground',
                                isCurrentDay && !isSelected && 'font-bold underline decoration-2 underline-offset-4 decoration-primary',
                            )}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function MonthsView({
    viewDate,
    onSelectMonth,
}: {
    viewDate: Date;
    onSelectMonth: (d: Date) => void;
}) {
    return (
        <div className="grid h-full grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, i) => {
                const monthDate = new Date(viewDate.getFullYear(), i, 1, 12);
                const isSelected = viewDate.getMonth() === i;

                return (
                    <button
                        key={i}
                        type="button"
                        onClick={() => onSelectMonth(monthDate)}
                        className={cn(
                            'flex h-12 items-center justify-center rounded-xl text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isSelected
                                ? 'bg-primary text-white shadow-md'
                                : 'text-foreground hover:bg-accent',
                        )}
                    >
                        {format(monthDate, 'MMM')}
                    </button>
                );
            })}
        </div>
    );
}

function YearsView({
    viewDate,
    onSelectYear,
}: {
    viewDate: Date;
    onSelectYear: (d: Date) => void;
}) {
    const years = getYearRange(viewDate);

    return (
        <div className="grid h-full grid-cols-3 gap-2">
            {years.map((year) => {
                const yearDate = new Date(year, viewDate.getMonth(), 1, 12);
                const isSelected = viewDate.getFullYear() === year;

                return (
                    <button
                        key={year}
                        type="button"
                        onClick={() => onSelectYear(yearDate)}
                        className={cn(
                            'flex h-12 items-center justify-center rounded-xl text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isSelected
                                ? 'bg-primary text-white shadow-md'
                                : 'text-foreground hover:bg-accent',
                        )}
                    >
                        {year}
                    </button>
                );
            })}
        </div>
    );
}
