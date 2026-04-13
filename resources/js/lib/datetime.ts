const CURATED_TIME_ZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Africa/Cairo',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
];

type InstantFormatOptions = Omit<Intl.DateTimeFormatOptions, 'timeZone'> & {
    fallback?: string;
    timeZone?: string | null;
};

type RelativeInstantOptions = {
    fallback?: string;
    now?: Date;
};

type DateOnlyFormatOptions = {
    fallback?: string;
};

function isValidDate(date: Date): boolean {
    return !Number.isNaN(date.getTime());
}

function parseInstant(value?: string | null): Date | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    return isValidDate(date) ? date : null;
}

function parseDateOnly(value?: string | null): {
    year: number;
    month: number;
    day: number;
} | null {
    if (!value) {
        return null;
    }

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
        return null;
    }

    const [, year, month, day] = match;

    return {
        year: Number(year),
        month: Number(month),
        day: Number(day),
    };
}

function buildMonthLabel(month: number): string {
    const date = new Date(Date.UTC(2026, month - 1, 1, 12));

    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'UTC',
        month: 'short',
    })
        .format(date)
        .toUpperCase();
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

export function isValidTimeZone(value?: string | null): value is string {
    if (!value) {
        return false;
    }

    try {
        new Intl.DateTimeFormat('en-US', { timeZone: value }).format(
            new Date(),
        );

        return true;
    } catch {
        return false;
    }
}

export function getBrowserTimeZone(): string | null {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return isValidTimeZone(browserTimeZone) ? browserTimeZone : null;
}

export function getPreferredTimeZone(authUserTimezone?: string | null): string {
    if (isValidTimeZone(authUserTimezone)) {
        return authUserTimezone;
    }

    return getBrowserTimeZone() ?? 'UTC';
}

export function getSupportedTimeZones(): string[] {
    const supportedValuesOf = (
        Intl as typeof Intl & {
            supportedValuesOf?: (key: 'timeZone') => string[];
        }
    ).supportedValuesOf;

    if (typeof supportedValuesOf === 'function') {
        return supportedValuesOf('timeZone');
    }

    return CURATED_TIME_ZONES;
}

export function formatInstant(
    value?: string | null,
    options: InstantFormatOptions = {},
): string {
    const { fallback = '—', timeZone, ...formatOptions } = options;
    const date = parseInstant(value);

    if (!date) {
        return fallback;
    }

    return new Intl.DateTimeFormat('en-GB', {
        timeZone: getPreferredTimeZone(timeZone),
        ...formatOptions,
    }).format(date);
}

export function formatDetailedTimestamp(
    value?: string | null,
    options: InstantFormatOptions = {},
): string {
    const date = parseInstant(value);

    if (!date) {
        return options.fallback ?? '—';
    }

    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: getPreferredTimeZone(options.timeZone),
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const map = new Map(parts.map((part) => [part.type, part.value]));

    return [
        `${map.get('day')} ${map.get('month')?.toUpperCase()} ${map.get('year')},`,
        `${map.get('hour')}:${map.get('minute')}`,
    ].join(' ');
}

export function formatDateOnly(
    value?: string | null,
    options: DateOnlyFormatOptions = {},
): string {
    const parsed = parseDateOnly(value);

    if (!parsed) {
        return options.fallback ?? '—';
    }

    return `${pad(parsed.day)} ${buildMonthLabel(parsed.month)} ${parsed.year}`;
}

export function formatRelativeInstant(
    value?: string | null,
    options: RelativeInstantOptions = {},
): string {
    const date = parseInstant(value);

    if (!date) {
        return options.fallback ?? 'unknown';
    }

    const now = options.now ?? new Date();
    const elapsedSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (elapsedSeconds < 60) {
        return 'just now';
    }

    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    if (elapsedMinutes < 60) {
        return `${elapsedMinutes}m ago`;
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60);

    if (elapsedHours < 24) {
        return `${elapsedHours}h ago`;
    }

    const elapsedDays = Math.floor(elapsedHours / 24);

    return `${elapsedDays}d ago`;
}
