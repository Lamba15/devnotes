import { router } from '@inertiajs/react';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { formatCurrencyAmount } from '@/lib/format-currency';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales,
});

type CalendarTransaction = {
    id: number;
    description: string;
    amount: string;
    currency: string | null;
    occurred_date: string | null;
};

type CalendarEvent = {
    id: number;
    title: string;
    start: Date;
    end: Date;
    amount: number;
    currency: string | null;
};

export function TransactionCalendar({
    transactions,
}: {
    transactions: CalendarTransaction[];
}) {
    const events = useMemo<CalendarEvent[]>(() => {
        return transactions
            .filter((tx) => tx.occurred_date)
            .map((tx) => {
                const date = new Date(tx.occurred_date + 'T00:00:00');
                const amt = Number(tx.amount);

                return {
                    id: tx.id,
                    title: `${amt >= 0 ? '+' : ''}${formatCurrencyAmount(amt, tx.currency)} — ${tx.description}`,
                    start: date,
                    end: date,
                    amount: amt,
                    currency: tx.currency,
                };
            });
    }, [transactions]);

    const defaultDate = useMemo(() => {
        if (events.length === 0) {
return new Date();
}

        const sorted = [...events].sort(
            (a, b) => b.start.getTime() - a.start.getTime(),
        );

        return sorted[0].start;
    }, [events]);

    const handleSelectEvent = useCallback((event: CalendarEvent) => {
        router.visit(`/finance/transactions/${event.id}`);
    }, []);

    const eventStyleGetter = useCallback((event: CalendarEvent) => {
        const isPositive = event.amount >= 0;

        return {
            style: {
                backgroundColor: isPositive
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                color: isPositive
                    ? 'rgb(16, 185, 129)'
                    : 'rgb(239, 68, 68)',
                border: `1px solid ${isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                padding: '2px 6px',
                cursor: 'pointer',
            },
        };
    }, []);

    const views: View[] = ['month', 'week', 'agenda'];

    return (
        <div className="transaction-calendar rounded-xl border border-border/60 bg-card/40 p-4">
            <Calendar
                localizer={localizer}
                events={events}
                defaultDate={defaultDate}
                defaultView="month"
                views={views}
                style={{ height: 700 }}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                popup
                selectable={false}
            />
        </div>
    );
}
